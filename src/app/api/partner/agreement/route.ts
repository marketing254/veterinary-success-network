import { NextRequest, NextResponse } from "next/server";
import { requirePartner } from "@/lib/auth/guards";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { serverError, apiError } from "@/lib/api/errorResponse";
import { clean } from "@/lib/signup";
import { hashIp, requestIp } from "@/lib/ipHash";
import { checkRateLimit } from "@/lib/rateLimit";
import { loadPartnerSelf, isHousePartner } from "@/lib/partner/load";
import { renderPartnerAgreementPdf } from "@/lib/pdf/agreementPdf";
import { PARTNER_AGREEMENT_VERSION } from "@/content/legal/partnerAgreement";
import { providerFreePeriodEnd, PROVIDER_FREE_MONTHS, normalizeProviderRate } from "@/lib/providerBilling";
import { acceptPartnerAgreement } from "@/lib/billing/acceptAgreement";
import { isStripeConfigured } from "@/lib/stripe";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET  /api/partner/agreement            status + signed download URL
 * GET  /api/partner/agreement?draft=1    personalised unsigned PDF
 * POST /api/partner/agreement            { name, title, agree, authorized } → e-sign WITHOUT a card
 *      (only while Stripe is not configured; otherwise use /api/partner/billing/start).
 * Covered companies (billing_parent_id) do not sign; the principal's agreement covers them.
 */
export async function GET(req: NextRequest) {
  const guard = await requirePartner();
  if (!guard.ok) return guard.response;
  const route = "GET /api/partner/agreement";
  try {
    const p = await loadPartnerSelf(guard.partnerId);
    if (!p) return apiError.notFound(route);
    const rate = normalizeProviderRate(p.billing_plan);
    if (new URL(req.url).searchParams.get("draft") === "1") {
      const freeUntil = p.free_period_ends_at ? new Date(p.free_period_ends_at) : providerFreePeriodEnd(PROVIDER_FREE_MONTHS).date;
      const pdf = await renderPartnerAgreementPdf({ companyName: p.company_name, contactName: p.contact_name, email: p.contact_email, category: p.category, memberOffer: p.member_offer, rate, freeUntil }, null);
      return new NextResponse(new Uint8Array(pdf), { headers: { "Content-Type": "application/pdf", "Content-Disposition": 'inline; filename="VSN-Partner-Agreement-draft.pdf"', "Cache-Control": "no-store" } });
    }
    const db = supabaseAdmin();
    const { data: row } = await db.from("partners").select("agreement_pdf_path").eq("id", guard.partnerId).maybeSingle();
    let downloadUrl: string | null = null;
    if (row?.agreement_pdf_path) {
      const { data } = await db.storage.from("agreements").createSignedUrl(row.agreement_pdf_path, 600);
      downloadUrl = data?.signedUrl ?? null;
    }
    return NextResponse.json({
      ok: true,
      version: PARTNER_AGREEMENT_VERSION,
      covered: !!p.billing_parent_id || isHousePartner(p),
      rate,
      signed: !!p.agreement_signed_at,
      signedAt: p.agreement_signed_at,
      signedName: p.agreement_name,
      signedVersion: p.agreement_version,
      cardRequired: isStripeConfigured() && !p.billing_parent_id && !isHousePartner(p),
      hasSubscription: !!p.subscription_status,
      downloadUrl,
    });
  } catch (err) {
    return serverError(err, { route });
  }
}

export async function POST(req: NextRequest) {
  const guard = await requirePartner();
  if (!guard.ok) return guard.response;
  const route = "POST /api/partner/agreement";
  try {
    const rl = await checkRateLimit(`partner-agreement:${guard.partnerId}`, { maxHits: 10 });
    if (!rl.allowed) return apiError.rateLimited(route, rl.retryAfterSec);
    const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
    if (!body) return apiError.badRequest("Invalid request.", route);
    const name = clean(body.name, 160);
    const title = clean(body.title, 120) || null;
    if (body.agree !== true) return apiError.validation("Please tick the box to accept the agreement.", route);
    if (name.length < 2) return apiError.validation("Please type your full name as your signature.", route);
    if (body.authorized !== true) return apiError.validation("Please confirm you are authorised to commit your company.", route);
    const p = await loadPartnerSelf(guard.partnerId);
    if (!p) return apiError.notFound(route);
    if (p.billing_parent_id) return apiError.validation("This listing is covered by your principal company's agreement.", route);
    if (p.status !== "approved") return apiError.validation("Your application is still in review.", route);
    if (p.agreement_signed_at) return NextResponse.json({ ok: true, alreadySigned: true });
    if (isStripeConfigured()) return NextResponse.json({ ok: false, error: "Please save a card to accept the agreement.", code: "card_required" }, { status: 409 });
    const r = await acceptPartnerAgreement(p, { name, title, ipHash: hashIp(requestIp(req)), userAgent: clean(req.headers.get("user-agent"), 400) || null });
    return NextResponse.json({ ok: true, signedAt: r.acceptedAt.toISOString() });
  } catch (err) {
    return serverError(err, { route });
  }
}
