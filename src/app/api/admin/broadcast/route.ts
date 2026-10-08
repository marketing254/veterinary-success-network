import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { requireAdmin, isResponse, logAction } from "@/lib/adminApi";
import { clean } from "@/lib/signup";
import { normalizeWebUrl } from "@/lib/url";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Network feed moderation + admin posts. GET all posts · POST { content, link_url? } as the team · PATCH { id, action: hide|unhide|delete, reason? } */
export async function GET() {
  const session = await requireAdmin();
  if (isResponse(session)) return session;
  const { data, error } = await supabaseAdmin()
    .from("expert_posts")
    .select("id, author_kind, admin_email, content, link_url, status, published_at, hidden_at, hidden_reason, reaction_count, comment_count, created_at, experts(full_name, display_name), partners(company_name)")
    .neq("status", "deleted")
    .order("created_at", { ascending: false })
    .limit(300);
  if (error) return NextResponse.json({ ok: false, error: "Query failed." }, { status: 500 });
  const rows = (data ?? []).map((r) => {
    const e = (Array.isArray(r.experts) ? r.experts[0] : r.experts) as { full_name: string; display_name: string | null } | null;
    const p = (Array.isArray(r.partners) ? r.partners[0] : r.partners) as { company_name: string } | null;
    return { ...r, experts: undefined, partners: undefined, author: r.author_kind === "admin" ? `VSN team (${r.admin_email ?? ""})` : r.author_kind === "partner" ? p?.company_name ?? "Partner" : e?.display_name || e?.full_name || "Expert" };
  });
  return NextResponse.json({ ok: true, rows });
}

export async function POST(req: NextRequest) {
  const session = await requireAdmin();
  if (isResponse(session)) return session;
  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  const content = clean(body?.content, 4000);
  if (content.length < 2) return NextResponse.json({ ok: false, error: "Write something first." }, { status: 400 });
  const linkRaw = clean(body?.link_url, 500);
  const link_url = linkRaw ? normalizeWebUrl(linkRaw) : null;
  if (linkRaw && !link_url) return NextResponse.json({ ok: false, error: "Invalid link." }, { status: 400 });
  const { data, error } = await supabaseAdmin().from("expert_posts").insert({ author_kind: "admin", admin_email: session.email, content, link_url, status: "published" }).select("id").single();
  if (error) return NextResponse.json({ ok: false, error: "Insert failed." }, { status: 500 });
  await logAction(session.email, "post", data.id, "broadcast");
  return NextResponse.json({ ok: true, id: data.id });
}

export async function PATCH(req: NextRequest) {
  const session = await requireAdmin();
  if (isResponse(session)) return session;
  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  const id = clean(body?.id, 60);
  const action = clean(body?.action, 10);
  const reason = clean(body?.reason, 500) || null;
  const patch =
    action === "hide" ? { status: "hidden", hidden_at: new Date().toISOString(), hidden_by: session.email, hidden_reason: reason }
    : action === "unhide" ? { status: "published", hidden_at: null, hidden_by: null, hidden_reason: null }
    : action === "delete" ? { status: "deleted" }
    : null;
  if (!patch) return NextResponse.json({ ok: false, error: "Unknown action." }, { status: 400 });
  const { error } = await supabaseAdmin().from("expert_posts").update(patch).eq("id", id);
  if (error) return NextResponse.json({ ok: false, error: "Update failed." }, { status: 500 });
  await logAction(session.email, "post", id, action, reason || undefined);
  return NextResponse.json({ ok: true });
}
