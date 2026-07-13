import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { requireAdmin, isResponse } from "@/lib/adminApi";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const session = await requireAdmin();
  if (isResponse(session)) return session;

  const db = supabaseAdmin();
  const [actions, auth] = await Promise.all([
    db.from("review_actions").select("*").order("created_at", { ascending: false }).limit(200),
    db.from("auth_audit").select("*").order("created_at", { ascending: false }).limit(200),
  ]);

  return NextResponse.json({
    ok: true,
    actions: actions.data || [],
    auth: auth.data || [],
  });
}
