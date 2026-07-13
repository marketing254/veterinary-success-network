/**
 * Email sender. Uses Resend when RESEND_API_KEY is set; otherwise logs to the
 * server console so local development never blocks on email delivery.
 * Email HTML uses inline-safe font stacks only (never the CSS variables).
 */
export type Mail = {
  to: string | string[];
  subject: string;
  html: string;
  replyTo?: string;
};

const FROM = process.env.WAITLIST_EMAIL_FROM || "Veterinary Success Network <marketing@ekwa.co>";

export async function sendEmail(mail: Mail): Promise<void> {
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    console.log(`[email:dev] to=${Array.isArray(mail.to) ? mail.to.join(",") : mail.to} subject="${mail.subject}"`);
    return;
  }
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: FROM,
      to: Array.isArray(mail.to) ? mail.to : [mail.to],
      subject: mail.subject,
      html: mail.html,
      ...(mail.replyTo ? { reply_to: mail.replyTo } : {}),
    }),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Resend failed: ${res.status} ${body}`);
  }
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
