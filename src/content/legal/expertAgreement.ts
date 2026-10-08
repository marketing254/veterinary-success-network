/**
 * Expert Agreement content as data, for the signed and draft PDFs
 * (src/lib/pdf/agreementPdf.tsx). The HTML page at /legal/expert-agreement
 * carries the same text; keep the two in step when the owner changes a clause.
 * Fees come from providerBilling.ts so the PDF always matches the model.
 * No em-dashes. No 70/30. Never "trial".
 */
import { providerRampRows, type ProviderRate } from "@/lib/providerBilling";

export const EXPERT_AGREEMENT_VERSION = "v1";
export const EXPERT_AGREEMENT_UPDATED = "October 7, 2026";

export type AgreementSection = { heading: string; paragraphs?: string[]; bullets?: string[] };

export function expertAgreementSections(opts: { founding?: boolean; freeUntil?: Date | null } = {}): AgreementSection[] {
  const rows = providerRampRows("ladder" as ProviderRate, { expert: true, founding: opts.founding, freeUntil: opts.freeUntil });
  return [
    {
      heading: "1. What you are joining",
      paragraphs: [
        "The Veterinary Success Network is a membership for veterinary practices. As an expert, your knowledge is featured to our members. This agreement covers how that works, what it costs, and how either of us can end it.",
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
      heading: "4. Using your content and name",
      bullets: [
        "You keep ownership of everything you create and share.",
        "You give us permission, while this agreement is active, to repurpose it into member resources (guides, videos, posts) and to use your name, photo, and company to do that and to market the network.",
        "If you leave, we take down your profile, your listing, and any resources that feature only you, within 30 days. Content where you appear alongside others (panels, group sessions, podcasts) remains in the network. Copies members already downloaded cannot be recalled.",
      ],
    },
    {
      heading: "5. What you get (Expert)",
      bullets: [
        "We build you a done-for-you resource library from your content, plus a featured profile in the member portal.",
        "Members find you by category and contact you through your profile. We route member questions to you, but do not guarantee a number of leads.",
        "We do not offer category exclusivity for our experts; members choose who they want to work with.",
      ],
    },
    {
      heading: "6. Conduct and honesty",
      bullets: [
        "Be truthful in what you claim and what you offer members.",
        "You may promote your own services to members who reach out to you. Our \"no upsells\" promise is about VSN never pushing members, not about limiting you.",
        "Use the Veterinary Business Institute and VSN brands only as we agree.",
      ],
    },
    {
      heading: "7. The basics",
      bullets: [
        "You are an independent expert, not our employee or agent.",
        "VSN connects members with experts; we are not responsible for the advice you give, and you will cover us for claims arising from your content.",
        "Keep member information confidential and do not misuse it.",
      ],
    },
    {
      heading: "8. The fine print, kept short",
      bullets: [
        "All prices are in US dollars; applicable taxes are added on top.",
        "If a payment fails, we will retry and pause your listing until it is resolved. No pro-rated refunds for partial months.",
        "We do not guarantee results, leads, or revenue, and the platform is provided as-is. We are not responsible for losses you may incur from this partnership. Our total liability to you is capped at the fees you have paid us in the previous 12 months, and neither of us is liable to the other for indirect or consequential losses.",
        "In the resources we build from your content, the substance stays yours; our branding, design, and templates stay ours.",
        "We can update these terms at any time. Written notice means email, using the addresses on this agreement.",
        "This agreement is governed by the laws of the Province of Ontario, Canada. Any dispute will be resolved through confidential binding arbitration in Ontario rather than in court.",
        "This is our entire agreement. If one part cannot be enforced, the rest still applies.",
      ],
    },
    {
      heading: "9. Accepting this agreement",
      paragraphs: [
        "No signature needed; this works like any online subscription. You accept by ticking \"I agree\" in your expert portal and, once billing opens, saving your payment details. Your acceptance is recorded electronically (who accepted, which version, and when), and a copy of this agreement is emailed to you. The details you provide (your name, company, role) form part of this agreement.",
      ],
    },
  ];
}
