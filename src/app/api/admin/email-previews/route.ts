import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, isResponse, logAction } from "@/lib/adminApi";
import { clean, EMAIL_RE } from "@/lib/signup";
import { isEmailSandbox, sandboxRecipient } from "@/lib/email/sandbox";
import { sendReservationConfirmation, sendMemberWelcome, sendExpertConfirmation, sendExpertApproval, sendFoundingExpertEmail, sendPartnerConfirmation, sendPartnerApproval } from "@/lib/email/confirmations";
import { sendSignInCodeEmail } from "@/lib/email/signInCode";
import { sendExpertAgreementWelcome, sendExpertInquiryAlert } from "@/lib/email/expertPortal";
import { sendPartnerAgreementWelcome, sendPartnerInquiryAlert } from "@/lib/email/partnerPortal";
import { sendMemberLaunchEmail, sendFoundingInviteEmail, sendReviewDecisionEmail } from "@/lib/email/adminEmails";
import { renderExpertAgreementPdf, renderPartnerAgreementPdf } from "@/lib/pdf/agreementPdf";
import { providerFreePeriodEnd, PROVIDER_FREE_MONTHS, FOUNDING_EXPERT_FREE_MONTHS } from "@/lib/providerBilling";
import { siteOrigin } from "@/lib/referral";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SAMPLE = { expert: "Jordan Lee", company: "Radiance Diagnostics", contact: "Sam Patel", member: "Dr. Taylor Morgan" };

type Draft = { key: string; label: string; audience: string; send: (to: string) => Promise<void> };

function drafts(): Draft[] {
  const site = siteOrigin();
  const expertFree = providerFreePeriodEnd(PROVIDER_FREE_MONTHS).date;
  const foundingFree = providerFreePeriodEnd(FOUNDING_EXPERT_FREE_MONTHS).date;
  const pdfExpert = () => renderExpertAgreementPdf({ fullName: SAMPLE.expert, email: "sample@example.com", companyName: "Lee Consulting", founding: false, freeUntil: expertFree }, { acceptedName: SAMPLE.expert, acceptedAt: new Date(), ipHash: "sample", userAgent: "preview", version: "v1" });
  const pdfPartner = () => renderPartnerAgreementPdf({ companyName: SAMPLE.company, contactName: SAMPLE.contact, email: "sample@example.com", category: "Veterinary supplies & distributors", memberOffer: "20% off first order", rate: "ladder", freeUntil: expertFree }, { acceptedName: SAMPLE.contact, acceptedTitle: "VP Sales", acceptedAt: new Date(), ipHash: "sample", userAgent: "preview", version: "v1" });
  return [
    { key: "member_waitlist", label: "Member: waitlist confirmation", audience: "member", send: (to) => sendReservationConfirmation(to, SAMPLE.member, "sample-ref") },
    { key: "member_welcome", label: "Member: activation welcome", audience: "member", send: (to) => sendMemberWelcome(to, SAMPLE.member) },
    { key: "member_launch", label: "Member: launch email (doors open)", audience: "member", send: (to) => sendMemberLaunchEmail({ to, fullName: SAMPLE.member, joinUrl: `${site}/join?wl=sample` }) },
    { key: "expert_received", label: "Expert: application received", audience: "expert", send: (to) => sendExpertConfirmation(to, SAMPLE.expert) },
    { key: "expert_approved", label: "Expert: approved (public ramp)", audience: "expert", send: (to) => sendExpertApproval(to, SAMPLE.expert) },
    { key: "expert_founding", label: "Expert: founding, free for life (private)", audience: "expert", send: (to) => sendFoundingExpertEmail(to, SAMPLE.expert) },
    { key: "expert_welcome", label: "Expert: welcome to the bench (signed PDF)", audience: "expert", send: async (to) => sendExpertAgreementWelcome({ email: to, name: SAMPLE.expert, founding: false, freeUntil: expertFree, pdf: await pdfExpert() }) },
    { key: "expert_inquiry", label: "Expert: new inquiry alert", audience: "expert", send: (to) => sendExpertInquiryAlert({ email: to, name: SAMPLE.expert, fromName: SAMPLE.member, subject: "Associate retention", preview: "We lost two associates this year. Where do I start?" }) },
    { key: "partner_received", label: "Partner: application received", audience: "partner", send: (to) => sendPartnerConfirmation(to, SAMPLE.contact) },
    { key: "partner_approved", label: "Partner: approved", audience: "partner", send: (to) => sendPartnerApproval(to, SAMPLE.contact, SAMPLE.company) },
    { key: "partner_welcome", label: "Partner: you're in (signed PDF)", audience: "partner", send: async (to) => sendPartnerAgreementWelcome({ email: to, contactName: SAMPLE.contact, companyName: SAMPLE.company, rate: "ladder", freeUntil: expertFree, pdf: await pdfPartner() }) },
    { key: "partner_inquiry", label: "Partner: new inquiry alert", audience: "partner", send: (to) => sendPartnerInquiryAlert({ email: to, contactName: SAMPLE.contact, companyName: SAMPLE.company, fromName: SAMPLE.member, subject: "Pricing", preview: "Do you offer bundle pricing for a 3-doctor practice?" }) },
    { key: "founding_invite", label: "Founding invite (both roles, draft PDFs)", audience: "both", send: async (to) => sendFoundingInviteEmail({ to, fullName: SAMPLE.expert, role: "both", companyName: SAMPLE.company, rate: "ladder", expertFreeForLife: false, inviteUrl: `${site}/founding/SAMPLECODE`, expiresAt: new Date(Date.now() + 30 * 86400000), attachments: [{ filename: "VSN-Expert-Agreement-draft.pdf", content: await renderExpertAgreementPdf({ fullName: SAMPLE.expert, email: "sample@example.com", founding: true, freeUntil: foundingFree }, null) }, { filename: "VSN-Partner-Agreement-draft.pdf", content: await renderPartnerAgreementPdf({ companyName: SAMPLE.company, contactName: SAMPLE.expert, email: "sample@example.com", rate: "ladder", freeUntil: expertFree }, null) }] }) },
    { key: "review_approved", label: "Review: kit approved", audience: "expert", send: (to) => sendReviewDecisionEmail({ to, name: SAMPLE.expert, audience: "expert", itemKind: "kit", itemTitle: "Fixing no-shows without discounting", decision: "approved", publishedUrl: `${site}/library/sample` }) },
    { key: "review_changes", label: "Review: offer needs changes", audience: "partner", send: (to) => sendReviewDecisionEmail({ to, name: SAMPLE.contact, audience: "partner", itemKind: "offer", itemTitle: "20% off first order", decision: "needs_changes", note: "Please add the end date and the terms." }) },
    { key: "sign_in_code", label: "Sign-in code (expert)", audience: "expert", send: (to) => sendSignInCodeEmail(to, "482913", "expert") },
  ];
}

export async function GET() {
  const session = await requireAdmin();
  if (isResponse(session)) return session;
  return NextResponse.json({ ok: true, drafts: drafts().map(({ key, label, audience }) => ({ key, label, audience })), sandbox: isEmailSandbox(), sandboxTo: sandboxRecipient() });
}

/** POST { to, keys?: string[] } sends the chosen drafts (or all) to one address. Sandbox still applies. */
export async function POST(req: NextRequest) {
  const session = await requireAdmin();
  if (isResponse(session)) return session;
  const body = (await req.json().catch(() => null)) as { to?: string; keys?: string[] } | null;
  const to = clean(body?.to, 200).toLowerCase();
  if (!EMAIL_RE.test(to)) return NextResponse.json({ ok: false, error: "Enter a valid address." }, { status: 400 });
  const want = Array.isArray(body?.keys) && body!.keys.length ? new Set(body!.keys) : null;
  const results: { key: string; ok: boolean; error?: string }[] = [];
  for (const d of drafts()) {
    if (want && !want.has(d.key)) continue;
    try {
      await d.send(to);
      results.push({ key: d.key, ok: true });
    } catch (err) {
      results.push({ key: d.key, ok: false, error: err instanceof Error ? err.message : String(err) });
    }
  }
  await logAction(session.email, "email_previews", to, "send_samples", `${results.filter((r) => r.ok).length}/${results.length}`);
  return NextResponse.json({ ok: true, results });
}
