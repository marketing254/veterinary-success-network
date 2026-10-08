import { NextRequest, NextResponse } from "next/server";
import { requireExpert } from "@/lib/auth/guards";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { serverError, apiError } from "@/lib/api/errorResponse";
import { clean } from "@/lib/signup";
import { normalizeWebUrl } from "@/lib/url";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET  /api/expert/posts?scope=mine|network   published posts with author cards
 * POST /api/expert/posts { content, link_url? }  publish to the network feed
 * Posting requires an accepted agreement (members see the feed later).
 */
export async function GET(req: NextRequest) {
  const guard = await requireExpert();
  if (!guard.ok) return guard.response;
  try {
    const scope = new URL(req.url).searchParams.get("scope") === "mine" ? "mine" : "network";
    const db = supabaseAdmin();
    let q = db
      .from("expert_posts")
      .select("id, expert_id, partner_id, author_kind, content, link_url, image_url, published_at, reaction_count, comment_count, experts(display_name, full_name, specialty, headshot_url, avatar_url), partners(display_name, company_name, logo_url)")
      .eq("status", "published")
      .order("published_at", { ascending: false })
      .limit(50);
    if (scope === "mine") q = q.eq("expert_id", guard.expertId);
    const { data, error } = await q;
    if (error) throw error;

    const ids = (data ?? []).map((p) => p.id);
    const { data: mine } = ids.length
      ? await db.from("post_reactions").select("post_id").eq("author_auth_user_id", guard.userId).in("post_id", ids)
      : { data: [] as { post_id: string }[] };
    const reacted = new Set((mine ?? []).map((r) => r.post_id));

    const rows = (data ?? []).map((p) => {
      const e = (Array.isArray(p.experts) ? p.experts[0] : p.experts) as { display_name: string | null; full_name: string; specialty: string | null; headshot_url: string | null; avatar_url: string | null } | null;
      const v = (Array.isArray(p.partners) ? p.partners[0] : p.partners) as { display_name: string | null; company_name: string; logo_url: string | null } | null;
      const author =
        p.author_kind === "partner" && v
          ? { name: v.display_name || v.company_name, subtitle: "Partner", image: v.logo_url }
          : p.author_kind === "admin"
            ? { name: "Veterinary Success Network", subtitle: "Team", image: null }
            : { name: e?.display_name || e?.full_name || "Expert", subtitle: e?.specialty || "Expert", image: e?.avatar_url || e?.headshot_url || null };
      return {
        id: p.id,
        mine: p.expert_id === guard.expertId,
        author,
        content: p.content,
        link_url: p.link_url,
        image_url: p.image_url,
        published_at: p.published_at,
        reaction_count: p.reaction_count,
        comment_count: p.comment_count,
        reacted: reacted.has(p.id),
      };
    });
    return NextResponse.json({ ok: true, rows });
  } catch (err) {
    return serverError(err, { route: "GET /api/expert/posts" });
  }
}

export async function POST(req: NextRequest) {
  const guard = await requireExpert();
  if (!guard.ok) return guard.response;
  const route = "POST /api/expert/posts";
  try {
    if (!guard.agreementSigned) return apiError.validation("Accept your expert agreement before posting to the network.", route);
    const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
    if (!body) return apiError.badRequest("Invalid request.", route);
    const content = clean(body.content, 4000);
    if (content.length < 2) return apiError.validation("Write something first.", route);
    let link_url: string | null = null;
    const linkRaw = clean(body.link_url, 500);
    if (linkRaw) {
      link_url = normalizeWebUrl(linkRaw);
      if (!link_url) return apiError.validation("That link does not look valid.", route);
    }
    const { data, error } = await supabaseAdmin()
      .from("expert_posts")
      .insert({ expert_id: guard.expertId, author_kind: "expert", content, link_url, status: "published" })
      .select("id")
      .single();
    if (error) throw error;
    return NextResponse.json({ ok: true, id: data.id });
  } catch (err) {
    return serverError(err, { route });
  }
}
