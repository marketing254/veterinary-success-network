import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { requireAdmin, isResponse, logAction } from "@/lib/adminApi";
import { clean } from "@/lib/signup";
import { notify } from "@/lib/notify";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET list · POST { offer_id, member_display, member_location?, amount_saved?, redeemed_on?, notes? } · PATCH { id, status } */
export async function GET() {
  const session = await requireAdmin();
  if (isResponse(session)) return session;
  const db = supabaseAdmin();
  const [{ data: rows }, { data: offers }] = await Promise.all([
    db.from("partner_redemptions").select("id, partner_id, offer_id, member_display, member_location, amount_saved, status, redeemed_on, notes, created_by, created_at, partners(company_name), partner_offers(headline, promo_code)").order("redeemed_on", { ascending: false }).limit(500),
    db.from("partner_offers").select("id, headline, promo_code, partner_id, partners(company_name)").eq("review_status", "approved").order("created_at", { ascending: false }),
  ]);
  const flat = (rows ?? []).map((r) => {
    const p = (Array.isArray(r.partners) ? r.partners[0] : r.partners) as { company_name: string } | null;
    const o = (Array.isArray(r.partner_offers) ? r.partner_offers[0] : r.partner_offers) as { headline: string; promo_code: string | null } | null;
    return { ...r, partners: undefined, partner_offers: undefined, company: p?.company_name, offer: o?.headline, promo_code: o?.promo_code };
  });
  const offerOpts = (offers ?? []).map((o) => {
    const p = (Array.isArray(o.partners) ? o.partners[0] : o.partners) as { company_name: string } | null;
    return { id: o.id, label: `${p?.company_name ?? "Partner"}: ${o.headline}${o.promo_code ? ` (${o.promo_code})` : ""}`, partner_id: o.partner_id };
  });
  return NextResponse.json({ ok: true, rows: flat, offers: offerOpts });
}

export async function POST(req: NextRequest) {
  const session = await requireAdmin();
  if (isResponse(session)) return session;
  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  const offerId = clean(body?.offer_id, 60);
  const member = clean(body?.member_display, 120);
  if (!offerId || !member) return NextResponse.json({ ok: false, error: "Offer and member are required." }, { status: 400 });
  const db = supabaseAdmin();
  const { data: offer } = await db.from("partner_offers").select("id, partner_id, headline").eq("id", offerId).maybeSingle();
  if (!offer) return NextResponse.json({ ok: false, error: "Offer not found." }, { status: 404 });
  const amount = Number(body?.amount_saved);
  const redeemed = clean(body?.redeemed_on, 10);
  const { data, error } = await db
    .from("partner_redemptions")
    .insert({ offer_id: offer.id, partner_id: offer.partner_id, member_display: member, member_location: clean(body?.member_location, 120) || null, amount_saved: Number.isFinite(amount) && amount >= 0 ? amount : null, redeemed_on: /^\d{4}-\d{2}-\d{2}$/.test(redeemed) ? redeemed : new Date().toISOString().slice(0, 10), notes: clean(body?.notes, 1000) || null, status: "confirmed", created_by: session.email })
    .select("id")
    .single();
  if (error) return NextResponse.json({ ok: false, error: "Insert failed." }, { status: 500 });
  await db.from("partner_events").insert({ partner_id: offer.partner_id, kind: "redemption", ref_id: data.id });
  await notify({ audience: "partner", partnerId: offer.partner_id, kind: "redemption", title: `A member redeemed: ${offer.headline}`, body: member, link: "/partner/redemptions" });
  await logAction(session.email, "redemption", data.id, "log", `${member} · ${offer.headline}`);
  return NextResponse.json({ ok: true, id: data.id });
}

export async function PATCH(req: NextRequest) {
  const session = await requireAdmin();
  if (isResponse(session)) return session;
  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  const id = clean(body?.id, 60);
  const status = clean(body?.status, 20);
  if (!["pending", "confirmed", "disputed", "voided"].includes(status)) return NextResponse.json({ ok: false, error: "Unknown status." }, { status: 400 });
  const { error } = await supabaseAdmin().from("partner_redemptions").update({ status }).eq("id", id);
  if (error) return NextResponse.json({ ok: false, error: "Update failed." }, { status: 500 });
  await logAction(session.email, "redemption", id, `set_${status}`);
  return NextResponse.json({ ok: true });
}
