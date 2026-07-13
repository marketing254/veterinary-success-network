import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { requireAdmin, isResponse } from "@/lib/adminApi";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const session = await requireAdmin();
  if (isResponse(session)) return session;

  const db = supabaseAdmin();
  const [counts, reservations, experts, partners, kits] = await Promise.all([
    db.from("signup_counts").select("*").maybeSingle(),
    db.from("member_reservations").select("id, position, full_name, practice_name, plan, status, created_at").order("position", { ascending: false }).limit(6),
    db.from("expert_applications").select("id, full_name, company, status, created_at").order("created_at", { ascending: false }).limit(6),
    db.from("partner_applications").select("id, company_name, category, status, created_at").order("created_at", { ascending: false }).limit(6),
    db.from("free_kit_signups").select("id, full_name, practice_name, status, created_at").order("created_at", { ascending: false }).limit(6),
  ]);

  return NextResponse.json({
    ok: true,
    counts: counts.data || {},
    recent: {
      reservations: reservations.data || [],
      experts: experts.data || [],
      partners: partners.data || [],
      freeKit: kits.data || [],
    },
  });
}
