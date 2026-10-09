import { NextRequest, NextResponse } from "next/server";
import type Stripe from "stripe";
import { getStripe, subscriptionPatch, periodEndOf } from "@/lib/stripe";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { sendTrialEndingReminder, sendPaymentFailedEmail, sendMemberPaidWelcome } from "@/lib/email/billingEmails";
import { notifySignup } from "@/lib/email/teamNotify";
import { normalizeProviderRate } from "@/lib/providerBilling";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const RELEVANT = new Set([
  "checkout.session.completed",
  "customer.subscription.created",
  "customer.subscription.updated",
  "customer.subscription.deleted",
  "customer.subscription.trial_will_end",
  "invoice.paid",
  "invoice.payment_succeeded",
  "invoice.payment_failed",
]);

/**
 * POST /api/stripe/webhook. Signature verified; the stripe_events row is written
 * only AFTER handling succeeds, so a failed handler is retried by Stripe.
 * Routing: metadata.audience on the subscription (expert | partner | member),
 * then the customer id on the experts / partners / members row.
 */
export async function POST(req: NextRequest) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) return NextResponse.json({ ok: false, error: "Webhook not configured." }, { status: 503 });
  const sig = req.headers.get("stripe-signature") || "";
  const raw = await req.text();
  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(raw, sig, secret);
  } catch (err) {
    console.error("[webhook] bad signature", err);
    return NextResponse.json({ ok: false, error: "Invalid signature." }, { status: 400 });
  }
  if (!RELEVANT.has(event.type)) return NextResponse.json({ ok: true, ignored: event.type });

  const db = supabaseAdmin();
  const { data: seen } = await db.from("stripe_events").select("id").eq("id", event.id).maybeSingle();
  if (seen) return NextResponse.json({ ok: true, duplicate: true });

  let target: { kind: "expert" | "partner" | "member"; id: string } | null = null;
  try {
    target = await handle(event);
  } catch (err) {
    console.error(`[webhook] ${event.type} failed`, err);
    return NextResponse.json({ ok: false, error: "Handler failed; Stripe will retry." }, { status: 500 });
  }
  await db.from("stripe_events").insert({
    id: event.id,
    type: event.type,
    customer_kind: target?.kind ?? null,
    expert_id: target?.kind === "expert" ? target.id : null,
    partner_id: target?.kind === "partner" ? target.id : null,
    member_id: target?.kind === "member" ? target.id : null,
    payload: { type: event.type, object: (event.data.object as { id?: string }).id ?? null },
  });
  return NextResponse.json({ ok: true });
}

type Target = { kind: "expert" | "partner" | "member"; id: string } | null;

async function findByCustomer(customerId: string, audienceHint: string | undefined): Promise<Target> {
  const db = supabaseAdmin();
  const order: ("expert" | "partner" | "member")[] = audienceHint === "partner" ? ["partner", "expert", "member"] : audienceHint === "member" ? ["member", "expert", "partner"] : ["expert", "partner", "member"];
  for (const kind of order) {
    const table = kind === "expert" ? "experts" : kind === "partner" ? "partners" : "members";
    const { data } = await db.from(table).select("id").eq("stripe_customer_id", customerId).maybeSingle();
    if (data) return { kind, id: data.id };
  }
  return null;
}

async function handle(event: Stripe.Event): Promise<Target> {
  const db = supabaseAdmin();
  const stripe = getStripe();

  if (event.type === "checkout.session.completed") {
    const s = event.data.object as Stripe.Checkout.Session;
    if (s.mode !== "subscription") return null;
    const customerId = typeof s.customer === "string" ? s.customer : s.customer?.id ?? null;
    const subId = typeof s.subscription === "string" ? s.subscription : s.subscription?.id ?? null;
    const email = (s.customer_details?.email || s.customer_email || s.metadata?.email || "").toLowerCase();
    if (!customerId || !subId || !email) return null;
    const sub = await stripe.subscriptions.retrieve(subId, { expand: ["default_payment_method"] });
    const pm = sub.default_payment_method && typeof sub.default_payment_method !== "string" ? sub.default_payment_method : null;
    const tier = s.metadata?.tier === "standard" ? "standard" : "founding";
    const interval = sub.items.data[0]?.price.recurring?.interval === "year" ? "year" : "month";
    const reservationId = s.metadata?.reservation_id || null;
    let name = s.metadata?.full_name || s.customer_details?.name || "";
    let reservation: Record<string, unknown> | null = null;
    if (reservationId) {
      const { data } = await db.from("member_reservations").select("*").eq("id", reservationId).maybeSingle();
      reservation = data;
      if (data) name = name || String(data.full_name);
    }
    const { data: existing } = await db.from("members").select("id").ilike("email", email).maybeSingle();
    const patch = {
      full_name: name || email,
      email,
      phone: (reservation?.phone as string | null) ?? null,
      practice_name: (reservation?.practice_name as string | null) ?? null,
      role: (reservation?.role as string | null) ?? null,
      location: (reservation?.location as string | null) ?? null,
      plan: tier,
      billing: interval === "year" ? "annual" : "monthly",
      status: "active",
      reservation_id: reservationId,
      activated_by: "stripe",
      stripe_customer_id: customerId,
      ...subscriptionPatch(sub, pm?.card ? { brand: pm.card.brand, last4: pm.card.last4 } : undefined),
      founding_member_locked: tier === "founding",
    };
    let memberId: string;
    if (existing) {
      await db.from("members").update(patch).eq("id", existing.id);
      memberId = existing.id;
    } else {
      const { data, error } = await db.from("members").insert(patch).select("id").single();
      if (error) throw error;
      memberId = data.id;
    }
    if (reservationId) {
      await db.from("member_reservations").update({ status: "converted", reviewed_by: "stripe", reviewed_at: new Date().toISOString() }).eq("id", reservationId);
      await db.from("referral_signups").update({ member_id: memberId }).eq("reservation_id", reservationId).is("member_id", null);
    }
    try {
      await sendMemberPaidWelcome({ to: email, name, interval, tier });
    } catch (err) {
      console.error("member welcome failed:", err);
    }
    await notifySignup("member PAID (Checkout)", { Member: name, Email: email, Tier: tier, Billing: interval, Reservation: reservationId || "none" });
    return { kind: "member", id: memberId };
  }

  if (event.type.startsWith("customer.subscription.") && event.type !== "customer.subscription.trial_will_end") {
    const sub = event.data.object as Stripe.Subscription;
    const customerId = typeof sub.customer === "string" ? sub.customer : sub.customer.id;
    const hydrated = sub.default_payment_method && typeof sub.default_payment_method !== "string" ? sub : await stripe.subscriptions.retrieve(sub.id, { expand: ["default_payment_method"] });
    const pm = hydrated.default_payment_method && typeof hydrated.default_payment_method !== "string" ? hydrated.default_payment_method : null;
    const t = await findByCustomer(customerId, sub.metadata?.audience);
    if (!t) return null;
    const table = t.kind === "expert" ? "experts" : t.kind === "partner" ? "partners" : "members";
    // Dual accounts: only mirror the subscription whose audience matches this row.
    if (sub.metadata?.audience && sub.metadata.audience !== t.kind) return null;
    if (t.kind === "expert") {
      const { data: e } = await db.from("experts").select("billing_exempt").eq("id", t.id).maybeSingle();
      if (e?.billing_exempt) return t;
    }
    const patch = subscriptionPatch(hydrated, pm?.card ? { brand: pm.card.brand, last4: pm.card.last4 } : undefined);
    if (event.type === "customer.subscription.deleted") {
      patch.subscription_status = "canceled";
      if (t.kind === "partner") {
        // Only a partner who finished onboarding (signed agreement) churns. A subscription or
        // customer deleted before that (test cleanup, abandoned card step) just clears billing.
        const { data: p } = await db.from("partners").select("agreement_signed_at").eq("id", t.id).maybeSingle();
        if (p?.agreement_signed_at) patch.status = "churned";
      }
      if (t.kind === "member") patch.status = "paused";
    }
    await db.from(table).update(patch).eq("id", t.id);
    return t;
  }

  if (event.type === "customer.subscription.trial_will_end") {
    const sub = event.data.object as Stripe.Subscription;
    const customerId = typeof sub.customer === "string" ? sub.customer : sub.customer.id;
    const t = await findByCustomer(customerId, sub.metadata?.audience);
    if (!t || t.kind === "member") return t;
    const trialEnd = sub.trial_end ? new Date(sub.trial_end * 1000) : new Date(periodEndOf(sub) || Date.now());
    const daysLeft = Math.max(1, Math.ceil((trialEnd.getTime() - Date.now()) / 86400000));
    const stamp = new Date().toISOString();
    if (t.kind === "expert") {
      const { data: e } = await db.from("experts").select("id, full_name, email, billing_exempt, free_period_reminder_sent_at").eq("id", t.id).maybeSingle();
      if (e && !e.billing_exempt && !e.free_period_reminder_sent_at) {
        await db.from("experts").update({ free_period_reminder_sent_at: stamp }).eq("id", e.id);
        await sendTrialEndingReminder({ role: "expert", to: e.email, name: e.full_name, daysLeft, trialEnd });
      }
    } else {
      const { data: p } = await db.from("partners").select("id, contact_name, contact_email, billing_email, billing_plan, free_period_reminder_sent_at").eq("id", t.id).maybeSingle();
      if (p && !p.free_period_reminder_sent_at) {
        await db.from("partners").update({ free_period_reminder_sent_at: stamp }).eq("id", p.id);
        await sendTrialEndingReminder({ role: "partner", to: p.billing_email || p.contact_email, name: p.contact_name, daysLeft, trialEnd, rate: normalizeProviderRate(p.billing_plan) });
      }
    }
    return t;
  }

  const paid = event.type === "invoice.paid" || event.type === "invoice.payment_succeeded";
  if (paid || event.type === "invoice.payment_failed") {
    const inv = event.data.object as Stripe.Invoice;
    const customerId = typeof inv.customer === "string" ? inv.customer : inv.customer?.id ?? null;
    if (!customerId) return null;
    const t = await findByCustomer(customerId, undefined);
    if (!t) return null;
    const table = t.kind === "expert" ? "experts" : t.kind === "partner" ? "partners" : "members";
    if (event.type === "invoice.payment_failed") {
      await db.from(table).update({ subscription_status: "past_due" }).eq("id", t.id);
      const { data: row } = await db.from(table).select(t.kind === "partner" ? "contact_name, contact_email, billing_email, company_name" : "full_name, email").eq("id", t.id).maybeSingle();
      const r = (row ?? {}) as Record<string, string | null>;
      if (t.kind !== "member") await sendPaymentFailedEmail({ role: t.kind, to: (r.billing_email || r.contact_email || r.email) as string, name: (r.contact_name || r.full_name) as string });
      await notifySignup("payment FAILED", { Who: (r.company_name || r.full_name) as string, Email: (r.contact_email || r.email) as string, Kind: t.kind, Amount: `$${((inv.amount_due ?? 0) / 100).toFixed(2)}` });
      return t;
    }
    if ((inv.amount_paid ?? 0) > 0) {
      await db.from(table).update({ subscription_status: "active" }).eq("id", t.id);
      if (t.kind === "member") {
        const { data: m } = await db.from("members").select("first_paid_at").eq("id", t.id).maybeSingle();
        if (m && !m.first_paid_at) {
          await db.from("members").update({ first_paid_at: new Date().toISOString() }).eq("id", t.id);
          // $50 referral is earned on the referred member's FIRST payment.
          await db.from("referral_signups").update({ converted_at: new Date().toISOString() }).eq("member_id", t.id).is("converted_at", null);
        }
      }
    }
    return t;
  }
  return null;
}
