import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { requireExpert, requirePartner } from "@/lib/auth/guards";
import { serverError, apiError } from "@/lib/api/errorResponse";
import { clean } from "@/lib/signup";
import { hashIp, requestIp } from "@/lib/ipHash";
import { checkRateLimit } from "@/lib/rateLimit";
import { getStripe, isStripeConfigured, ensureCustomer, createProviderSubscription, cardOf, subscriptionPatch, appOrigin, periodEndOf } from "@/lib/stripe";
import { loadExpertSelf } from "@/lib/expert/load";
import { loadPartnerSelf } from "@/lib/partner/load";
import { acceptExpertAgreement, acceptPartnerAgreement } from "@/lib/billing/acceptAgreement";

/**
 * Shared handlers behind /api/expert/billing/* and /api/partner/billing/*:
 *   prepare   create/reuse the Stripe customer + a SetupIntent (card saved, nothing charged)
 *   start     verify the SetupIntent, create the subscription, record the agreement in the same moment
 *   invoices  list invoices for the row's customer
 *   portal    Stripe billing portal session (update card, cancel)
 *   sync      pull the latest subscription state from Stripe onto the row
 * Billing routes stay on the plain guards so a blocked provider can still fix a card.
 */
type Audience = "expert" | "partner";
const STD_ERR = "Something went wrong on our side. Nothing was charged. Please try again, or email support@veterinarysuccessnetwork.com.";

async function ctx(audience: Audience) {
  if (audience === "expert") {
    const g = await requireExpert();
    if (!g.ok) return { fail: g.response };
    const row = await loadExpertSelf(g.expertId);
    if (!row) return { fail: NextResponse.json({ ok: false, error: "Not found." }, { status: 404 }) };
    return { id: row.id, email: row.email, name: row.full_name, table: "experts" as const, row, exempt: row.billing_exempt, signed: !!row.agreement_signed_at };
  }
  const g = await requirePartner();
  if (!g.ok) return { fail: g.response };
  const row = await loadPartnerSelf(g.partnerId);
  if (!row) return { fail: NextResponse.json({ ok: false, error: "Not found." }, { status: 404 }) };
  if (row.billing_parent_id) return { fail: NextResponse.json({ ok: false, error: "This listing is covered by your principal company's billing." }, { status: 409 }) };
  return { id: row.id, email: row.contact_email, name: row.contact_name, table: "partners" as const, row, exempt: false, signed: !!row.agreement_signed_at };
}

async function customerIdOf(table: "experts" | "partners", id: string): Promise<string | null> {
  const { data } = await supabaseAdmin().from(table).select("stripe_customer_id").eq("id", id).maybeSingle();
  return (data?.stripe_customer_id as string | null) ?? null;
}

export async function billingPrepare(audience: Audience) {
  const route = `POST /api/${audience}/billing/prepare`;
  const c = await ctx(audience);
  if ("fail" in c) return c.fail;
  try {
    if (!isStripeConfigured()) return NextResponse.json({ ok: false, error: "Billing is not open yet.", code: "stripe_unconfigured" }, { status: 503 });
    if (c.exempt) return NextResponse.json({ ok: false, error: "Your listing is free for life. No card needed." }, { status: 409 });
    const stripe = getStripe();
    const existing = await customerIdOf(c.table, c.id);
    const customerId = await ensureCustomer({ existingId: existing, email: c.email, name: audience === "partner" ? `${(c.row as { company_name: string }).company_name} (${c.name})` : c.name, metadata: { audience, [`${audience}_id`]: c.id, vsn_key: audience } });
    if (customerId !== existing) await supabaseAdmin().from(c.table).update({ stripe_customer_id: customerId }).eq("id", c.id);
    const si = await stripe.setupIntents.create({ customer: customerId, automatic_payment_methods: { enabled: true, allow_redirects: "never" }, usage: "off_session", metadata: { audience, [`${audience}_id`]: c.id, purpose: "free_months_start" } });
    if (!si.client_secret) throw new Error("No client secret from Stripe.");
    return NextResponse.json({ ok: true, clientSecret: si.client_secret, publishableKey: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY });
  } catch (err) {
    return serverError(err, { route, publicMessage: STD_ERR });
  }
}

export async function billingStart(req: NextRequest, audience: Audience) {
  const route = `POST /api/${audience}/billing/start`;
  const c = await ctx(audience);
  if ("fail" in c) return c.fail;
  try {
    const rl = await checkRateLimit(`${audience}-billing-start:${c.id}`, { maxHits: 10 });
    if (!rl.allowed) return apiError.rateLimited(route, rl.retryAfterSec);
    const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
    if (!body) return apiError.badRequest("Invalid request.", route);
    const setupIntentId = clean(body.setupIntentId, 80);
    const paymentMethodId = clean(body.paymentMethodId, 80);
    const name = clean(body.name, 160);
    const title = clean(body.title, 120) || null;
    if (body.agree !== true) return apiError.validation("Please tick the box to accept the agreement.", route);
    if (name.length < 2) return apiError.validation("Please type your full name as your signature.", route);
    if (audience === "partner" && body.authorized !== true) return apiError.validation("Please confirm you are authorised to commit your company.", route);
    if (!setupIntentId || !paymentMethodId) return apiError.validation("Card setup did not complete. Please try again.", route);
    if (c.exempt) return NextResponse.json({ ok: false, error: "Your listing is free for life. No card needed." }, { status: 409 });
    if (audience === "partner" && (c.row as { status: string }).status !== "approved") return apiError.validation("Your application is still in review.", route);

    const stripe = getStripe();
    let customerId = await customerIdOf(c.table, c.id);
    const si = await stripe.setupIntents.retrieve(setupIntentId);
    const siCustomer = typeof si.customer === "string" ? si.customer : si.customer?.id ?? null;
    if (si.status !== "succeeded" || !siCustomer) {
      console.warn(`[${route}] setup intent not usable`, { status: si.status, siCustomer });
      return apiError.validation("Card setup did not complete. Please try again.", route);
    }
    if (siCustomer !== customerId) {
      // Two prepare calls can race (React strict mode, double click) and leave the row pointing at a
      // different customer than the one the card was saved on. Accept the intent's customer when it
      // belongs to this provider's email, and repoint the row at it.
      const cust = await stripe.customers.retrieve(siCustomer);
      const email = "deleted" in cust && cust.deleted ? null : (cust.email ?? "").toLowerCase();
      const meta = "deleted" in cust && cust.deleted ? {} : cust.metadata ?? {};
      if (email !== c.email.toLowerCase() || meta[`${audience}_id`] !== c.id) {
        console.warn(`[${route}] setup intent customer mismatch`, { siCustomer, customerId, email });
        return apiError.validation("Card setup did not complete. Please try again.", route);
      }
      customerId = siCustomer;
      await supabaseAdmin().from(c.table).update({ stripe_customer_id: customerId }).eq("id", c.id);
    }
    const siPm = typeof si.payment_method === "string" ? si.payment_method : si.payment_method?.id ?? null;
    if (!siPm || siPm !== paymentMethodId) return apiError.validation("Payment method mismatch. Please try again.", route);

    const alreadySigned = c.signed;
    const row = c.row as unknown as { subscription_status: string | null; source: string; billing_plan?: string };
    let created;
    try {
      created = await createProviderSubscription({
        customerId,
        paymentMethodId,
        audience,
        rate: audience === "partner" ? row.billing_plan : null,
        founding: audience === "expert" && row.source === "founding_invite",
        metadata: { [`${audience}_id`]: c.id, source: row.source },
      });
    } catch (err) {
      return serverError(err, { route, status: 502, publicMessage: STD_ERR });
    }
    const card = await cardOf(paymentMethodId);
    const billing = {
      ...subscriptionPatch(created.subscription, card),
      stripe_customer_id: customerId,
      ...(audience === "partner" ? { stripe_schedule_id: created.scheduleId } : { founding_expert_locked: true }),
    };
    const sig = { name, title, ipHash: hashIp(requestIp(req)), userAgent: clean(req.headers.get("user-agent"), 400) || null };
    const freeUntil = new Date(created.freePeriodEndsAt);

    if (alreadySigned) {
      // Agreement was accepted before billing opened: just attach billing, no second welcome email.
      const { error } = await supabaseAdmin().from(c.table).update({ ...billing, free_period_ends_at: freeUntil.toISOString() }).eq("id", c.id);
      if (error) throw error;
    } else if (audience === "expert") {
      await acceptExpertAgreement(c.row as Parameters<typeof acceptExpertAgreement>[0], sig, billing, freeUntil);
    } else {
      await acceptPartnerAgreement(c.row as Parameters<typeof acceptPartnerAgreement>[0], sig, billing, freeUntil);
    }
    return NextResponse.json({ ok: true, status: created.subscription.status, freePeriodEndsAt: created.freePeriodEndsAt, provisional: created.provisional });
  } catch (err) {
    return serverError(err, { route, publicMessage: STD_ERR });
  }
}

export async function billingInvoices(audience: Audience) {
  const c = await ctx(audience);
  if ("fail" in c) return c.fail;
  try {
    if (!isStripeConfigured()) return NextResponse.json({ ok: true, rows: [] });
    const customerId = await customerIdOf(c.table, c.id);
    if (!customerId || customerId.startsWith("house_") || customerId.startsWith("preview_")) return NextResponse.json({ ok: true, rows: [] });
    const list = await getStripe().invoices.list({ customer: customerId, limit: 24 });
    const rows = list.data.map((i) => ({ id: i.id, number: i.number, status: i.status, amount: (i.amount_paid || i.amount_due || 0) / 100, currency: i.currency, created: new Date(i.created * 1000).toISOString(), url: i.hosted_invoice_url, pdf: i.invoice_pdf }));
    return NextResponse.json({ ok: true, rows });
  } catch (err) {
    return serverError(err, { route: `GET /api/${audience}/billing/invoices` });
  }
}

export async function billingPortal(audience: Audience) {
  const c = await ctx(audience);
  if ("fail" in c) return c.fail;
  try {
    if (!isStripeConfigured()) return NextResponse.json({ ok: false, error: "Billing is not open yet." }, { status: 503 });
    const customerId = await customerIdOf(c.table, c.id);
    if (!customerId) return NextResponse.json({ ok: false, error: "No card on file yet." }, { status: 409 });
    const session = await getStripe().billingPortal.sessions.create({ customer: customerId, return_url: `${appOrigin()}/${audience === "expert" ? "expert/billing" : "partner/account"}` });
    return NextResponse.json({ ok: true, url: session.url });
  } catch (err) {
    return serverError(err, { route: `POST /api/${audience}/billing/portal` });
  }
}

export async function billingSync(audience: Audience) {
  const c = await ctx(audience);
  if ("fail" in c) return c.fail;
  try {
    if (!isStripeConfigured()) return NextResponse.json({ ok: true, synced: false });
    const customerId = await customerIdOf(c.table, c.id);
    if (!customerId) return NextResponse.json({ ok: true, synced: false });
    const stripe = getStripe();
    const subs = await stripe.subscriptions.list({ customer: customerId, status: "all", limit: 20, expand: ["data.default_payment_method"] });
    const mine = subs.data.filter((s) => s.metadata?.audience === audience).sort((a, b) => b.created - a.created);
    const live = mine.find((s) => s.status === "trialing" || s.status === "active" || s.status === "past_due") ?? mine[0];
    if (!live) return NextResponse.json({ ok: true, synced: false });
    const pm = live.default_payment_method && typeof live.default_payment_method !== "string" ? live.default_payment_method : null;
    const card = pm?.card ? { brand: pm.card.brand, last4: pm.card.last4 } : undefined;
    const { error } = await supabaseAdmin().from(c.table).update(subscriptionPatch(live, card)).eq("id", c.id);
    if (error) throw error;
    return NextResponse.json({ ok: true, synced: true, status: live.status, currentPeriodEnd: periodEndOf(live) });
  } catch (err) {
    return serverError(err, { route: `POST /api/${audience}/billing/sync` });
  }
}
