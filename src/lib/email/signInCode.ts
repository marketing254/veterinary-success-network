import { sendEmail, emailShell, purposeFrom, purposeReplyTo } from "./mailer";

const P = (t: string) => `<p style="font-size:14px;line-height:1.6;color:#2c3a22;margin:0 0 12px;">${t}</p>`;

const LABEL: Record<"expert" | "partner" | "admin", { purpose: "experts" | "partners" | "support"; where: string }> = {
  expert: { purpose: "experts", where: "expert portal" },
  partner: { purpose: "partners", where: "partner portal" },
  admin: { purpose: "support", where: "admin console" },
};

/**
 * Sign-in code for the portals (app transport). Deliberately NOT fail-soft:
 * the login route must know when delivery failed. Code expires in 10 minutes
 * (Supabase Auth setting). No em-dashes.
 */
export async function sendSignInCodeEmail(email: string, code: string, audience: "expert" | "partner" | "admin") {
  const { purpose, where } = LABEL[audience];
  await sendEmail({
    from: purposeFrom(purpose),
    replyTo: purposeReplyTo(purpose),
    to: email,
    template: `${audience}_sign_in_code`,
    subject: `Your Veterinary Success Network sign-in code: ${code}`,
    html: emailShell(
      "Your sign-in code",
      P(`Enter this code on the ${where} sign-in page. It expires in 10 minutes and can only be used once.`) +
        `<p style="text-align:center;margin:18px 0 22px;"><span style="display:inline-block;background:#f6fbf0;border:1px solid #55B900;border-radius:14px;padding:18px 34px;font-family:'Courier New',Courier,monospace;font-size:34px;font-weight:700;letter-spacing:10px;color:#1c3310;">${code}</span></p>` +
        P(
          `If you didn't try to sign in to the Veterinary Success Network ${where}, you can ignore this email. The code is useless without access to this inbox.`
        )
    ),
    text: `Your Veterinary Success Network sign-in code is ${code}. It expires in 10 minutes. If you didn't request it, ignore this email.`,
  });
}
