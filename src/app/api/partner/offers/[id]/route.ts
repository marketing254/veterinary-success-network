import { NextRequest, NextResponse } from "next/server";
import { requirePartner } from "@/lib/auth/guards";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { serverError, apiError } from "@/lib/api/errorResponse";
import { clean } from "@/lib/signup";
import { normalizeWebUrl } from "@/lib/url";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const guard = await requirePartner();
  if (!guard.ok) return guard.response;
  const route = "PATCH /api/partner/offers/[id]";
  try {
    const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
    if (!body) return apiError.badRequest("Invalid request.", route);
    const db = supabaseAdmin();
    const { data: row } = await db.from("partner_offers").select("id").eq("id", params.id).eq("partner_id", guard.partnerId).maybeSingle();
    if (!row) return apiError.notFound(route);
    const patch: Record<string, unknown> = {};
    if ("headline" in body) {
      const v = clean(body.headline, 160);
      if (v.length < 5) return apiError.validation("Headline is too short.", route);
      patch.headline = v;
    }
    if ("discount_value" in body) {
      const v = clean(body.discount_value, 80);
      if (!v) return apiError.validation("State the member value.", route);
      patch.discount_value = v;
    }
    if ("promo_code" in body) patch.promo_code = clean(body.promo_code, 40) || null;
    if ("description" in body) {
      const v = clean(body.description, 1000);
      if (v.length < 10) return apiError.validation("Description is too short.", route);
      patch.description = v;
    }
    if ("terms" in body) patch.terms = clean(body.terms, 4000) || null;
    if ("valid_from" in body) {
      const v = clean(body.valid_from, 10);
      if (v && !DATE_RE.test(v)) return apiError.validation("Start date must be YYYY-MM-DD.", route);
      if (v) patch.valid_from = v;
    }
    if ("valid_to" in body) {
      const v = clean(body.valid_to, 10);
      if (v && !DATE_RE.test(v)) return apiError.validation("End date must be YYYY-MM-DD.", route);
      patch.valid_to = v || null;
    }
    if ("limit" in body) patch.redemption_limit_per_member = clean(body.limit, 40) || "unlimited";
    if ("redeem_url" in body) {
      const raw = clean(body.redeem_url, 500);
      if (!raw) patch.redeem_url = null;
      else {
        const u = normalizeWebUrl(raw);
        if (!u) return apiError.validation("That link does not look valid.", route);
        patch.redeem_url = u;
      }
    }
    if (Object.keys(patch).length === 0) return apiError.validation("Nothing to update.", route);
    patch.review_status = "pending_review";
    const { error } = await db.from("partner_offers").update(patch).eq("id", row.id);
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
    const { error } = await supabaseAdmin().from("partner_offers").update({ review_status: "archived" }).eq("id", params.id).eq("partner_id", guard.partnerId);
    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (err) {
    return serverError(err, { route: "DELETE /api/partner/offers/[id]" });
  }
}
