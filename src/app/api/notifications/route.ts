import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { serverError, apiError } from "@/lib/api/errorResponse";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET  /api/notifications?audience=expert|partner   latest 30 for the signed-in user
 * PATCH /api/notifications { ids?: string[], all?: true }  mark read
 */
async function resolveOwner(audience: string) {
  const {
    data: { user },
  } = await supabaseServer().auth.getUser();
  if (!user?.email) return null;
  const db = supabaseAdmin();
  if (audience === "partner") {
    const { data } = await db.from("partners").select("id").ilike("contact_email", user.email).maybeSingle();
    return data ? { col: "partner_id", id: data.id as string } : null;
  }
  const { data } = await db.from("experts").select("id").ilike("email", user.email).maybeSingle();
  return data ? { col: "expert_id", id: data.id as string } : null;
}

export async function GET(req: NextRequest) {
  try {
    const audience = new URL(req.url).searchParams.get("audience") || "expert";
    const owner = await resolveOwner(audience);
    if (!owner) return apiError.unauthorized("GET /api/notifications");
    const { data, error } = await supabaseAdmin()
      .from("notifications")
      .select("id, kind, title, body, link, read_at, created_at")
      .eq(owner.col, owner.id)
      .order("created_at", { ascending: false })
      .limit(30);
    if (error) throw error;
    const unread = (data ?? []).filter((n) => !n.read_at).length;
    return NextResponse.json({ ok: true, rows: data ?? [], unread });
  } catch (err) {
    return serverError(err, { route: "GET /api/notifications" });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => ({}))) as { ids?: string[]; all?: boolean; audience?: string };
    const owner = await resolveOwner(body.audience || "expert");
    if (!owner) return apiError.unauthorized("PATCH /api/notifications");
    let q = supabaseAdmin().from("notifications").update({ read_at: new Date().toISOString() }).eq(owner.col, owner.id).is("read_at", null);
    if (!body.all) {
      const ids = (body.ids ?? []).filter((s) => typeof s === "string").slice(0, 100);
      if (!ids.length) return NextResponse.json({ ok: true });
      q = q.in("id", ids);
    }
    const { error } = await q;
    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (err) {
    return serverError(err, { route: "PATCH /api/notifications" });
  }
}
