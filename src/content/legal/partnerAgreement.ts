/**
 * Partner Agreement content as data, for the signed and draft PDFs and the
 * in-portal agreement view. The HTML page at /legal/partner-agreement carries
 * the same text; keep them in step. Fees come from providerBilling.ts.
 * No em-dashes. No category exclusivity. Never "trial".
 */
import { providerRampRows, type ProviderRate, REFERRAL_PAYOUT_USD } from "@/lib/providerBilling";
import type { AgreementSection } from "./expertAgreement";

export const PARTNER_AGREEMENT_VERSION = "v1";
export const PARTNER_AGREEMENT_UPDATED = "October 7, 2026";

export function partnerAgreementSections(opts: { rate: ProviderRate; freeUntil?: Date | null }): AgreementSection[] {
  const rows = providerRampRows(opts.rate, { freeUntil: opts.freeUntil });
  return [
    {
      heading: "1. What you are joining",
      paragraphs: [
        "The Veterinary Success Network is a membership for veterinary practices. As a partner, your company is featured to our members. This agreement covers how that works, what it costs, and how either of us can end it.",
      ],
    },
    {
      heading: "2. Term and cancellation",
      bullets: [
        "Month-to-month, with no long-term contract.",
        "You can cancel anytime with 30 days' written notice. So can we.",
        "We can end it immediately if you break these terms.",
        "If you cancel and re-join later, any founding rate you had no longer applies.",
      ],
    },
    {
      heading: "3. What it costs",
      paragraphs: ["Billed monthly through Stripe. Your free founding months start on the member launch date."],
      bullets: [
        ...rows.map((r) => `${r.period}: ${r.amount}`),
        "Annual pre-pay (2 months free) is available from month 7.",
        "Cancel before your first charge and nothing is billed. After the first charge, 30 days' written notice applies.",
      ],
    },
    {
      heading: "4. What you get (Partner)",
      bullets: [
        "Your company is listed in the partner directory, in your category, with the Verified Partner badge.",
        "Founding partners get priority directory placement and first-mover advantage. We do not offer category exclusivity; multiple companies may be listed in any category.",
        "Member inquiries are routed to you with a dashboard, but we do not guarantee a number of leads.",
      ],
    },
    {
      heading: "5. What you offer members",
      bullets: [
        "You give our members an offer they can only get through VSN (you decide what it is; it must be exclusive to members and better than your standard pricing).",
        "You keep a booking link or contact live and respond to members within one business day.",
        "Any change to your member offer comes with 30 days' notice.",
        `Refer a member: once they make their first payment to us, you earn $${REFERRAL_PAYOUT_USD}.`,
      ],
    },
    {
      heading: "6. Conduct and honesty",
      bullets: [
        "Be truthful in what you claim and what you offer members.",
        "Use the Veterinary Business Institute and VSN brands only as we agree.",
      ],
    },
    {
      heading: "7. The basics",
      bullets: [
        "You are an independent company, not our employee or agent.",
        "VSN connects members with partners; we are not responsible for the products or services you sell, and you will cover us for claims arising from your offerings.",
        "Keep member information confidential and do not misuse it. VSN is not a party to transactions between members and partners.",
      ],
    },
    {
      heading: "8. The fine print, kept short",
      bullets: [
        "All prices are in US dollars; applicable taxes are added on top.",
        "If a payment fails, we will retry and pause your listing until it is resolved. No pro-rated refunds for partial months.",
        "We do not guarantee results, leads, or revenue, and the platform is provided as-is. We are not responsible for losses you may incur from this partnership. Our total liability to you is capped at the fees you have paid us in the previous 12 months, and neither of us is liable to the other for indirect or consequential losses.",
        "We can update these terms at any time. Written notice means email, using the addresses on this agreement.",
        "This agreement is governed by the laws of the Province of Ontario, Canada. Any dispute will be resolved through confidential binding arbitration in Ontario rather than in court.",
        "This is our entire agreement. If one part cannot be enforced, the rest still applies.",
      ],
    },
    {
      heading: "9. Accepting this agreement",
      paragraphs: [
        "No signature needed; this works like any online subscription. An authorised person at your company accepts by ticking \"I agree\" in your partner portal and, once billing opens, saving your payment details. Your acceptance is recorded electronically (who accepted, which version, and when), and a copy of this agreement is emailed to you. The details you provide (your company, category, and member offer) form part of this agreement.",
      ],
    },
  ];
}
