import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/health: which required settings exist on THIS deployment, plus a few
 * live checks (Supabase reachable, agreements bucket, billing columns, Stripe key mode).
 * Booleans and short labels only, never secret values. Safe to open in a browser.
 */
const REQUIRED = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "IP_HASH_SALT",
  "NEXT_PUBLIC_SITE_URL",
  "SMTP_HOST",
  "SMTP_USER",
  "SMTP_PASS",
];
const STRIPE = [
  "STRIPE_SECRET_KEY",
  "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY",
  "STRIPE_WEBHOOK_SECRET",
  "STRIPE_PRICE_FOUNDING_MONTHLY",
  "STRIPE_PRICE_FOUNDING_ANNUAL",
  "STRIPE_PRICE_FOUNDING_ANNUAL_PROMO",
  "STRIPE_PRICE_STANDARD_MONTHLY",
  "STRIPE_PRICE_STANDARD_ANNUAL",
  "STRIPE_PRICE_PARTNER_GROWTH_MONTHLY",
  "STRIPE_PRICE_PARTNER_GROWTH_ANNUAL",
  "STRIPE_PRICE_PARTNER_FOUNDING_STANDARD_MONTHLY",
  "STRIPE_PRICE_PARTNER_FOUNDING_STANDARD_ANNUAL",
  "STRIPE_PRICE_EXPERT_GROWTH_MONTHLY",
  "STRIPE_PRICE_EXPERT_GROWTH_ANNUAL",
];
const OPTIONAL = ["OTP_TRANSPORT", "EMAIL_SANDBOX", "TEAM_DISTRIBUTION_LIST", "MEMBER_LAUNCH_ENABLED", "CRON_SECRET"];

const has = (k: string) => !!(process.env[k] && process.env[k]!.trim());
const flags = (keys: string[]) => Object.fromEntries(keys.map((k) => [k, has(k)]));

async function liveChecks() {
  const out: Record<string, string> = {};
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    out.supabase = "skipped (no url/service key)";
    return out;
  }
  const db = createClient(url, key, { auth: { persistSession: false } });
  try {
    const { error } = await db.from("partners").select("id,stripe_customer_id,stripe_schedule_id,billing_plan,free_period_ends_at").limit(1);
    out.partnersBillingColumns = error ? `FAIL: ${error.message}` : "ok";
  } catch (e) {
    out.partnersBillingColumns = `FAIL: ${(e as Error).message}`;
  }
  try {
    const { error } = await db.from("experts").select("id,stripe_customer_id,billing_exempt,free_period_ends_at").limit(1);
    out.expertsBillingColumns = error ? `FAIL: ${error.message}` : "ok";
  } catch (e) {
    out.expertsBillingColumns = `FAIL: ${(e as Error).message}`;
  }
  try {
    const { data, error } = await db.storage.listBuckets();
    const names = new Set((data ?? []).map((b) => b.name));
    out.storageBuckets = error
      ? `FAIL: ${error.message}`
      : ["agreements", "avatars", "partner-logos", "partner-media", "expert-resources"].map((b) => `${b}:${names.has(b) ? "ok" : "MISSING"}`).join(" ");
  } catch (e) {
    out.storageBuckets = `FAIL: ${(e as Error).message}`;
  }
  const sk = process.env.STRIPE_SECRET_KEY ?? "";
  const pk = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? "";
  const mode = (k: string) => (k.includes("_live_") ? "live" : k.includes("_test_") ? "test" : k ? "unknown" : "missing");
  out.stripeKeyMode = `secret:${mode(sk)} publishable:${mode(pk)}${mode(sk) !== mode(pk) ? " (MISMATCH)" : ""}`;
  return out;
}

export async function GET() {
  const missing = REQUIRED.filter((k) => !has(k));
  const stripeMissing = STRIPE.filter((k) => !has(k));
  const checks = await liveChecks();
  const failing = Object.entries(checks).filter(([, v]) => v.includes("FAIL") || v.includes("MISSING") || v.includes("MISMATCH")).map(([k]) => k);
  return NextResponse.json({
    ok: missing.length === 0 && stripeMissing.length === 0 && failing.length === 0,
    env: process.env.VERCEL_ENV || process.env.NODE_ENV || "unknown",
    siteUrl: process.env.NEXT_PUBLIC_SITE_URL || null,
    required: flags(REQUIRED),
    stripe: flags(STRIPE),
    optional: flags(OPTIONAL),
    checks,
    missing: [...missing, ...stripeMissing],
    failing,
    hint:
      missing.length || stripeMissing.length
        ? "Add the missing variables in Vercel (Settings → Environment Variables, tick this environment) and Redeploy."
        : failing.length
          ? "Environment variables are present. Fix the failing live checks (run pending Supabase migrations on this project, or match Stripe key modes)."
          : "All settings present and live checks pass.",
  });
}
