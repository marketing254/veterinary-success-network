import { sendEmail, emailShell, purposeFrom } from "./mailer";

/**
 * Team distribution list — the three Ekwa work inboxes. (The VSN Rackspace
 * inboxes auto-forward to these anyway; we send direct so nothing depends on
 * the forwarding rules.)
 */
export const TEAM_DISTRIBUTION_LIST = (process.env.TEAM_DISTRIBUTION_LIST ||
  "lester@ekwa.com,rushdha@ekwa.com,reshani@ekwa.com")
  .split(",")
  .map((e) => e.trim())
  .filter(Boolean);

export async function notifySignup(kind: string, fields: Record<string, string | null | undefined>) {
  const rows = Object.entries(fields)
    .filter(([, v]) => v)
    .map(
      ([k, v]) =>
        `<tr><td style="padding:6px 12px 6px 0;font-size:13px;color:#74806a;white-space:nowrap;vertical-align:top;">${k}</td><td style="padding:6px 0;font-size:13px;color:#2c3a22;">${escapeHtml(String(v))}</td></tr>`
    )
    .join("");
  const site = process.env.NEXT_PUBLIC_SITE_URL || "https://www.veterinarysuccessnetwork.com";
  try {
    await sendEmail({
      from: purposeFrom("support"),
      to: TEAM_DISTRIBUTION_LIST,
      subject: `[VSN] New ${kind}`,
      html: emailShell(
        `New ${kind}`,
        `<table style="border-collapse:collapse;">${rows}</table>
         <p style="margin:18px 0 0;font-size:13px;"><a href="${site}/admin" style="color:#3BAB00;font-weight:700;">Review it in the admin console →</a></p>`
      ),
    });
  } catch (err) {
    console.error(`teamNotify(${kind}) failed:`, err);
  }
}

export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
