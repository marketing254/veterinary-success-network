import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { clean, EMAIL_RE } from "@/lib/signup";
import { requestIp } from "@/lib/ipHash";
import { checkRateLimit } from "@/lib/rateLimit";
import { serverError, apiError } from "@/lib/api/errorResponse";
import { getStripe, isStripeConfigured, priceIdFor, appOrigin, ensureCustomer } from "@/lib/stripe";
import { MEMBER_LAUNCH_ENABLED, MEMBER_LAUNCH_MESSAGE } from "@/lib/launch";
import { MEMBER_FOUNDING_CAP } from "@/lib/providerBilling";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/member/checkout { reservationId?, email?, fullName?, billing: monthly|annual, ref? }
 * Pay-first member signup: a hosted Stripe Checkout session. The webhook
 * (checkout.session.completed) creates the members row and converts the
 * reservation. Only live when MEMBER_LAUNCH_ENABLED=true. Tier: founding while
 * fewer than 100 members have paid, otherwise standard.
 */
export async function POST(req: NextRequest) {
  const route = "POST /api/member/checkout";
  try {
    if (!MEMBER_LAUNCH_ENABLED) return NextResponse.json({ ok: false, error: MEMBER_LAUNCH_MESSAGE }, { status: 409 });
    if (!isStripeConfigured()) return NextResponse.json({ ok: false, error: "Checkout is not open yet." }, { status: 503 });
    const rl = await checkRateLimit(`member-checkout:${requestIp(req)}`, { maxHits: 10 });
    if (!rl.allowed) return apiError.rateLimited(route, rl.retryAfterSec);
    const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
    if (!body) return apiError.badRequest("Invalid request.", route);
    const db = supabaseAdmin();
    const reservationId = clean(body.reservationId, 60);
    let email = clean(body.email, 200).toLowerCase();
    let fullName = clean(body.fullName, 160);
    if (reservationId && /^[0-9a-f-]{36}$/i.test(reservationId)) {
      const { data: r } = await db.from("member_reservations").select("id, email, full_name, status").eq("id", reservationId).maybeSingle();
      if (!r) return apiError.notFound(route);
      if (r.status === "converted") return NextResponse.json({ ok: false, error: "This reservation is already a member. Sign in instead." }, { status: 409 });
      email = r.email.toLowerCase();
      fullName = r.full_name;
    }
    if (!EMAIL_RE.test(email) || fullName.length < 2) return apiError.validation("Name and a valid email are required.", route);
    const { data: existing } = await db.from("members").select("id, subscription_status").ilike("email", email).maybeSingle();
    if (existing && ["active", "trialing"].includes(existing.subscription_status || "")) return NextResponse.json({ ok: false, error: "You already have an active membership." }, { status: 409 });

    const { count } = await db.from("members").select("id", { count: "exact", head: true }).eq("plan", "founding").eq("status", "active");
    const tier: "founding" | "standard" = (count ?? 0) < MEMBER_FOUNDING_CAP ? "founding" : "standard";
    const annual = clean(body.billing, 10) === "annual";
    const price = priceIdFor(tier === "founding" ? (annual ? "founding_annual" : "founding_monthly") : annual ? "standard_annual" : "standard_monthly");

    const customerId = await ensureCustomer({ existingId: (existing as { stripe_customer_id?: string } | null)?.stripe_customer_id ?? null, email, name: fullName, metadata: { audience: "member", vsn_key: "member" } });
    const ref = clean(body.ref, 16) || req.cookies.get("vsn_ref")?.value || "";
    const session = await getStripe().checkout.sessions.create({
      mode: "subscription",
      customer: customerId,
      line_items: [{ price, quantity: 1 }],
      allow_promotion_codes: true,
      success_url: `${appOrigin()}/welcome?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${appOrigin()}/join${reservationId ? `?wl=${reservationId}` : ""}`,
      subscription_data: { metadata: { audience: "member", tier, reservation_id: reservationId || "", full_name: fullName, ref } },
      metadata: { audience: "member", tier, reservation_id: reservationId || "", full_name: fullName, email, ref },
    });
    if (reservationId) await db.from("member_reservations").update({ checkout_session_id: session.id, checkout_started_at: new Date().toISOString() }).eq("id", reservationId);
    return NextResponse.json({ ok: true, url: session.url, tier });
  } catch (err) {
    return serverError(err, { route });
  }
}
