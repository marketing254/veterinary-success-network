import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/health: which required settings exist on THIS deployment.
 * Booleans only, never values. Safe to open in a browser on any environment.
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
const OPTIONAL = [
  "OTP_TRANSPORT",
  "EMAIL_SANDBOX",
  "TEAM_DISTRIBUTION_LIST",
  "STRIPE_SECRET_KEY",
  "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY",
  "STRIPE_WEBHOOK_SECRET",
  "STRIPE_PRICE_EXPERT_GROWTH_MONTHLY",
  "MEMBER_LAUNCH_ENABLED",
  "CRON_SECRET",
];

export async function GET() {
  const has = (k: string) => !!(process.env[k] && process.env[k]!.trim());
  const missing = REQUIRED.filter((k) => !has(k));
  return NextResponse.json({
    ok: missing.length === 0,
    env: process.env.VERCEL_ENV || process.env.NODE_ENV || "unknown",
    siteUrl: process.env.NEXT_PUBLIC_SITE_URL || null,
    required: Object.fromEntries(REQUIRED.map((k) => [k, has(k)])),
    optional: Object.fromEntries(OPTIONAL.map((k) => [k, has(k)])),
    missing,
    hint: missing.length ? "Add the missing variables in Vercel (Settings → Environment Variables, tick this environment) and Redeploy." : "All required settings present.",
  });
}
