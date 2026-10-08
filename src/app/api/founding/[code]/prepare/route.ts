import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { requestIp } from "@/lib/ipHash";
import { checkRateLimit } from "@/lib/rateLimit";
import { serverError, apiError } from "@/lib/api/errorResponse";
import { getStripe, isStripeConfigured, ensureCustomer } from "@/lib/stripe";
import { INVITE_COLS, type Invite } from "@/lib/founding/invites";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const STD_ERR = "Something went wrong on our side. Nothing was charged. Please try again, or email support@veterinarysuccessnetwork.com.";

/** POST: Stripe customer (stored on the invite) + SetupIntent for the founding acceptance page. 60 per 10 min per IP. */
export async function POST(req: NextRequest, { params }: { params: { code: string } }) {
  const route = "POST /api/founding/[code]/prepare";
  try {
    const rl = await checkRateLimit(`founding-prepare:${requestIp(req)}`, { maxHits: 60 });
    if (!rl.allowed) return apiError.rateLimited(route, rl.retryAfterSec);
    if (!isStripeConfigured()) return NextResponse.json({ ok: false, error: "Billing is not open yet.", code: "stripe_unconfigured" }, { status: 503 });
    if (!/^[A-Za-z0-9]{10,40}$/.test(params.code)) return apiError.notFound(route);
    const db = supabaseAdmin();
    const { data } = await db.from("founding_invites").select(`${INVITE_COLS}, stripe_customer_id`).eq("code", params.code).maybeSingle();
    const inv = data as (Invite & { stripe_customer_id: string | null }) | null;
    if (!inv || !["sent", "viewed"].includes(inv.status)) return apiError.notFound(route);
    if (new Date(inv.expires_at) < new Date()) return apiError.validation("This invitation has expired.", route);
    // Free-for-life expert-only invites never need a card.
    if (inv.role === "expert" && inv.expert_free_for_life) return NextResponse.json({ ok: true, cardRequired: false });
    const customerId = await ensureCustomer({ existingId: inv.stripe_customer_id, email: inv.email, name: inv.company_name ? `${inv.company_name} (${inv.full_name})` : inv.full_name, metadata: { founding_invite: inv.id, role: inv.role, vsn_key: "founding" } });
    if (customerId !== inv.stripe_customer_id) await db.from("founding_invites").update({ stripe_customer_id: customerId }).eq("id", inv.id);
    const si = await getStripe().setupIntents.create({ customer: customerId, automatic_payment_methods: { enabled: true, allow_redirects: "never" }, usage: "off_session", metadata: { founding_invite: inv.id, role: inv.role, purpose: "founding_accept" } });
    if (!si.client_secret) throw new Error("No client secret.");
    return NextResponse.json({ ok: true, cardRequired: true, clientSecret: si.client_secret, publishableKey: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY });
  } catch (err) {
    return serverError(err, { route, publicMessage: STD_ERR });
  }
}
