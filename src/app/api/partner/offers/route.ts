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

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export async function GET() {
  const guard = await requirePartner();
  if (!guard.ok) return guard.response;
  try {
    const { data, error } = await supabaseAdmin()
      .from("partner_offers")
      .select("id, catalog_item_id, headline, discount_value, promo_code, description, terms, redeem_url, valid_from, valid_to, redemption_limit_per_member, image_url, review_status, review_note, approved_at, created_at")
      .eq("partner_id", guard.partnerId)
      .neq("review_status", "archived")
      .order("created_at", { ascending: false });
    if (error) throw error;
    return NextResponse.json({ ok: true, rows: data ?? [] });
  } catch (err) {
    return serverError(err, { route: "GET /api/partner/offers" });
  }
}

/** POST multipart: headline, discount_value, promo_code, description, terms, redeem_url, valid_from, valid_to, limit, catalog_item_id, image. */
export async function POST(req: NextRequest) {
  const guard = await requirePartner();
  if (!guard.ok) return guard.response;
  const route = "POST /api/partner/offers";
  try {
    const form = await req.formData().catch(() => null);
    if (!form) return apiError.badRequest("Invalid request.", route);
    const headline = clean(form.get("headline"), 160);
    const discount_value = clean(form.get("discount_value"), 80);
    const description = clean(form.get("description"), 1000);
    if (headline.length < 5) return apiError.validation("Give the offer a headline (5 characters or more).", route);
    if (!discount_value) return apiError.validation("State the member value, e.g. 20% off or $250 credit.", route);
    if (description.length < 10) return apiError.validation("Describe the offer in at least a sentence.", route);
    const vf = clean(form.get("valid_from"), 10);
    const vt = clean(form.get("valid_to"), 10);
    if (vf && !DATE_RE.test(vf)) return apiError.validation("Start date must be YYYY-MM-DD.", route);
    if (vt && !DATE_RE.test(vt)) return apiError.validation("End date must be YYYY-MM-DD.", route);
    if (vf && vt && vt < vf) return apiError.validation("End date must be after the start date.", route);
    const redeemRaw = clean(form.get("redeem_url"), 500);
    const redeem_url = redeemRaw ? normalizeWebUrl(redeemRaw) : null;
    if (redeemRaw && !redeem_url) return apiError.validation("That redemption link does not look valid.", route);
    const catalogRaw = clean(form.get("catalog_item_id"), 40);

    const db = supabaseAdmin();
    let catalog_item_id: string | null = null;
    if (catalogRaw) {
      const { data: item } = await db.from("partner_catalog_items").select("id").eq("id", catalogRaw).eq("partner_id", guard.partnerId).maybeSingle();
      catalog_item_id = item?.id ?? null;
    }
    const id = randomUUID();
    let image_url: string | null = null;
    const image = form.get("image");
    if (image instanceof File && image.size > 0) {
      const kind = resolveImageUpload(image);
      if (kind && image.size <= AVATAR_MAX_BYTES) {
        const path = `${guard.partnerId}/offers/${id}.${kind.ext}`;
        const { error: upErr } = await db.storage.from("partner-media").upload(path, Buffer.from(await image.arrayBuffer()), { contentType: kind.contentType });
        if (!upErr) image_url = db.storage.from("partner-media").getPublicUrl(path).data?.publicUrl ?? null;
      }
    }
    const { error } = await db.from("partner_offers").insert({
      id,
      partner_id: guard.partnerId,
      catalog_item_id,
      headline,
      discount_value,
      promo_code: clean(form.get("promo_code"), 40) || null,
      description,
      terms: clean(form.get("terms"), 4000) || null,
      redeem_url,
      valid_from: vf || new Date().toISOString().slice(0, 10),
      valid_to: vt || null,
      redemption_limit_per_member: clean(form.get("limit"), 40) || "unlimited",
      image_url,
      review_status: "pending_review",
    });
    if (error) throw error;
    await notifySignup("partner offer submitted", { Company: guard.companyName, Email: guard.email, Offer: headline, Value: discount_value });
    return NextResponse.json({ ok: true, id });
  } catch (err) {
    return serverError(err, { route });
  }
}
