import { NextResponse } from "next/server";
import { requirePartner } from "@/lib/auth/guards";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { serverError } from "@/lib/api/errorResponse";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const KINDS = ["profile_view", "offer_view", "catalog_view", "booking_click", "website_click", "inquiry", "redemption"] as const;

/** GET /api/partner/analytics: last 30 / 90 day counts by kind, plus a 12-week series of profile views. */
export async function GET() {
  const guard = await requirePartner();
  if (!guard.ok) return guard.response;
  try {
    const db = supabaseAdmin();
    const since90 = new Date(Date.now() - 90 * 86400000);
    const since30 = new Date(Date.now() - 30 * 86400000);
    const { data, error } = await db
      .from("partner_events")
      .select("kind, created_at")
      .eq("partner_id", guard.partnerId)
      .gte("created_at", since90.toISOString())
      .limit(20000);
    if (error) throw error;
    const rows = data ?? [];
    const totals30: Record<string, number> = {};
    const totals90: Record<string, number> = {};
    for (const k of KINDS) {
      totals30[k] = 0;
      totals90[k] = 0;
    }
    const weeks: number[] = new Array(12).fill(0);
    for (const r of rows) {
      const t = new Date(r.created_at).getTime();
      totals90[r.kind] = (totals90[r.kind] ?? 0) + 1;
      if (t >= since30.getTime()) totals30[r.kind] = (totals30[r.kind] ?? 0) + 1;
      if (r.kind === "profile_view") {
        const w = Math.min(11, Math.floor((Date.now() - t) / (7 * 86400000)));
        weeks[11 - w] += 1;
      }
    }
    const [{ count: inquiries }, { count: redemptions }] = await Promise.all([
      db.from("partner_inquiries").select("id", { count: "exact", head: true }).eq("partner_id", guard.partnerId),
      db.from("partner_redemptions").select("id", { count: "exact", head: true }).eq("partner_id", guard.partnerId).eq("status", "confirmed"),
    ]);
    return NextResponse.json({ ok: true, totals30, totals90, weeks, lifetime: { inquiries: inquiries ?? 0, redemptions: redemptions ?? 0 } });
  } catch (err) {
    return serverError(err, { route: "GET /api/partner/analytics" });
  }
}
