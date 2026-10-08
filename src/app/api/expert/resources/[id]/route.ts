import { NextRequest, NextResponse } from "next/server";
import { requireExpert } from "@/lib/auth/guards";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { serverError, apiError } from "@/lib/api/errorResponse";
import { clean } from "@/lib/signup";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** PATCH: edit title/description while pending or needs_changes (resubmits). DELETE: archive own kit. */
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const guard = await requireExpert();
  if (!guard.ok) return guard.response;
  const route = "PATCH /api/expert/resources/[id]";
  try {
    const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
    if (!body) return apiError.badRequest("Invalid request.", route);
    const db = supabaseAdmin();
    const { data: row } = await db.from("expert_resources").select("id, status").eq("id", params.id).eq("expert_id", guard.expertId).maybeSingle();
    if (!row) return apiError.notFound(route);
    if (!["pending_review", "needs_changes", "draft"].includes(row.status)) {
      return apiError.validation("Approved kits are edited by the team. Reply to your approval email to request a change.", route);
    }
    const patch: Record<string, unknown> = {};
    if ("title" in body) {
      const t = clean(body.title, 200);
      if (!t) return apiError.validation("Title cannot be empty.", route);
      patch.title = t;
    }
    if ("description" in body) patch.description = clean(body.description, 4000) || null;
    if (row.status === "needs_changes") {
      patch.status = "pending_review";
      patch.submitted_at = new Date().toISOString();
    }
    const { error } = await db.from("expert_resources").update(patch).eq("id", row.id);
    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (err) {
    return serverError(err, { route });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const guard = await requireExpert();
  if (!guard.ok) return guard.response;
  try {
    const { error } = await supabaseAdmin()
      .from("expert_resources")
      .update({ status: "archived" })
      .eq("id", params.id)
      .eq("expert_id", guard.expertId);
    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (err) {
    return serverError(err, { route: "DELETE /api/expert/resources/[id]" });
  }
}
