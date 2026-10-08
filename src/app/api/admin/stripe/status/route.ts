import { NextResponse } from "next/server";
import { requireAdmin, isResponse } from "@/lib/adminApi";
import { getStripe, isStripeConfigured, PRICE_ENV, appOrigin } from "@/lib/stripe";
import { MEMBER_LAUNCH_ENABLED } from "@/lib/launch";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const REQUIRED_EVENTS = ["customer.subscription.updated", "customer.subscription.deleted", "invoice.payment_failed", "customer.subscription.trial_will_end", "checkout.session.completed"];

/** Read-only check of keys, prices, the webhook endpoint for this origin and the launch flags. */
export async function GET() {
  const session = await requireAdmin();
  if (isResponse(session)) return session;
  const sk = process.env.STRIPE_SECRET_KEY || "";
  const pk = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || "";
  const out: Record<string, unknown> = {
    ok: true,
    configured: isStripeConfigured(),
    secretMode: sk.startsWith("sk_live_") || sk.startsWith("rk_live_") ? "live" : sk ? "test" : "missing",
    publishableMode: pk.startsWith("pk_live_") ? "live" : pk ? "test" : "missing",
    webhookSecret: !!process.env.STRIPE_WEBHOOK_SECRET,
    cronSecret: !!process.env.CRON_SECRET,
    launchEnabled: MEMBER_LAUNCH_ENABLED,
    launchDate: process.env.MEMBER_LAUNCH_DATE || null,
    origin: appOrigin(),
    prices: [] as unknown[],
    webhook: null as unknown,
  };
  if (!isStripeConfigured()) return NextResponse.json(out);
  const stripe = getStripe();
  const prices: unknown[] = [];
  for (const [key, env] of Object.entries(PRICE_ENV)) {
    const id = process.env[env];
    if (!id) {
      prices.push({ key, env, id: null, ok: false, note: "not set" });
      continue;
    }
    try {
      const p = await stripe.prices.retrieve(id);
      prices.push({ key, env, id, ok: p.active, amount: (p.unit_amount ?? 0) / 100, interval: p.recurring?.interval, note: p.active ? "" : "inactive" });
    } catch {
      prices.push({ key, env, id, ok: false, note: "not found in this Stripe account/mode" });
    }
  }
  out.prices = prices;
  try {
    const url = `${appOrigin()}/api/stripe/webhook`;
    const list = await stripe.webhookEndpoints.list({ limit: 100 });
    const ep = list.data.find((w) => w.url === url);
    out.webhook = ep
      ? { url, found: true, status: ep.status, events: ep.enabled_events, missing: REQUIRED_EVENTS.filter((e) => !ep.enabled_events.includes(e) && !ep.enabled_events.includes("*")), paidEvent: ep.enabled_events.some((e) => e === "invoice.paid" || e === "invoice.payment_succeeded" || e === "*") }
      : { url, found: false, missing: REQUIRED_EVENTS, paidEvent: false };
  } catch (err) {
    out.webhook = { error: err instanceof Error ? err.message : String(err) };
  }
  return NextResponse.json(out);
}
