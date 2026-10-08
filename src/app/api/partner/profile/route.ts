import { NextRequest, NextResponse } from "next/server";
import { requirePartner } from "@/lib/auth/guards";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { serverError, apiError } from "@/lib/api/errorResponse";
import { clean, EMAIL_RE } from "@/lib/signup";
import { normalizeWebUrl } from "@/lib/url";
import { loadPartnerSelf } from "@/lib/partner/load";
import { PARTNER_CATEGORIES } from "@/components/forms/PartnerApplicationForm";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** PATCH /api/partner/profile: company and contact fields the partner may edit. */
export async function PATCH(req: NextRequest) {
  const guard = await requirePartner();
  if (!guard.ok) return guard.response;
  const route = "PATCH /api/partner/profile";
  try {
    const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
    if (!body) return apiError.badRequest("Invalid request.", route);
    const patch: Record<string, string | null> = {};
    const text = (k: string, max: number) => {
      if (k in body) patch[k] = clean(body[k], max) || null;
    };
    text("display_name", 120);
    text("description", 2000);
    text("member_offer", 2000);
    text("lead_response_time", 80);
    text("contact_name", 160);
    text("contact_phone", 40);
    text("signer_name", 160);
    text("signer_title", 120);
    if ("category" in body) {
      const c = clean(body.category, 120);
      if (c && !PARTNER_CATEGORIES.includes(c) && !c.startsWith("Other")) return apiError.validation("Pick a category from the list.", route);
      patch.category = c || null;
    }
    if ("billing_email" in body) {
      const e = clean(body.billing_email, 200).toLowerCase();
      if (e && !EMAIL_RE.test(e)) return apiError.validation("Enter a valid billing email.", route);
      patch.billing_email = e || null;
    }
    for (const k of ["website", "booking_link"]) {
      if (k in body) {
        const raw = clean(body[k], 300);
        if (!raw) patch[k] = null;
        else {
          const url = normalizeWebUrl(raw);
          if (!url) return apiError.validation(`Please enter a valid ${k === "website" ? "website" : "booking link"}.`, route);
          patch[k] = url;
        }
      }
    }
    if (!patch.contact_name && "contact_name" in body) return apiError.validation("Contact name cannot be empty.", route);
    if (Object.keys(patch).length === 0) return apiError.validation("Nothing to update.", route);
    const { error } = await supabaseAdmin().from("partners").update(patch).eq("id", guard.partnerId);
    if (error) throw error;
    return NextResponse.json({ ok: true, partner: await loadPartnerSelf(guard.partnerId) });
  } catch (err) {
    return serverError(err, { route });
  }
}
