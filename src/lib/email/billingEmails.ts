import { sendEmail, purposeFrom, purposeReplyTo } from "./mailer";
import { renderBranded } from "./branded";
import { escapeHtml } from "./teamNotify";
import { formatLongDate, PAYMENT_GRACE_DAYS, CANCEL_NOTICE_DAYS, COMPANY_LAUNCH_AMOUNT, COMPANY_STANDARD_AMOUNT, EXPERT_AMOUNT, MEMBER_FOUNDING_MONTHLY, MEMBER_FOUNDING_ANNUAL, type ProviderRate } from "@/lib/providerBilling";
import { siteOrigin } from "@/lib/referral";

const first = (name: string | null | undefined) => escapeHtml((name || "").trim().split(/\s+/)[0] || "there");
const TEAM = ["The Veterinary Success Network Team", "Powered by Veterinary Business Institute"];

/** The ONE reminder, 7 days before the first charge. Stamped on the row so it never repeats. */
export async function sendTrialEndingReminder(args: { role: "expert" | "partner"; to: string; name: string; daysLeft: number; trialEnd: Date; rate?: ProviderRate | string | null }) {
  const site = siteOrigin();
  const amount = args.role === "expert" ? EXPERT_AMOUNT : COMPANY_LAUNCH_AMOUNT;
  const portal = args.role === "expert" ? `${site}/expert/billing` : `${site}/partner/account`;
  const after = args.role === "partner" && args.rate === "ladder" ? ` For 12 months, then $${COMPANY_STANDARD_AMOUNT} a month.` : " No increase after that.";
  const { html, text } = renderBranded({
    preview: `Your free founding months end on ${formatLongDate(args.trialEnd)}. Your first charge is $${amount}.`,
    eyebrow: "Billing reminder",
    headline: `Your free founding months end in ${args.daysLeft} day${args.daysLeft === 1 ? "" : "s"}.`,
    paragraphs: [
      `Hi ${first(args.name)},`,
      `On <b>${escapeHtml(formatLongDate(args.trialEnd))}</b> your first charge of <b>$${amount}</b> goes to the card on file.${after}`,
      "Nothing to do if you are staying. If you want to update your card or cancel, use the buttons below.",
    ],
    sections: [
      {
        title: "Good to know",
        bullets: [
          `Cancel before ${escapeHtml(formatLongDate(args.trialEnd))} and nothing is charged.`,
          `After the first charge, ${CANCEL_NOTICE_DAYS} days' written notice applies.`,
          `If a charge fails, your listing stays live for ${PAYMENT_GRACE_DAYS} days while you update your card.`,
        ],
      },
    ],
    cta: { label: "Update payment method", href: portal },
    closing: `To cancel, open your portal and choose Cancel, or reply to this email. Questions? Reply and we will help.`,
    signoffLines: TEAM,
  });
  await sendEmail({
    from: purposeFrom(args.role === "expert" ? "experts" : "partners"),
    replyTo: purposeReplyTo(args.role === "expert" ? "experts" : "partners"),
    to: args.to,
    template: "provider_trial_ending",
    subject: `Your free founding months end in ${args.daysLeft} day${args.daysLeft === 1 ? "" : "s"} | Veterinary Success Network`,
    html,
    text,
  });
}

/** Payment failed: grace period notice. */
export async function sendPaymentFailedEmail(args: { role: "expert" | "partner"; to: string; name: string }) {
  const site = siteOrigin();
  const portal = args.role === "expert" ? `${site}/expert/billing` : `${site}/partner/account`;
  const { html, text } = renderBranded({
    preview: "A charge did not go through. Update your card to keep your listing live.",
    eyebrow: "Payment issue",
    headline: "Your last payment did not go through.",
    paragraphs: [
      `Hi ${first(args.name)},`,
      `The charge for your Veterinary Success Network listing was declined. Your listing stays live for ${PAYMENT_GRACE_DAYS} days while you update your card; Stripe retries automatically.`,
    ],
    cta: { label: "Update payment method", href: portal },
    closing: "If you think this is a mistake, reply to this email and we will sort it out.",
    signoffLines: TEAM,
  });
  try {
    await sendEmail({ from: purposeFrom(args.role === "expert" ? "experts" : "partners"), replyTo: purposeReplyTo(args.role === "expert" ? "experts" : "partners"), to: args.to, template: "payment_failed", subject: "Action needed: your VSN payment did not go through", html, text });
  } catch (err) {
    console.error("payment failed email error:", err);
  }
}

/** Member welcome after Checkout (pay-first). The ONE member email after payment. */
export async function sendMemberPaidWelcome(args: { to: string; name: string; interval: "month" | "year"; tier: "founding" | "standard" }) {
  const site = siteOrigin();
  const rate = args.tier === "founding" ? (args.interval === "year" ? `$${MEMBER_FOUNDING_ANNUAL} a year` : `$${MEMBER_FOUNDING_MONTHLY} a month`) : args.interval === "year" ? "$990 a year" : "$99 a month";
  const { html, text } = renderBranded({
    preview: "Your membership is active. Here is what happens next.",
    eyebrow: args.tier === "founding" ? "Founding member" : "Member",
    headline: `You're in, ${first(args.name)}.`,
    paragraphs: [
      `Hi ${first(args.name)},`,
      `Your Veterinary Success Network membership is active at <b>${rate}</b>${args.tier === "founding" ? ", locked for as long as your membership stays active" : ""}. Your receipt comes from Stripe separately.`,
    ],
    sections: [
      {
        title: "What happens next",
        bullets: [
          "The member portal opens at launch. You sign in with a 6-digit code to this email address.",
          "The Expert Hotline: leave a voicemail and get a written action plan by text and email within 2 to 3 business days.",
          "Member-only partner deals and the resource library are waiting in the portal.",
        ],
      },
    ],
    cta: { label: "Visit the network", href: site },
    closing: "30-day money-back guarantee. Cancel anytime. Questions? Reply to this email.",
    signoffLines: ["Welcome aboard.", ...TEAM],
  });
  await sendEmail({ from: purposeFrom("members"), replyTo: purposeReplyTo("members"), to: args.to, template: "member_paid_welcome", subject: "Welcome to the Veterinary Success Network", html, text });
}
