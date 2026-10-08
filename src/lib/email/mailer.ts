import nodemailer from "nodemailer";
import type { Transporter } from "nodemailer";
import { readFileSync } from "fs";
import { join } from "path";
import { applyEmailSandbox } from "./sandbox";
import { emailHeader, emailFooter } from "./branded";

/**
 * Email sender. Pick ONE transport via env (checked in this order):
 *   1. Generic SMTP  — SMTP_HOST / SMTP_PORT / SMTP_USER / SMTP_PASS (the Rackspace support@ mailbox)
 *   2. Gmail / Google Workspace — GMAIL_USER + GMAIL_APP_PASSWORD (App Password on that account)
 *   3. Resend — RESEND_API_KEY
 * If none is set, emails are logged to the server console so dev never blocks on delivery.
 * Every message passes through applyEmailSandbox() first (see sandbox.ts): while the
 * sandbox is on, everything lands in EMAIL_SANDBOX_TO. WAITLIST_EMAIL_DISABLED=true
 * disables all mail. Email HTML uses inline-safe font stacks only (never the CSS variables).
 */
export type Mail = {
  to: string | string[];
  subject: string;
  html: string;
  /** Plain-text alternative (deliverability). */
  text?: string;
  replyTo?: string;
  /** Override the From address per message (e.g. per-purpose senders). */
  from?: string;
  /** Extra BCC (staff copies). Never printed in bodies. */
  bcc?: string | string[];
  /** Visible copy (used for draft reviews). Dropped while the sandbox is on. */
  cc?: string | string[];
  attachments?: { filename: string; content: Buffer | string; contentType?: string; cid?: string }[];
  /** Journal label for email_events (best-effort). */
  template?: string;
};

export const BRAND = "Veterinary Success Network";
export const DOMAIN = "veterinarysuccessnetwork.com";

const FROM = process.env.WAITLIST_EMAIL_FROM || `${BRAND} <hello@${DOMAIN}>`;
const SUPPORT = process.env.WAITLIST_SUPPORT_EMAIL || `support@${DOMAIN}`;

export type EmailPurpose = "members" | "experts" | "partners" | "support";

/**
 * Per-purpose sender addresses (real Rackspace mailboxes). Rackspace allows
 * same-domain send-as, so the ONE auth mailbox (SMTP_USER) sends From every
 * address below. Sender map per the VSN dev handoff: members@ / experts@ /
 * partners@ / support@. Env overrides: MEMBERS_EMAIL_FROM, EXPERTS_EMAIL_FROM,
 * PARTNERS_EMAIL_FROM, SUPPORT_EMAIL_FROM.
 */
export function purposeFrom(purpose: EmailPurpose): string {
  const map: Record<EmailPurpose, string | undefined> = {
    members: process.env.MEMBERS_EMAIL_FROM || `${BRAND} <members@${DOMAIN}>`,
    experts: process.env.EXPERTS_EMAIL_FROM || `${BRAND} <experts@${DOMAIN}>`,
    partners: process.env.PARTNERS_EMAIL_FROM || `${BRAND} <partners@${DOMAIN}>`,
    support: process.env.SUPPORT_EMAIL_FROM || `${BRAND} <support@${DOMAIN}>`,
  };
  return map[purpose] || FROM;
}

/** Reply-to per purpose (plain address). */
export function purposeReplyTo(purpose: EmailPurpose): string {
  const map: Record<EmailPurpose, string | undefined> = {
    members: process.env.MEMBERS_REPLY_TO || `members@${DOMAIN}`,
    experts: process.env.EXPERTS_REPLY_TO || `experts@${DOMAIN}`,
    partners: process.env.PARTNERS_REPLY_TO || `partners@${DOMAIN}`,
    support: process.env.SUPPORT_REPLY_TO || SUPPORT,
  };
  return map[purpose] || SUPPORT;
}

let smtp: Transporter | null | undefined;

function smtpTransport(): Transporter | null {
  if (smtp !== undefined) return smtp;
  if (process.env.SMTP_HOST) {
    const port = Number(process.env.SMTP_PORT || 465);
    smtp = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port,
      secure: port === 465,
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    });
  } else if (process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD) {
    smtp = nodemailer.createTransport({
      service: "gmail",
      auth: { user: process.env.GMAIL_USER, pass: process.env.GMAIL_APP_PASSWORD },
    });
  } else {
    smtp = null;
  }
  return smtp;
}

async function journal(mail: Mail, sandboxed: boolean, originalTo: string, provider: string, status: string) {
  try {
    const { supabaseAdmin } = await import("../supabaseAdmin");
    await supabaseAdmin()
      .from("email_events")
      .insert({
        template: mail.template || "untitled",
        recipient: originalTo || "(none)",
        subject: mail.subject,
        provider,
        status,
        sandboxed,
      });
  } catch {
    /* journaling is best-effort; never block a send on it */
  }
}

const LOGO_CID = "vsn-logo";
let logoBuf: Buffer | null | undefined;

/** The inline VSN monogram for `cid:vsn-logo`. Read once from public/brand; null if unavailable. */
function logoBuffer(): Buffer | null {
  if (logoBuf !== undefined) return logoBuf;
  try {
    logoBuf = readFileSync(join(process.cwd(), "public", "brand", "vsn-monogram-light.png"));
  } catch {
    logoBuf = null;
  }
  return logoBuf;
}

/** Hosted fallback when the inline image cannot be attached (Resend, or the file is missing). */
function logoUrl(): string {
  return `${(process.env.NEXT_PUBLIC_SITE_URL || "https://www.veterinarysuccessnetwork.com").replace(/\/$/, "")}/brand/vsn-monogram-light.png`;
}

export async function sendEmail(mail: Mail): Promise<void> {
  if ((process.env.WAITLIST_EMAIL_DISABLED ?? "").toLowerCase() === "true") {
    console.log(`[email:disabled] subject="${mail.subject}"`);
    return;
  }
  const to = Array.isArray(mail.to) ? mail.to : [mail.to];
  const replyTo = mail.replyTo || SUPPORT;
  const from = mail.from || FROM;

  const { message, sandboxed, originalTo } = applyEmailSandbox({
    to,
    // EMAIL_REVIEW_CC: a visible reviewer copy used by scripts/send-expert-drafts.ts (dropped while the sandbox is on).
    cc: [...(mail.cc ? (Array.isArray(mail.cc) ? mail.cc : [mail.cc]) : []), ...(process.env.EMAIL_REVIEW_CC ? [process.env.EMAIL_REVIEW_CC] : [])].filter(Boolean),
    bcc: mail.bcc ? (Array.isArray(mail.bcc) ? mail.bcc : [mail.bcc]) : undefined,
    subject: mail.subject,
  });
  const toList = Array.isArray(message.to) ? message.to : [message.to as string];
  const bccList = message.bcc as string[] | undefined;
  const ccList = message.cc as string[] | undefined;

  // Inline logo: attach the monogram when the HTML references cid:vsn-logo; swap to the hosted URL when we cannot.
  const wantsLogo = mail.html.includes(`cid:${LOGO_CID}`);
  const logo = wantsLogo ? logoBuffer() : null;
  const html = wantsLogo && !logo ? mail.html.replace(new RegExp(`cid:${LOGO_CID}`, "g"), logoUrl()) : mail.html;
  const attachments = [...(mail.attachments ?? []), ...(logo ? [{ filename: "vsn-logo.png", content: logo, contentType: "image/png", cid: LOGO_CID }] : [])];

  const transport = smtpTransport();
  if (transport) {
    await transport.sendMail({
      from,
      to: toList.join(", "),
      ...(ccList && ccList.length ? { cc: ccList.join(", ") } : {}),
      ...(bccList && bccList.length ? { bcc: bccList.join(", ") } : {}),
      subject: message.subject,
      html,
      ...(mail.text ? { text: mail.text } : {}),
      ...(attachments.length ? { attachments } : {}),
      replyTo,
    });
    await journal(mail, sandboxed, originalTo, "smtp", "sent");
    return;
  }

  const key = process.env.RESEND_API_KEY;
  if (key) {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from,
        to: toList,
        ...(ccList && ccList.length ? { cc: ccList } : {}),
        ...(bccList && bccList.length ? { bcc: bccList } : {}),
        subject: message.subject,
        html: mail.html.replace(new RegExp(`cid:${LOGO_CID}`, "g"), logoUrl()),
        ...(mail.text ? { text: mail.text } : {}),
        reply_to: replyTo,
      }),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new Error(`Resend failed: ${res.status} ${body}`);
    }
    await journal(mail, sandboxed, originalTo, "resend", "sent");
    return;
  }

  console.log(`[email:dev] to=${toList.join(",")} subject="${message.subject}"`);
  await journal(mail, sandboxed, originalTo, "log", "logged");
}

/** Simple shell (application received, sign-in codes): same header and footer as the branded journey. */
export function emailShell(headline: string, bodyHtml: string): string {
  const SANS = "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Helvetica,Arial,sans-serif";
  const SERIF = "'Fraunces','Iowan Old Style',Baskerville,'Times New Roman',Georgia,serif";
  return `<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${headline}</title></head>
<body style="margin:0;padding:0;background:#f6fbf0;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f6fbf0;padding:28px 0;">
  <tr>
    <td align="center" style="padding:0 12px;">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%;border-collapse:separate;">
        <tr><td style="height:5px;background:#55B900;border-radius:16px 16px 0 0;font-size:0;line-height:0;">&nbsp;</td></tr>
        ${emailHeader()}
        <tr>
          <td style="background:#ffffff;border:1px solid #e9efe1;border-top:none;padding:32px;font-family:${SANS};">
            <h1 style="margin:0 0 14px;font-family:${SERIF};font-weight:500;font-size:24px;line-height:1.15;color:#1c3310;">${headline}</h1>
            ${bodyHtml}
          </td>
        </tr>
        ${emailFooter([])}
      </table>
    </td>
  </tr>
</table>
</body></html>`;
}
