import { NextRequest, NextResponse } from "next/server";
import { requireExpert } from "@/lib/auth/guards";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { serverError, apiError } from "@/lib/api/errorResponse";
import { clean } from "@/lib/signup";
import { hashIp, requestIp } from "@/lib/ipHash";
import { checkRateLimit } from "@/lib/rateLimit";
import { loadExpertSelf } from "@/lib/expert/load";
import { renderExpertAgreementPdf } from "@/lib/pdf/agreementPdf";
import { EXPERT_AGREEMENT_VERSION } from "@/content/legal/expertAgreement";
import { providerFreePeriodEnd, freeMonthsFor } from "@/lib/providerBilling";
import { acceptExpertAgreement } from "@/lib/billing/acceptAgreement";
import { isStripeConfigured } from "@/lib/stripe";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * GET  /api/expert/agreement            status + (if signed) a short-lived download URL
 * GET  /api/expert/agreement?draft=1    personalised unsigned PDF (inline)
 * POST /api/expert/agreement            { name, agree: true } → e-sign WITHOUT a card.
 *      Only allowed while Stripe is not configured (or for billing-exempt experts);
 *      otherwise the client must use /api/expert/billing/start (sign-and-pay).
 */
export async function GET(req: NextRequest) {
  const guard = await requireExpert();
  if (!guard.ok) return guard.response;
  const route = "GET /api/expert/agreement";
  try {
    const expert = await loadExpertSelf(guard.expertId);
    if (!expert) return apiError.notFound(route);
    const founding = expert.source === "founding_invite";
    if (new URL(req.url).searchParams.get("draft") === "1") {
      const freeUntil = expert.free_period_ends_at ? new Date(expert.free_period_ends_at) : providerFreePeriodEnd(freeMonthsFor({ audience: "expert", founding })).date;
      const pdf = await renderExpertAgreementPdf({ fullName: expert.full_name, email: expert.email, companyName: expert.company_name, founding, freeUntil }, null);
      return new NextResponse(new Uint8Array(pdf), { headers: { "Content-Type": "application/pdf", "Content-Disposition": 'inline; filename="VSN-Expert-Agreement-draft.pdf"', "Cache-Control": "no-store" } });
    }
    const db = supabaseAdmin();
    const { data: row } = await db.from("experts").select("agreement_pdf_path").eq("id", guard.expertId).maybeSingle();
    let downloadUrl: string | null = null;
    if (row?.agreement_pdf_path) {
      const { data } = await db.storage.from("agreements").createSignedUrl(row.agreement_pdf_path, 600);
      downloadUrl = data?.signedUrl ?? null;
    }
    return NextResponse.json({
      ok: true,
      version: EXPERT_AGREEMENT_VERSION,
      signed: !!expert.agreement_signed_at,
      signedAt: expert.agreement_signed_at,
      signedName: expert.agreement_name,
      signedVersion: expert.agreement_version,
      founding,
      exempt: expert.billing_exempt,
      cardRequired: isStripeConfigured() && !expert.billing_exempt,
      hasSubscription: !!expert.subscription_status,
      downloadUrl,
    });
  } catch (err) {
    return serverError(err, { route });
  }
}

export async function POST(req: NextRequest) {
  const guard = await requireExpert();
  if (!guard.ok) return guard.response;
  const route = "POST /api/expert/agreement";
  try {
    const rl = await checkRateLimit(`expert-agreement:${guard.expertId}`, { maxHits: 10 });
    if (!rl.allowed) return apiError.rateLimited(route, rl.retryAfterSec);
    const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
    if (!body) return apiError.badRequest("Invalid request.", route);
    const name = clean(body.name, 160);
    if (body.agree !== true) return apiError.validation("Please tick the box to accept the agreement.", route);
    if (name.length < 2) return apiError.validation("Please type your full name as your signature.", route);
    const expert = await loadExpertSelf(guard.expertId);
    if (!expert) return apiError.notFound(route);
    if (expert.agreement_signed_at) return NextResponse.json({ ok: true, alreadySigned: true });
    if (isStripeConfigured() && !expert.billing_exempt) {
      return NextResponse.json({ ok: false, error: "Please save a card to accept the agreement.", code: "card_required" }, { status: 409 });
    }
    const r = await acceptExpertAgreement(expert, { name, ipHash: hashIp(requestIp(req)), userAgent: clean(req.headers.get("user-agent"), 400) || null });
    return NextResponse.json({ ok: true, signedAt: r.acceptedAt.toISOString() });
  } catch (err) {
    return serverError(err, { route });
  }
}
