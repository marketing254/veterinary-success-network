import { NextRequest, NextResponse } from "next/server";
import { requireExpert } from "@/lib/auth/guards";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { serverError, apiError } from "@/lib/api/errorResponse";
import { clean } from "@/lib/signup";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET comments · POST { action: "react" | "unreact" | "comment", content? } · DELETE own post */
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const guard = await requireExpert();
  if (!guard.ok) return guard.response;
  try {
    const { data, error } = await supabaseAdmin()
      .from("post_comments")
      .select("id, author_kind, author_display_name, author_subtitle, content, created_at, author_auth_user_id")
      .eq("post_id", params.id)
      .is("hidden_at", null)
      .order("created_at", { ascending: true })
      .limit(200);
    if (error) throw error;
    const rows = (data ?? []).map((c) => ({ ...c, mine: c.author_auth_user_id === guard.userId, author_auth_user_id: undefined }));
    return NextResponse.json({ ok: true, rows });
  } catch (err) {
    return serverError(err, { route: "GET /api/expert/posts/[id]" });
  }
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const guard = await requireExpert();
  if (!guard.ok) return guard.response;
  const route = "POST /api/expert/posts/[id]";
  try {
    const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
    if (!body) return apiError.badRequest("Invalid request.", route);
    const action = clean(body.action, 20);
    const db = supabaseAdmin();
    const { data: post } = await db.from("expert_posts").select("id").eq("id", params.id).eq("status", "published").maybeSingle();
    if (!post) return apiError.notFound(route);
    const { data: me } = await db.from("experts").select("display_name, full_name, specialty").eq("id", guard.expertId).maybeSingle();
    const name = me?.display_name || me?.full_name || guard.fullName;

    if (action === "react") {
      const { error } = await db
        .from("post_reactions")
        .upsert({ post_id: post.id, author_auth_user_id: guard.userId, author_kind: "expert", author_display_name: name, kind: "heart" }, { onConflict: "post_id,author_auth_user_id", ignoreDuplicates: true });
      if (error) throw error;
      return NextResponse.json({ ok: true });
    }
    if (action === "unreact") {
      const { error } = await db.from("post_reactions").delete().eq("post_id", post.id).eq("author_auth_user_id", guard.userId);
      if (error) throw error;
      return NextResponse.json({ ok: true });
    }
    if (action === "comment") {
      if (!guard.agreementSigned) return apiError.validation("Accept your expert agreement before commenting.", route);
      const content = clean(body.content, 2000);
      if (!content) return apiError.validation("Write a comment first.", route);
      const { data, error } = await db
        .from("post_comments")
        .insert({ post_id: post.id, author_auth_user_id: guard.userId, author_kind: "expert", author_display_name: name, author_subtitle: me?.specialty || "Expert", content })
        .select("id")
        .single();
      if (error) throw error;
      return NextResponse.json({ ok: true, id: data.id });
    }
    return apiError.badRequest("Unknown action.", route);
  } catch (err) {
    return serverError(err, { route });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const guard = await requireExpert();
  if (!guard.ok) return guard.response;
  try {
    const { error } = await supabaseAdmin()
      .from("expert_posts")
      .update({ status: "deleted" })
      .eq("id", params.id)
      .eq("expert_id", guard.expertId);
    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (err) {
    return serverError(err, { route: "DELETE /api/expert/posts/[id]" });
  }
}
