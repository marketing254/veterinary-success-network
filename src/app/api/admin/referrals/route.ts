import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { requireAdmin, isResponse, logAction } from "@/lib/adminApi";
import { clean } from "@/lib/signup";
import { siteOrigin } from "@/lib/referral";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET codes with counts + signups · PATCH { id, action: mark_paid | mark_converted | unmark_paid } on a signup */
export async function GET() {
  const session = await requireAdmin();
  if (isResponse(session)) return session;
  const db = supabaseAdmin();
  const [{ data: codes }, { data: signups }] = await Promise.all([
    db.from("referral_codes").select("id, code, slug, active, created_at, expert_id, partner_id, experts(full_name, display_name, email), partners(company_name, contact_email)").order("created_at", { ascending: false }),
    db.from("referral_signups").select("id, code_id, email, member_id, reservation_id, converted_at, payout_cents, paid_out_at, created_at").order("created_at", { ascending: false }).limit(1000),
  ]);
  const byCode: Record<string, { signups: number; converted: number; due: number; paid: number }> = {};
  for (const s of signups ?? []) {
    const b = (byCode[s.code_id] ||= { signups: 0, converted: 0, due: 0, paid: 0 });
    b.signups += 1;
    if (s.converted_at) b.converted += 1;
    if (s.converted_at && !s.paid_out_at) b.due += s.payout_cents;
    if (s.paid_out_at) b.paid += s.payout_cents;
  }
  const origin = siteOrigin();
  const rows = (codes ?? []).map((c) => {
    const e = (Array.isArray(c.experts) ? c.experts[0] : c.experts) as { full_name: string; display_name: string | null; email: string } | null;
    const p = (Array.isArray(c.partners) ? c.partners[0] : c.partners) as { company_name: string; contact_email: string } | null;
    return { id: c.id, code: c.code, slug: c.slug, active: c.active, link: c.slug ? `${origin}/${c.slug}` : `${origin}/join?ref=${c.code}`, owner: e ? e.display_name || e.full_name : p?.company_name ?? "?", ownerKind: e ? "expert" : "partner", ownerEmail: e?.email ?? p?.contact_email, ...(byCode[c.id] ?? { signups: 0, converted: 0, due: 0, paid: 0 }) };
  });
  return NextResponse.json({ ok: true, rows, signups: signups ?? [] });
}

export async function PATCH(req: NextRequest) {
  const session = await requireAdmin();
  if (isResponse(session)) return session;
  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  const id = clean(body?.id, 60);
  const action = clean(body?.action, 20);
  const now = new Date().toISOString();
  const patch = action === "mark_paid" ? { paid_out_at: now } : action === "unmark_paid" ? { paid_out_at: null } : action === "mark_converted" ? { converted_at: now } : null;
  if (!patch) return NextResponse.json({ ok: false, error: "Unknown action." }, { status: 400 });
  const { error } = await supabaseAdmin().from("referral_signups").update(patch).eq("id", id);
  if (error) return NextResponse.json({ ok: false, error: "Update failed." }, { status: 500 });
  await logAction(session.email, "referral_signup", id, action);
  return NextResponse.json({ ok: true });
}
