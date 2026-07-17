import nodemailer from "nodemailer";
import type { Transporter } from "nodemailer";

/**
 * Email sender. Pick ONE transport via env (checked in this order):
 *   1. Generic SMTP  — SMTP_HOST / SMTP_PORT / SMTP_USER / SMTP_PASS (the Rackspace support@ mailbox)
 *   2. Gmail / Google Workspace — GMAIL_USER + GMAIL_APP_PASSWORD (App Password on that account)
 *   3. Resend — RESEND_API_KEY
 * If none is set, emails are logged to the server console so dev never blocks on delivery.
 * Email HTML uses inline-safe font stacks only (never the CSS variables).
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
};

const FROM =
  process.env.WAITLIST_EMAIL_FROM || "Veterinary Success Network <hello@veterinarysuccessnetwork.com>";
const SUPPORT = process.env.WAITLIST_SUPPORT_EMAIL || "support@veterinarysuccessnetwork.com";

/**
 * Per-purpose sender addresses (real Rackspace mailboxes, created 2026-07-15).
 * Rackspace allows same-domain send-as, so the ONE auth mailbox (SMTP_USER,
 * hello@veterinarysuccessnetwork.com) sends From every address below.
 * members@ = member journey · support@ = admin codes + ops + expert emails (experts@
 * doesn't exist) · hello@ = partner emails + free-kit (until partners@ exists).
 */
export function purposeFrom(purpose: "members" | "experts" | "partners" | "support"): string {
  const map: Record<string, string | undefined> = {
    members:
      process.env.MEMBERS_EMAIL_FROM || "Veterinary Success Network <members@veterinarysuccessnetwork.com>",
    experts:
      process.env.EXPERTS_EMAIL_FROM || "Veterinary Success Network <support@veterinarysuccessnetwork.com>",
    partners: process.env.PARTNERS_EMAIL_FROM,
    support:
      process.env.SUPPORT_EMAIL_FROM || "Veterinary Success Network <support@veterinarysuccessnetwork.com>",
  };
  return map[purpose] || FROM;
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

export async function sendEmail(mail: Mail): Promise<void> {
  const to = Array.isArray(mail.to) ? mail.to : [mail.to];
  const replyTo = mail.replyTo || SUPPORT;
  const from = mail.from || FROM;

  const transport = smtpTransport();
  if (transport) {
    await transport.sendMail({
      from,
      to: to.join(", "),
      subject: mail.subject,
      html: mail.html,
      ...(mail.text ? { text: mail.text } : {}),
      replyTo,
    });
    return;
  }

  const key = process.env.RESEND_API_KEY;
  if (key) {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from,
        to,
        subject: mail.subject,
        html: mail.html,
        ...(mail.text ? { text: mail.text } : {}),
        reply_to: replyTo,
      }),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new Error(`Resend failed: ${res.status} ${body}`);
    }
    return;
  }

  console.log(`[email:dev] to=${to.join(",")} subject="${mail.subject}"`);
}

export function emailShell(headline: string, bodyHtml: string): string {
  return `
  <div style="background:#f6fbf0;padding:32px 16px;font-family:system-ui,-apple-system,'Segoe UI',Roboto,sans-serif;color:#2c3a22;">
    <div style="max-width:560px;margin:0 auto;background:#ffffff;border-radius:16px;border:1px solid #e9efe1;overflow:hidden;">
      <div style="background:linear-gradient(135deg,#55B900,#3BAB00);padding:22px 28px;">
        <div style="color:#ffffff;font-weight:700;font-size:15px;">Veterinary Success Network</div>
        <div style="color:#e3f7cc;font-size:10px;letter-spacing:.12em;text-transform:uppercase;font-weight:700;">Powered by Veterinary Business Institute</div>
      </div>
      <div style="padding:28px;">
        <h1 style="font-family:Georgia,serif;font-weight:600;font-size:22px;color:#1c3310;margin:0 0 14px;">${headline}</h1>
        ${bodyHtml}
      </div>
      <div style="padding:16px 28px;border-top:1px solid #e9efe1;font-size:12px;color:#74806a;">
        We do not store patient or client medical data. The Veterinary Success Network is a training and education platform.
      </div>
    </div>
  </div>`;
}
