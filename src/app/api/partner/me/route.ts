import { NextResponse } from "next/server";
import { requirePartner } from "@/lib/auth/guards";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { serverError } from "@/lib/api/errorResponse";
import { loadPartnerSelf, partnerBilling, partnerChecklist, isPartnerListable, isHousePartner, PARTNER_SELF_COLUMNS, type PartnerSelf } from "@/lib/partner/load";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET /api/partner/me: partner, billing view, checklist, counts, covered companies, dual flag. */
export async function GET() {
  const guard = await requirePartner();
  if (!guard.ok) return guard.response;
  try {
    const db = supabaseAdmin();
    const partner = await loadPartnerSelf(guard.partnerId);
    if (!partner) return NextResponse.json({ ok: false, error: "Partner not found." }, { status: 404 });

    let parent: PartnerSelf | null = null;
    if (partner.billing_parent_id) parent = await loadPartnerSelf(partner.billing_parent_id);

    const since = new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString();
    const [catalog, offers, inquiries, openInq, redemptions, views, unread, covered, expert] = await Promise.all([
      db.from("partner_catalog_items").select("id", { count: "exact", head: true }).eq("partner_id", partner.id).neq("review_status", "archived"),
      db.from("partner_offers").select("id", { count: "exact", head: true }).eq("partner_id", partner.id).neq("review_status", "archived"),
      db.from("partner_inquiries").select("id", { count: "exact", head: true }).eq("partner_id", partner.id),
      db.from("partner_inquiries").select("id", { count: "exact", head: true }).eq("partner_id", partner.id).eq("status", "open"),
      db.from("partner_redemptions").select("id", { count: "exact", head: true }).eq("partner_id", partner.id).eq("status", "confirmed"),
      db.from("partner_events").select("id", { count: "exact", head: true }).eq("partner_id", partner.id).eq("kind", "profile_view").gte("created_at", since),
      db.from("notifications").select("id", { count: "exact", head: true }).eq("partner_id", partner.id).is("read_at", null),
      db.from("partners").select(PARTNER_SELF_COLUMNS).eq("billing_parent_id", partner.id).order("company_name"),
      db.from("experts").select("id, status").ilike("email", partner.contact_email).maybeSingle(),
    ]);

    const dual = !!expert.data && !["suspended", "archived"].includes(expert.data.status);
    const billing = partnerBilling(partner, parent);

    return NextResponse.json({
      ok: true,
      partner,
      parent: parent ? { id: parent.id, company_name: parent.company_name } : null,
      covered: ((covered.data ?? []) as PartnerSelf[]).map((c) => ({ id: c.id, company_name: c.company_name, category: c.category, logo_url: c.logo_url, status: c.status, description: c.description })),
      billing,
      checklist: partnerChecklist(partner, !!parent || isHousePartner(partner)),
      listable: isPartnerListable(partner, !!parent?.agreement_signed_at),
      counts: {
        catalog: catalog.count ?? 0,
        offers: offers.count ?? 0,
        inquiries: inquiries.count ?? 0,
        openInquiries: openInq.count ?? 0,
        redemptions: redemptions.count ?? 0,
        views30: views.count ?? 0,
        unread: unread.count ?? 0,
      },
      dual,
    });
  } catch (err) {
    return serverError(err, { route: "GET /api/partner/me" });
  }
}
