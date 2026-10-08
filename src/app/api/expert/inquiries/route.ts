import { NextRequest, NextResponse } from "next/server";
import { requireExpert } from "@/lib/auth/guards";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { serverError } from "@/lib/api/errorResponse";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET /api/expert/inquiries?status=open|answered|closed|all */
export async function GET(req: NextRequest) {
  const guard = await requireExpert();
  if (!guard.ok) return guard.response;
  try {
    const status = new URL(req.url).searchParams.get("status") || "all";
    let q = supabaseAdmin()
      .from("expert_inquiries")
      .select("id, from_name, from_email, practice_name, subject, body, source, status, reply_count, created_at, updated_at")
      .eq("expert_id", guard.expertId)
      .order("updated_at", { ascending: false })
      .limit(200);
    if (status !== "all") q = q.eq("status", status);
    const { data, error } = await q;
    if (error) throw error;
    return NextResponse.json({ ok: true, rows: data ?? [] });
  } catch (err) {
    return serverError(err, { route: "GET /api/expert/inquiries" });
  }
}
