import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { requireAdmin, isResponse } from "@/lib/adminApi";
import { MEMBER_LAUNCH_ENABLED } from "@/lib/launch";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const session = await requireAdmin();
  if (isResponse(session)) return session;

  const db = supabaseAdmin();
  const head = { count: "exact" as const, head: true };
  const [counts, reservations, experts, partners, kits, kitsPending, catalogPending, offersPending, inqOpenE, inqOpenP, invitesOpen, referralsDue] = await Promise.all([
    db.from("signup_counts").select("*").maybeSingle(),
    db.from("member_reservations").select("id, position, full_name, practice_name, plan, status, created_at").order("position", { ascending: false }).limit(6),
    db.from("expert_applications").select("id, full_name, company, status, created_at").order("created_at", { ascending: false }).limit(6),
    db.from("partner_applications").select("id, company_name, category, status, created_at").order("created_at", { ascending: false }).limit(6),
    db.from("free_kit_signups").select("id, full_name, practice_name, status, created_at").order("created_at", { ascending: false }).limit(6),
    db.from("expert_resources").select("id", head).eq("status", "pending_review"),
    db.from("partner_catalog_items").select("id", head).eq("review_status", "pending_review"),
    db.from("partner_offers").select("id", head).eq("review_status", "pending_review"),
    db.from("expert_inquiries").select("id", head).eq("status", "open"),
    db.from("partner_inquiries").select("id", head).eq("status", "open"),
    db.from("founding_invites").select("id", head).in("status", ["sent", "viewed"]),
    db.from("referral_signups").select("id", head).not("converted_at", "is", null).is("paid_out_at", null),
  ]);

  return NextResponse.json({
    ok: true,
    launchEnabled: MEMBER_LAUNCH_ENABLED,
    counts: {
      ...(counts.data || {}),
      kits_pending: kitsPending.count ?? 0,
      catalog_pending: catalogPending.count ?? 0,
      offers_pending: offersPending.count ?? 0,
      inquiries_open: (inqOpenE.count ?? 0) + (inqOpenP.count ?? 0),
      founding_invites_sent: invitesOpen.count ?? 0,
      referrals_due: referralsDue.count ?? 0,
    },
    recent: {
      reservations: reservations.data || [],
      experts: experts.data || [],
      partners: partners.data || [],
      freeKit: kits.data || [],
    },
  });
}
