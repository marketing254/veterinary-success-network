import Stripe from "stripe";
import { providerFreePeriodEnd, freeMonthsFor, companyStandardStartsAt, normalizeProviderRate, PAYMENT_GRACE_DAYS, type ProviderRate } from "@/lib/providerBilling";

/**
 * Stripe wiring (Phase 5). Keys come from env; nothing here runs unless
 * STRIPE_SECRET_KEY is set. Price ids are read lazily so a missing price
 * only fails the call that needs it, and /admin/stripe-status lists them.
 *
 * Provider billing: one subscription per audience on one customer
 * (dual accounts have two, told apart by metadata.audience).
 *   expert / flat partner : subscription with trial_end = free period end
 *   ladder partner        : subscription schedule, phase 1 $39 (trial until free end,
 *                           ends 12 months later), phase 2 $149, then release.
 * NEVER call subscriptions.update on a schedule-managed subscription.
 */
let client: Stripe | null = null;

export function isStripeConfigured(): boolean {
  return !!process.env.STRIPE_SECRET_KEY && !!process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
}

export function getStripe(): Stripe {
  if (client) return client;
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("STRIPE_SECRET_KEY is not set.");
  client = new Stripe(key);
  return client;
}

export const PRICE_ENV = {
  founding_monthly: "STRIPE_PRICE_FOUNDING_MONTHLY",
  founding_annual: "STRIPE_PRICE_FOUNDING_ANNUAL",
  founding_annual_promo: "STRIPE_PRICE_FOUNDING_ANNUAL_PROMO",
  standard_monthly: "STRIPE_PRICE_STANDARD_MONTHLY",
  standard_annual: "STRIPE_PRICE_STANDARD_ANNUAL",
  partner_growth_monthly: "STRIPE_PRICE_PARTNER_GROWTH_MONTHLY",
  partner_growth_annual: "STRIPE_PRICE_PARTNER_GROWTH_ANNUAL",
  partner_founding_standard_monthly: "STRIPE_PRICE_PARTNER_FOUNDING_STANDARD_MONTHLY",
  partner_founding_standard_annual: "STRIPE_PRICE_PARTNER_FOUNDING_STANDARD_ANNUAL",
  expert_growth_monthly: "STRIPE_PRICE_EXPERT_GROWTH_MONTHLY",
  expert_growth_annual: "STRIPE_PRICE_EXPERT_GROWTH_ANNUAL",
} as const;
export type PriceKey = keyof typeof PRICE_ENV;

export function priceIdFor(key: PriceKey): string {
  const v = process.env[PRICE_ENV[key]];
  if (!v) throw new Error(`${PRICE_ENV[key]} is not set.`);
  return v;
}

export function appOrigin(): string {
  return (process.env.NEXT_PUBLIC_APP_ORIGIN || process.env.NEXT_PUBLIC_SITE_URL || "https://www.veterinarysuccessnetwork.com").replace(/\/$/, "");
}

/** current_period_end lives on the item in current API versions; fall back to the legacy field. */
export function periodEndOf(sub: Stripe.Subscription): string | null {
  const item = sub.items?.data?.[0] as unknown as { current_period_end?: number } | undefined;
  const legacy = (sub as unknown as { current_period_end?: number }).current_period_end;
  const sec = item?.current_period_end ?? legacy;
  return typeof sec === "number" ? new Date(sec * 1000).toISOString() : null;
}

export async function ensureCustomer(opts: { existingId: string | null; email: string; name: string; metadata: Record<string, string> }): Promise<string> {
  const stripe = getStripe();
  if (opts.existingId && !opts.existingId.startsWith("house_") && !opts.existingId.startsWith("preview_")) {
    try {
      const c = await stripe.customers.retrieve(opts.existingId);
      if (!("deleted" in c && c.deleted)) return opts.existingId;
    } catch {
      /* recreate below */
    }
  }
  const customer = await stripe.customers.create({ email: opts.email, name: opts.name, metadata: opts.metadata });
  return customer.id;
}

export async function cardOf(paymentMethodId: string): Promise<{ brand: string | null; last4: string | null }> {
  try {
    const pm = await getStripe().paymentMethods.retrieve(paymentMethodId);
    return { brand: pm.card?.brand ?? null, last4: pm.card?.last4 ?? null };
  } catch {
    return { brand: null, last4: null };
  }
}

export type ProviderSubscriptionResult = {
  subscription: Stripe.Subscription;
  priceId: string;
  scheduleId: string | null;
  freePeriodEndsAt: string;
  standardStartsAt: string | null;
  provisional: boolean;
};

export async function createProviderSubscription(opts: {
  customerId: string;
  paymentMethodId: string;
  audience: "expert" | "partner";
  rate?: ProviderRate | string | null;
  founding?: boolean;
  metadata?: Record<string, string>;
}): Promise<ProviderSubscriptionResult> {
  const stripe = getStripe();
  const plan = normalizeProviderRate(opts.rate);

  try {
    await stripe.paymentMethods.attach(opts.paymentMethodId, { customer: opts.customerId });
  } catch {
    /* already attached */
  }
  await stripe.customers.update(opts.customerId, { invoice_settings: { default_payment_method: opts.paymentMethodId } });

  // Idempotent re-accept (dual accounts, retried requests): reuse a live subscription for this audience.
  const existing = await stripe.subscriptions.list({ customer: opts.customerId, status: "all", limit: 20 });
  const reusable = existing.data.find((s) => (s.status === "trialing" || s.status === "active") && s.metadata?.audience === opts.audience);
  if (reusable) {
    return {
      subscription: reusable,
      priceId: reusable.items.data[0]?.price.id ?? "",
      scheduleId: typeof reusable.schedule === "string" ? reusable.schedule : reusable.schedule?.id ?? null,
      freePeriodEndsAt: reusable.trial_end ? new Date(reusable.trial_end * 1000).toISOString() : new Date().toISOString(),
      standardStartsAt: reusable.metadata?.standard_starts_at ?? null,
      provisional: reusable.metadata?.free_period === "provisional",
    };
  }

  const free = providerFreePeriodEnd(freeMonthsFor({ audience: opts.audience, founding: opts.founding }));
  const freeSec = Math.floor(free.date.getTime() / 1000);
  const base: Record<string, string> = {
    ...(opts.metadata ?? {}),
    audience: opts.audience,
    vsn_key: opts.audience,
    free_period: free.provisional ? "provisional" : "launch_based",
    free_period_ends_at: free.date.toISOString(),
  };

  if (opts.audience === "expert" || plan === "flat") {
    const priceId = priceIdFor(opts.audience === "expert" ? "expert_growth_monthly" : "partner_growth_monthly");
    const subscription = await stripe.subscriptions.create({
      customer: opts.customerId,
      items: [{ price: priceId }],
      trial_end: freeSec,
      default_payment_method: opts.paymentMethodId,
      trial_settings: { end_behavior: { missing_payment_method: "pause" } },
      payment_settings: { save_default_payment_method: "on_subscription" },
      metadata: { ...base, rate: opts.audience === "expert" ? (opts.founding ? "founding_expert" : "website_expert") : "flat" },
    });
    return { subscription, priceId, scheduleId: null, freePeriodEndsAt: free.date.toISOString(), standardStartsAt: null, provisional: free.provisional };
  }

  const launchPriceId = priceIdFor("partner_growth_monthly");
  const standardPriceId = priceIdFor("partner_founding_standard_monthly");
  const standardStart = companyStandardStartsAt(free.date);
  const ladderBase = { ...base, rate: "ladder", standard_starts_at: standardStart.toISOString() };
  const schedule = await stripe.subscriptionSchedules.create({
    customer: opts.customerId,
    start_date: "now",
    end_behavior: "release",
    default_settings: { default_payment_method: opts.paymentMethodId, collection_method: "charge_automatically" },
    phases: [
      { items: [{ price: launchPriceId }], trial_end: freeSec, end_date: Math.floor(standardStart.getTime() / 1000), metadata: { ...ladderBase, plan: "partner_growth_monthly" } },
      { items: [{ price: standardPriceId }], metadata: { ...ladderBase, plan: "partner_founding_standard_monthly" } },
    ],
    metadata: ladderBase,
  });
  const subId = typeof schedule.subscription === "string" ? schedule.subscription : schedule.subscription?.id;
  if (!subId) throw new Error("Schedule did not create a subscription.");
  const subscription = await stripe.subscriptions.retrieve(subId);
  return { subscription, priceId: launchPriceId, scheduleId: schedule.id, freePeriodEndsAt: free.date.toISOString(), standardStartsAt: standardStart.toISOString(), provisional: free.provisional };
}

export type BillingAccess = { allowed: true } | { allowed: false; reason: "subscription_required" | "past_due" | "paused" | "canceled"; title: string; message: string; cta: string };

export function checkBillingAccess(opts: { subscriptionStatus: string | null; hasSubscription: boolean; currentPeriodEnd?: string | null; billingExempt?: boolean; agreementSigned: boolean }): BillingAccess {
  if (opts.billingExempt) return { allowed: true };
  if (!opts.agreementSigned || !opts.hasSubscription) {
    return { allowed: false, reason: "subscription_required", title: "One more step: accept your agreement and save a card", message: "Nothing is charged today. Your first charge lands when your free founding months end, and we remind you 7 days before.", cta: "Accept and save card" };
  }
  const s = opts.subscriptionStatus;
  if (s === "active" || s === "trialing") return { allowed: true };
  if (s === "past_due") {
    const end = opts.currentPeriodEnd ? new Date(opts.currentPeriodEnd).getTime() : 0;
    if (end && Date.now() - end <= PAYMENT_GRACE_DAYS * 86400000) return { allowed: true };
    return { allowed: false, reason: "past_due", title: "Payment failed on your last invoice", message: "Update your payment method to keep your listing live.", cta: "Update payment method" };
  }
  if (s === "paused" || s === "unpaid") return { allowed: false, reason: "paused", title: "Your listing is paused", message: "Billing needs attention before you can publish again.", cta: "Fix billing" };
  return { allowed: false, reason: "canceled", title: "Your subscription ended", message: "Reply to any of our emails to rejoin the network.", cta: "Contact us" };
}

export async function deleteCustomer(customerId: string): Promise<void> {
  await getStripe().customers.del(customerId);
}

/** Mirror a Stripe subscription onto an experts or partners row (webhook + sync). */
export function subscriptionPatch(sub: Stripe.Subscription, card?: { brand: string | null; last4: string | null }): Record<string, unknown> {
  const patch: Record<string, unknown> = {
    stripe_subscription_id: sub.id,
    stripe_price_id: sub.items.data[0]?.price.id ?? null,
    subscription_status: sub.status,
    subscription_interval: sub.items.data[0]?.price.recurring?.interval ?? "month",
    current_period_end: periodEndOf(sub),
    cancel_at_period_end: !!sub.cancel_at_period_end,
    canceled_at: sub.canceled_at ? new Date(sub.canceled_at * 1000).toISOString() : null,
  };
  if (sub.trial_end) patch.free_period_ends_at = new Date(sub.trial_end * 1000).toISOString();
  if (card) {
    patch.card_brand = card.brand;
    patch.card_last4 = card.last4;
  }
  return patch;
}
