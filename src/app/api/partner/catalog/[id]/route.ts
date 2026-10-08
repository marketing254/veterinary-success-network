import { NextRequest, NextResponse } from "next/server";
import { requirePartner } from "@/lib/auth/guards";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { serverError, apiError } from "@/lib/api/errorResponse";
import { clean } from "@/lib/signup";
import { normalizeWebUrl } from "@/lib/url";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** PATCH edits (resubmits for review when content changes). DELETE archives. Always scoped to the caller's partner id. */
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const guard = await requirePartner();
  if (!guard.ok) return guard.response;
  const route = "PATCH /api/partner/catalog/[id]";
  try {
    const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
    if (!body) return apiError.badRequest("Invalid request.", route);
    const db = supabaseAdmin();
    const { data: row } = await db.from("partner_catalog_items").select("id, review_status").eq("id", params.id).eq("partner_id", guard.partnerId).maybeSingle();
    if (!row) return apiError.notFound(route);
    const patch: Record<string, unknown> = {};
    if ("name" in body) {
      const v = clean(body.name, 200);
      if (v.length < 2) return apiError.validation("Name cannot be empty.", route);
      patch.name = v;
    }
    if ("tagline" in body) patch.tagline = clean(body.tagline, 240) || null;
    if ("description" in body) {
      const v = clean(body.description, 4000);
      if (v.length < 10) return apiError.validation("Description is too short.", route);
      patch.description = v;
    }
    if ("category" in body) patch.category = clean(body.category, 120) || null;
    if ("price_label" in body) patch.price_label = clean(body.price_label, 60) || null;
    if ("type" in body) patch.type = ["service", "product", "course"].includes(clean(body.type, 20)) ? clean(body.type, 20) : "service";
    if ("highlights" in body) {
      const raw = Array.isArray(body.highlights) ? body.highlights.map(String).join("\n") : clean(body.highlights, 2000);
      patch.highlights = raw.split("\n").map((h) => h.trim()).filter(Boolean).slice(0, 8);
    }
    if ("link_url" in body) {
      const raw = clean(body.link_url, 500);
      if (!raw) patch.link_url = null;
      else {
        const u = normalizeWebUrl(raw);
        if (!u) return apiError.validation("That link does not look valid.", route);
        patch.link_url = u;
      }
    }
    if (Object.keys(patch).length === 0) return apiError.validation("Nothing to update.", route);
    // Content edits on a live item go back through review so members never see unreviewed copy.
    patch.review_status = "pending_review";
    patch.submitted_for_review_at = new Date().toISOString();
    const { error } = await db.from("partner_catalog_items").update(patch).eq("id", row.id);
    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (err) {
    return serverError(err, { route });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const guard = await requirePartner();
  if (!guard.ok) return guard.response;
  try {
    const { error } = await supabaseAdmin().from("partner_catalog_items").update({ review_status: "archived" }).eq("id", params.id).eq("partner_id", guard.partnerId);
    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (err) {
    return serverError(err, { route: "DELETE /api/partner/catalog/[id]" });
  }
}
