import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { clean } from "@/lib/signup";
import { hashIp, requestIp } from "@/lib/ipHash";
import { checkRateLimit } from "@/lib/rateLimit";
import { serverError, apiError } from "@/lib/api/errorResponse";
import { INVITE_COLS, acceptInvite, type Invite } from "@/lib/founding/invites";
import { getStripe, isStripeConfigured, createProviderSubscription, cardOf, subscriptionPatch } from "@/lib/stripe";
import { expertAgreementSections } from "@/content/legal/expertAgreement";
import { partnerAgreementSections } from "@/content/legal/partnerAgreement";
import { providerRampRows, providerFreePeriodEnd, freeMonthsFor, PROVIDER_FREE_MONTHS, normalizeProviderRate } from "@/lib/providerBilling";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const CODE_RE = /^[A-Za-z0-9]{10,40}$/;

async function loadInvite(code: string): Promise<Invite | null> {
  if (!CODE_RE.test(code)) return null;
  const { data } = await supabaseAdmin().from("founding_invites").select(INVITE_COLS).eq("code", code).maybeSingle();
  return (data as Invite | null) ?? null;
}

/** GET: public view of the invite (no internal notes). Marks viewed. */
export async function GET(req: NextRequest, { params }: { params: { code: string } }) {
  const route = "GET /api/founding/[code]";
  try {
    const rl = await checkRateLimit(`founding-view:${requestIp(req)}`, { maxHits: 60 });
    if (!rl.allowed) return apiError.rateLimited(route, rl.retryAfterSec);
    const inv = await loadInvite(params.code);
    if (!inv || inv.status === "draft" || inv.status === "revoked") return apiError.notFound(route);
    const expired = new Date(inv.expires_at) < new Date() && inv.status !== "accepted";
    if (inv.status === "sent") await supabaseAdmin().from("founding_invites").update({ status: "viewed", viewed_at: new Date().toISOString() }).eq("id", inv.id);
    const rate = normalizeProviderRate(inv.pricing_plan);
    const expertFree = providerFreePeriodEnd(freeMonthsFor({ audience: "expert", founding: true }));
    const partnerFree = providerFreePeriodEnd(PROVIDER_FREE_MONTHS);
    return NextResponse.json({
      ok: true,
      invite: {
        role: inv.role, full_name: inv.full_name, email: inv.email, company_name: inv.company_name, category: inv.category, member_offer: inv.member_offer,
        status: inv.status, accepted_at: inv.accepted_at, expires_at: inv.expires_at, expired, rate, expert_free_for_life: inv.expert_free_for_life,
        cardRequired: isStripeConfigured() && !(inv.role === "expert" && inv.expert_free_for_life),
      },
      expert: inv.role !== "partner" ? { sections: expertAgreementSections({ founding: true, freeUntil: expertFree.date }), rows: inv.expert_free_for_life ? [{ period: "Always", amount: "$0 (founding expert, free for life)" }] : providerRampRows("ladder", { expert: true, founding: true, freeUntil: expertFree.date }), provisional: expertFree.provisional } : null,
      partner: inv.role !== "expert" ? { sections: partnerAgreementSections({ rate, freeUntil: partnerFree.date }), rows: providerRampRows(rate, { freeUntil: partnerFree.date }), provisional: partnerFree.provisional } : null,
    });
  } catch (err) {
    return serverError(err, { route });
  }
}

/** POST { name, title?, agree: true, authorized?: true } → accept. Card step is inserted here in Phase 5. */
export async function POST(req: NextRequest, { params }: { params: { code: string } }) {
  const route = "POST /api/founding/[code]";
  try {
    const rl = await checkRateLimit(`founding-accept:${requestIp(req)}`, { maxHits: 20 });
    if (!rl.allowed) return apiError.rateLimited(route, rl.retryAfterSec);
    const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
    if (!body) return apiError.badRequest("Invalid request.", route);
    const inv = await loadInvite(params.code);
    if (!inv || inv.status === "draft" || inv.status === "revoked") return apiError.notFound(route);
    if (inv.status === "accepted") return NextResponse.json({ ok: true, alreadyAccepted: true });
    if (new Date(inv.expires_at) < new Date()) return apiError.validation("This invitation has expired. Reply to the invite email and we will send a fresh link.", route);
    const name = clean(body.name, 160);
    const title = clean(body.title, 120) || null;
    if (body.agree !== true) return apiError.validation("Please tick the box to accept.", route);
    if (name.length < 2) return apiError.validation("Please type your full name as your signature.", route);
    if (inv.role !== "expert" && body.authorized !== true) return apiError.validation("Please confirm you are authorised to commit your company.", route);

    // Sign-and-pay: when Stripe is live, a saved card is required unless the invite is a free-for-life expert.
    const cardRequired = isStripeConfigured() && !(inv.role === "expert" && inv.expert_free_for_life);
    const setupIntentId = clean(body.setupIntentId, 80);
    const paymentMethodId = clean(body.paymentMethodId, 80);
    let customerId: string | null = null;
    if (cardRequired) {
      if (!setupIntentId || !paymentMethodId) return apiError.validation("Card setup did not complete. Please try again.", route);
      const { data: row } = await supabaseAdmin().from("founding_invites").select("stripe_customer_id").eq("id", inv.id).maybeSingle();
      customerId = row?.stripe_customer_id ?? null;
      const si = await getStripe().setupIntents.retrieve(setupIntentId);
      const siCustomer = typeof si.customer === "string" ? si.customer : si.customer?.id ?? null;
      const siPm = typeof si.payment_method === "string" ? si.payment_method : si.payment_method?.id ?? null;
      if (si.status !== "succeeded" || !siCustomer || siPm !== paymentMethodId) {
        return apiError.validation("Card setup did not complete. Please try again.", route);
      }
      if (siCustomer !== customerId) {
        // Racing prepare calls: accept the intent's customer when it was created for this invite.
        const cust = await getStripe().customers.retrieve(siCustomer);
        const okCustomer = !("deleted" in cust && cust.deleted) && cust.metadata?.founding_invite === inv.id;
        if (!okCustomer) return apiError.validation("Card setup did not complete. Please try again.", route);
        customerId = siCustomer;
        await supabaseAdmin().from("founding_invites").update({ stripe_customer_id: customerId }).eq("id", inv.id);
      }
    }

    const result = await acceptInvite(inv, { name, title, ipHash: hashIp(requestIp(req)), userAgent: clean(req.headers.get("user-agent"), 400) || null });

    if (cardRequired && customerId) {
      const db = supabaseAdmin();
      const card = await cardOf(paymentMethodId);
      if (result.expertId && !inv.expert_free_for_life) {
        const sub = await createProviderSubscription({ customerId, paymentMethodId, audience: "expert", founding: true, metadata: { expert_id: result.expertId, source: "founding_invite" } });
        await db.from("experts").update({ ...subscriptionPatch(sub.subscription, card), stripe_customer_id: customerId, founding_expert_locked: true, free_period_ends_at: sub.freePeriodEndsAt }).eq("id", result.expertId);
      }
      if (result.partnerId) {
        const sub = await createProviderSubscription({ customerId, paymentMethodId, audience: "partner", rate: inv.pricing_plan, metadata: { partner_id: result.partnerId, source: "founding_invite" } });
        await db.from("partners").update({ ...subscriptionPatch(sub.subscription, card), stripe_customer_id: customerId, stripe_schedule_id: sub.scheduleId, founding_partner_locked: true, free_period_ends_at: sub.freePeriodEndsAt }).eq("id", result.partnerId);
      }
    }
    return NextResponse.json({ ok: true, ...result, next: inv.role === "partner" ? "/partner/login" : "/expert/login", email: inv.email });
  } catch (err) {
    return serverError(err, { route });
  }
}
