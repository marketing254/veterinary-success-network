import { sendEmail, purposeFrom, purposeReplyTo } from "./mailer";
import { renderBranded } from "./branded";
import { escapeHtml } from "./teamNotify";
import { providerTermsSentence, formatLongDate, companyStandardStartsAt, type ProviderRate } from "@/lib/providerBilling";
import { siteOrigin } from "@/lib/referral";

const first = (name: string) => escapeHtml((name || "").trim().split(/\s+/)[0] || "there");
const SIGNOFF = ["Welcome aboard.", "The Veterinary Success Network Team", "Powered by Veterinary Business Institute"];

/** "You're in": the ONE welcome email after the partner accepts the agreement. Signed PDF attached. */
export async function sendPartnerAgreementWelcome(args: {
  email: string;
  contactName: string;
  companyName: string;
  rate: ProviderRate;
  freeUntil: Date | null;
  pdf: Buffer;
}) {
  const site = siteOrigin();
  const terms = providerTermsSentence(args.rate);
  const bullets = [terms];
  if (args.freeUntil) {
    bullets.push(`Your free founding months run through <b>${escapeHtml(formatLongDate(args.freeUntil))}</b>.`);
    if (args.rate === "ladder") bullets.push(`The $149 Featured Partner rate starts ${escapeHtml(formatLongDate(companyStandardStartsAt(args.freeUntil)))}.`);
  }
  bullets.push("Refer a member: once they make their first payment, you earn <b>$50</b>.");
  const { html, text } = renderBranded({
    preview: `${args.companyName} is set up as a founding partner. Your signed agreement is attached.`,
    eyebrow: "Partner Agreement · Accepted",
    headline: `You're in, ${first(args.contactName)}.`,
    paragraphs: [
      `Hi ${first(args.contactName)},`,
      `<b>${escapeHtml(args.companyName)}</b> is now a founding partner of the Veterinary Success Network. A signed copy of your partner agreement is attached for your records.`,
    ],
    sections: [
      {
        title: "Get your listing live",
        bullets: [
          "Upload your logo and describe what you do in your partner portal.",
          "Set the exact wording of your exclusive member offer and a working booking link.",
          "Add your first catalog item or offer; the team reviews it and it goes live with the <b>Verified Partner</b> badge.",
        ],
      },
      { title: "Your terms", bullets },
    ],
    cta: { label: "Open your partner portal", href: `${site}/partner` },
    closing: "Questions? Reply to this email and our team will get back to you within one business day.",
    signoffLines: SIGNOFF,
    footerNote: "You're receiving this because your company accepted the partner agreement in its Veterinary Success Network portal.",
    reference: "Contact: partners@veterinarysuccessnetwork.com",
  });
  await sendEmail({
    from: purposeFrom("partners"),
    replyTo: purposeReplyTo("partners"),
    to: args.email,
    template: "partner_agreement_welcome",
    subject: `You're in, ${args.contactName.split(/\s+/)[0] || "partner"}. Welcome to the Veterinary Success Network.`,
    html,
    text,
    attachments: [{ filename: "VSN-Partner-Agreement-signed.pdf", content: args.pdf, contentType: "application/pdf" }],
  });
}

/** Notify the partner that a member inquiry arrived. Fail-soft. */
export async function sendPartnerInquiryAlert(args: { email: string; contactName: string; companyName: string; fromName: string; subject: string | null; preview: string }) {
  const site = siteOrigin();
  const { html, text } = renderBranded({
    preview: `${args.fromName} sent ${args.companyName} a question through the Veterinary Success Network.`,
    eyebrow: "New member inquiry",
    headline: `${escapeHtml(args.fromName)} has a question for ${escapeHtml(args.companyName)}.`,
    paragraphs: [
      `Hi ${first(args.contactName)},`,
      `A member reached out through your VSN listing${args.subject ? ` about <b>${escapeHtml(args.subject)}</b>` : ""}:`,
      `<i>${escapeHtml(args.preview.slice(0, 400))}${args.preview.length > 400 ? "..." : ""}</i>`,
      "Reply inside your portal so the conversation stays on record. One-business-day replies are part of the partner commitments.",
    ],
    cta: { label: "Reply in the portal", href: `${site}/partner/inquiries` },
    signoffLines: ["The Veterinary Success Network Team", "Powered by Veterinary Business Institute"],
  });
  try {
    await sendEmail({
      from: purposeFrom("partners"),
      replyTo: purposeReplyTo("partners"),
      to: args.email,
      template: "partner_inquiry_alert",
      subject: `New member inquiry from ${args.fromName} | Veterinary Success Network`,
      html,
      text,
    });
  } catch (err) {
    console.error("partner inquiry alert failed:", err);
  }
}
