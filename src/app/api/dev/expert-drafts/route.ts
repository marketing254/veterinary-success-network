import { NextRequest, NextResponse } from "next/server";
import { sendExpertConfirmation, sendExpertApproval, sendFoundingExpertEmail } from "@/lib/email/confirmations";
import { sendExpertAgreementWelcome, sendExpertInquiryAlert } from "@/lib/email/expertPortal";
import { sendFoundingInviteEmail, sendReviewDecisionEmail } from "@/lib/email/adminEmails";
import { sendTrialEndingReminder, sendPaymentFailedEmail } from "@/lib/email/billingEmails";
import { sendSignInCodeEmail } from "@/lib/email/signInCode";
import { renderExpertAgreementPdf } from "@/lib/pdf/agreementPdf";
import { providerFreePeriodEnd, PROVIDER_FREE_MONTHS, FOUNDING_EXPERT_FREE_MONTHS } from "@/lib/providerBilling";
import { siteOrigin } from "@/lib/referral";
import { EMAIL_RE } from "@/lib/signup";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * DEV ONLY. POST { to, cc? } with header x-draft-secret = DRAFT_SEND_SECRET.
 * Sends every expert-facing email with sample data to the reviewer, with a
 * visible cc, bypassing the sandbox for this request only. Never available
 * in production. Used for copy review: see scripts/README in VSN-TEST-CASES.md.
 */
export async function POST(req: NextRequest) {
  if (process.env.NODE_ENV === "production") return NextResponse.json({ ok: false }, { status: 404 });
  const secret = process.env.DRAFT_SEND_SECRET;
  if (!secret || req.headers.get("x-draft-secret") !== secret) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  const body = (await req.json().catch(() => ({}))) as { to?: string; cc?: string; only?: string[] };
  const to = (body.to || "").trim().toLowerCase();
  const cc = (body.cc || "").trim().toLowerCase();
  const only = Array.isArray(body.only) ? body.only.map(String) : null;
  if (!EMAIL_RE.test(to)) return NextResponse.json({ ok: false, error: "to required" }, { status: 400 });

  const prev = { sandbox: process.env.EMAIL_SANDBOX, bcc: process.env.EMAIL_AUDIT_BCC, cc: process.env.EMAIL_REVIEW_CC };
  process.env.EMAIL_SANDBOX = "false";
  process.env.EMAIL_AUDIT_BCC = "";
  process.env.EMAIL_REVIEW_CC = cc && EMAIL_RE.test(cc) ? cc : "";

  const NAME = "Jordan Lee";
  const site = siteOrigin();
  const free6 = providerFreePeriodEnd(PROVIDER_FREE_MONTHS).date;
  const free12 = providerFreePeriodEnd(FOUNDING_EXPERT_FREE_MONTHS).date;
  const results: { step: string; ok: boolean; error?: string }[] = [];
  try {
    const signed = await renderExpertAgreementPdf({ fullName: NAME, email: to, companyName: "Lee Practice Consulting", founding: false, freeUntil: free6 }, { acceptedName: NAME, acceptedAt: new Date(), ipHash: "sample", userAgent: "draft review", version: "v1" });
    const draft12 = await renderExpertAgreementPdf({ fullName: NAME, email: to, companyName: "Lee Practice Consulting", founding: true, freeUntil: free12 }, null);
    const steps: [string, () => Promise<unknown>][] = [
      ["01 Application received", () => sendExpertConfirmation(to, NAME)],
      ["02 Approved (public ramp)", () => sendExpertApproval(to, NAME)],
      ["03 Founding expert, free for life (private)", () => sendFoundingExpertEmail(to, NAME)],
      ["04 Founding invite with draft PDF", () => sendFoundingInviteEmail({ to, fullName: NAME, role: "expert", companyName: "Lee Practice Consulting", rate: "ladder", expertFreeForLife: false, inviteUrl: `${site}/founding/SAMPLECODE`, expiresAt: new Date(Date.now() + 30 * 86400000), attachments: [{ filename: "VSN-Expert-Agreement-draft.pdf", content: draft12 }] })],
      ["05 Welcome to the bench (signed PDF)", () => sendExpertAgreementWelcome({ email: to, name: NAME, founding: false, freeUntil: free6, pdf: signed })],
      ["06 Sign-in code", () => sendSignInCodeEmail(to, "482913", "expert")],
      ["07 New member inquiry", () => sendExpertInquiryAlert({ email: to, name: NAME, fromName: "Dr. Taylor Morgan", subject: "Associate retention", preview: "We lost two associates this year and I am not sure where to start. What should I fix first?" })],
      ["08 Kit approved", () => sendReviewDecisionEmail({ to, name: NAME, audience: "expert", itemKind: "kit", itemTitle: "Fixing no-shows without discounting", decision: "approved", publishedUrl: `${site}/library/fixing-no-shows` })],
      ["09 Kit needs changes", () => sendReviewDecisionEmail({ to, name: NAME, audience: "expert", itemKind: "kit", itemTitle: "Fixing no-shows without discounting", decision: "needs_changes", note: "Could you re-record the last 5 minutes? The audio drops out after the checklist section." })],
      ["10 Free months end in 7 days", () => sendTrialEndingReminder({ role: "expert", to, name: NAME, daysLeft: 7, trialEnd: free6 })],
      ["11 Payment failed", () => sendPaymentFailedEmail({ role: "expert", to, name: NAME })],
    ];
    for (const [step, fn] of steps) {
      if (only && !only.some((o) => step.startsWith(o))) continue;
      try {
        await fn();
        results.push({ step, ok: true });
      } catch (err) {
        results.push({ step, ok: false, error: err instanceof Error ? err.message : String(err) });
      }
    }
  } finally {
    process.env.EMAIL_SANDBOX = prev.sandbox;
    process.env.EMAIL_AUDIT_BCC = prev.bcc;
    process.env.EMAIL_REVIEW_CC = prev.cc;
  }
  return NextResponse.json({ ok: true, results });
}
