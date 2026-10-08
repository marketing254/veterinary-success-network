import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { sendTrialEndingReminder } from "@/lib/email/billingEmails";
import { FIRST_CHARGE_REMINDER_DAYS, isBillingBypassed, normalizeProviderRate } from "@/lib/providerBilling";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;

const DAY = 86400000;

/**
 * Daily Vercel cron (vercel.json, 14:00 UTC). Sends the ONE "free founding months
 * end in 7 days" email to every trialing expert and partner whose free period ends
 * within 7 days and who has not been reminded. Stamped on the row, so re-runs are safe.
 * Production requires CRON_SECRET (Vercel adds the bearer); locally the route runs open.
 */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (process.env.NODE_ENV === "production") {
    if (!secret) return NextResponse.json({ ok: false, error: "CRON_SECRET not configured." }, { status: 503 });
    if (req.headers.get("authorization") !== `Bearer ${secret}`) return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
  }
  const db = supabaseAdmin();
  const now = Date.now();
  const inWindow = (iso: string | null) => !!iso && new Date(iso).getTime() > now && new Date(iso).getTime() <= now + FIRST_CHARGE_REMINDER_DAYS * DAY;
  const daysLeft = (iso: string) => Math.max(1, Math.ceil((new Date(iso).getTime() - now) / DAY));
  const sent: string[] = [];

  const { data: experts } = await db.from("experts").select("id, full_name, email, free_period_ends_at, billing_exempt, free_period_reminder_sent_at").eq("subscription_status", "trialing").is("free_period_reminder_sent_at", null);
  for (const e of experts ?? []) {
    if (e.billing_exempt || isBillingBypassed(e.email) || !inWindow(e.free_period_ends_at)) continue;
    try {
      await sendTrialEndingReminder({ role: "expert", to: e.email, name: e.full_name, daysLeft: daysLeft(e.free_period_ends_at!), trialEnd: new Date(e.free_period_ends_at!) });
      await db.from("experts").update({ free_period_reminder_sent_at: new Date().toISOString() }).eq("id", e.id);
      sent.push(e.email);
    } catch (err) {
      console.error("reminder failed", e.email, err);
    }
  }
  const { data: partners } = await db.from("partners").select("id, contact_name, contact_email, billing_email, billing_plan, free_period_ends_at, free_period_reminder_sent_at").eq("subscription_status", "trialing").is("free_period_reminder_sent_at", null).is("billing_parent_id", null);
  for (const p of partners ?? []) {
    if (isBillingBypassed(p.contact_email) || !inWindow(p.free_period_ends_at)) continue;
    try {
      await sendTrialEndingReminder({ role: "partner", to: p.billing_email || p.contact_email, name: p.contact_name, daysLeft: daysLeft(p.free_period_ends_at!), trialEnd: new Date(p.free_period_ends_at!), rate: normalizeProviderRate(p.billing_plan) });
      await db.from("partners").update({ free_period_reminder_sent_at: new Date().toISOString() }).eq("id", p.id);
      sent.push(p.contact_email);
    } catch (err) {
      console.error("reminder failed", p.contact_email, err);
    }
  }
  return NextResponse.json({ ok: true, sent });
}
