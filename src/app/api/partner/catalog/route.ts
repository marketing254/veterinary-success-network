import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { requirePartner } from "@/lib/auth/guards";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { serverError, apiError } from "@/lib/api/errorResponse";
import { clean } from "@/lib/signup";
import { normalizeWebUrl } from "@/lib/url";
import { AVATAR_MAX_BYTES, resolveImageUpload } from "@/lib/api/uploads";
import { notifySignup } from "@/lib/email/teamNotify";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const TYPES = ["service", "product", "course"];

/** GET: the partner's catalog with media. */
export async function GET() {
  const guard = await requirePartner();
  if (!guard.ok) return guard.response;
  try {
    const db = supabaseAdmin();
    const { data, error } = await db
      .from("partner_catalog_items")
      .select("id, type, name, tagline, description, category, price_label, highlights, link_url, review_status, review_note, submitted_for_review_at, approved_at, offer_count, created_at, partner_catalog_media(id, url, caption, position)")
      .eq("partner_id", guard.partnerId)
      .neq("review_status", "archived")
      .order("created_at", { ascending: false });
    if (error) throw error;
    return NextResponse.json({ ok: true, rows: data ?? [] });
  } catch (err) {
    return serverError(err, { route: "GET /api/partner/catalog" });
  }
}

/** POST multipart: type, name, tagline, description, category, price_label, highlights (newline), link_url, image (optional). */
export async function POST(req: NextRequest) {
  const guard = await requirePartner();
  if (!guard.ok) return guard.response;
  const route = "POST /api/partner/catalog";
  try {
    const form = await req.formData().catch(() => null);
    if (!form) return apiError.badRequest("Invalid request.", route);
    const typeRaw = clean(form.get("type"), 20);
    const name = clean(form.get("name"), 200);
    const description = clean(form.get("description"), 4000);
    if (name.length < 2) return apiError.validation("Give the item a name.", route);
    if (description.length < 10) return apiError.validation("Describe the item in at least a sentence.", route);
    const linkRaw = clean(form.get("link_url"), 500);
    const link_url = linkRaw ? normalizeWebUrl(linkRaw) : null;
    if (linkRaw && !link_url) return apiError.validation("That link does not look valid.", route);
    const highlights = clean(form.get("highlights"), 2000).split("\n").map((h) => h.trim()).filter(Boolean).slice(0, 8);

    const db = supabaseAdmin();
    const id = randomUUID();
    const { error } = await db.from("partner_catalog_items").insert({
      id,
      partner_id: guard.partnerId,
      type: TYPES.includes(typeRaw) ? typeRaw : "service",
      name,
      tagline: clean(form.get("tagline"), 240) || null,
      description,
      category: clean(form.get("category"), 120) || null,
      price_label: clean(form.get("price_label"), 60) || null,
      highlights,
      link_url,
      review_status: "pending_review",
    });
    if (error) throw error;

    const image = form.get("image");
    if (image instanceof File && image.size > 0) {
      const kind = resolveImageUpload(image);
      if (kind && image.size <= AVATAR_MAX_BYTES) {
        const path = `${guard.partnerId}/catalog/${id}/${randomUUID()}.${kind.ext}`;
        const { error: upErr } = await db.storage.from("partner-media").upload(path, Buffer.from(await image.arrayBuffer()), { contentType: kind.contentType });
        if (!upErr) {
          const url = db.storage.from("partner-media").getPublicUrl(path).data?.publicUrl;
          if (url) await db.from("partner_catalog_media").insert({ catalog_item_id: id, url, storage_path: path, position: 0 });
        }
      }
    }
    await notifySignup("partner catalog item", { Company: guard.companyName, Email: guard.email, Item: name, Type: typeRaw || "service" });
    return NextResponse.json({ ok: true, id });
  } catch (err) {
    return serverError(err, { route });
  }
}
