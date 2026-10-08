import { NextResponse } from "next/server";
import { requirePartner } from "@/lib/auth/guards";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { serverError } from "@/lib/api/errorResponse";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET /api/partner/redemptions: members who used an offer (anonymised display). */
export async function GET() {
  const guard = await requirePartner();
  if (!guard.ok) return guard.response;
  try {
    const { data, error } = await supabaseAdmin()
      .from("partner_redemptions")
      .select("id, member_display, member_location, amount_saved, status, redeemed_on, notes, created_at, partner_offers(headline, promo_code)")
      .eq("partner_id", guard.partnerId)
      .order("redeemed_on", { ascending: false })
      .limit(500);
    if (error) throw error;
    const rows = (data ?? []).map((r) => {
      const o = (Array.isArray(r.partner_offers) ? r.partner_offers[0] : r.partner_offers) as { headline: string; promo_code: string | null } | null;
      return { id: r.id, member: r.member_display || "Member", location: r.member_location, amount_saved: r.amount_saved, status: r.status, redeemed_on: r.redeemed_on, notes: r.notes, offer: o?.headline ?? "Offer", promo_code: o?.promo_code ?? null };
    });
    const total = rows.filter((r) => r.status === "confirmed").reduce((s, r) => s + Number(r.amount_saved || 0), 0);
    return NextResponse.json({ ok: true, rows, totalSaved: total });
  } catch (err) {
    return serverError(err, { route: "GET /api/partner/redemptions" });
  }
}
