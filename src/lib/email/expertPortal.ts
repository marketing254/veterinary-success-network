import { sendEmail, purposeFrom, purposeReplyTo } from "./mailer";
import { renderBranded } from "./branded";
import { escapeHtml } from "./teamNotify";
import { providerTermsSentence, formatLongDate } from "@/lib/providerBilling";
import { siteOrigin } from "@/lib/referral";

const first = (name: string) => escapeHtml((name || "").trim().split(/\s+/)[0] || "there");

const SIGNOFF = ["Welcome aboard.", "The Veterinary Success Network Team", "Powered by Veterinary Business Institute"];

/**
 * "Welcome to the bench": the ONE welcome email after the expert accepts the
 * agreement in the portal. Signed PDF attached. Only the expert's own email
 * is printed. Onboarding call link when ONBOARDING_CALL_URL is set.
 * (Phase 5 moves the trigger to after the card is saved; copy stays.)
 */
export async function sendExpertAgreementWelcome(args: {
  email: string;
  name: string;
  founding: boolean;
  freeUntil: Date | null;
  pdf: Buffer;
}) {
  const site = siteOrigin();
  const terms = providerTermsSentence("ladder", { expert: true, founding: args.founding });
  const call = process.env.ONBOARDING_CALL_URL;
  const { html, text } = renderBranded({
    preview: "Your expert agreement is accepted and your copy is attached. Here is what happens next.",
    eyebrow: "Expert Agreement · Accepted",
    headline: `Welcome to the bench, ${first(args.name)}.`,
    paragraphs: [
      `Hi ${first(args.name)},`,
      "Your Veterinary Success Network expert agreement is accepted. A signed copy is attached to this email for your records.",
    ],
    sections: [
      {
        title: "What happens next",
        bullets: [
          call
            ? `Book your onboarding conversation: <a href="${escapeHtml(call)}" style="color:#3BAB00;font-weight:700;">${escapeHtml(call)}</a>`
            : "Our team will reach out to you personally to schedule your onboarding conversation.",
          "Complete your profile in the portal: headshot, bio, specialty and booking link. Your public listing goes live once the team reviews it.",
          "Share <b>one recording</b> of you teaching your topic. We produce your full content kit in your branding, and you approve it before anything goes live.",
        ],
      },
      {
        title: "Your terms",
        bullets: [
          terms,
          ...(args.freeUntil ? [`Your free founding months run through <b>${escapeHtml(formatLongDate(args.freeUntil))}</b>.`] : []),
          "Expert Hotline referrals are routed by fit, never pay-to-play.",
        ],
      },
    ],
    cta: { label: "Open your expert portal", href: `${site}/expert` },
    closing: "Questions? Reply to this email and our team will get back to you within one business day.",
    signoffLines: SIGNOFF,
    footerNote: "You're receiving this because you accepted the expert agreement in your Veterinary Success Network portal.",
    reference: "Contact: experts@veterinarysuccessnetwork.com",
  });
  await sendEmail({
    from: purposeFrom("experts"),
    replyTo: purposeReplyTo("experts"),
    to: args.email,
    template: "expert_agreement_welcome",
    subject: "Welcome to the bench | Your VSN expert agreement",
    html,
    text,
    attachments: [{ filename: "VSN-Expert-Agreement-signed.pdf", content: args.pdf, contentType: "application/pdf" }],
  });
}

/** Notify the expert that a member inquiry or reply arrived. Fail-soft. */
export async function sendExpertInquiryAlert(args: { email: string; name: string; fromName: string; subject: string | null; preview: string }) {
  const site = siteOrigin();
  const { html, text } = renderBranded({
    preview: `${args.fromName} sent you a question through the Veterinary Success Network.`,
    eyebrow: "New member inquiry",
    headline: `${escapeHtml(args.fromName)} has a question for you.`,
    paragraphs: [
      `Hi ${first(args.name)},`,
      `A member reached out through your VSN profile${args.subject ? ` about <b>${escapeHtml(args.subject)}</b>` : ""}:`,
      `<i>${escapeHtml(args.preview.slice(0, 400))}${args.preview.length > 400 ? "..." : ""}</i>`,
      "Reply inside your portal so the conversation stays on record. One-business-day replies keep your fit score high for hotline referrals.",
    ],
    cta: { label: "Reply in the portal", href: `${site}/expert/inquiries` },
    signoffLines: ["The Veterinary Success Network Team", "Powered by Veterinary Business Institute"],
  });
  try {
    await sendEmail({
      from: purposeFrom("experts"),
      replyTo: purposeReplyTo("experts"),
      to: args.email,
      template: "expert_inquiry_alert",
      subject: `New member inquiry from ${args.fromName} | Veterinary Success Network`,
      html,
      text,
    });
  } catch (err) {
    console.error("expert inquiry alert failed:", err);
  }
}
