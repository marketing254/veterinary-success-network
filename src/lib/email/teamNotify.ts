import { sendEmail, emailShell } from "./mailer";

/** Team distribution list — swap per vertical. */
export const TEAM_DISTRIBUTION_LIST = (process.env.TEAM_DISTRIBUTION_LIST ||
  "marketing@ekwa.co")
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
  try {
    await sendEmail({
      to: TEAM_DISTRIBUTION_LIST,
      subject: `[VSN] New ${kind}`,
      html: emailShell(`New ${kind}`, `<table style="border-collapse:collapse;">${rows}</table>`),
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
