import { NextResponse } from "next/server";
import { isStripeConfigured } from "@/lib/stripe";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Public: is card capture live? The agreement pages switch between sign-only and sign-and-pay on this. */
export async function GET() {
  const on = isStripeConfigured();
  return NextResponse.json({ ok: true, stripe: on, publishableKey: on ? process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY : null, mode: on ? (process.env.STRIPE_SECRET_KEY || "").startsWith("sk_live_") ? "live" : "test" : null });
}
