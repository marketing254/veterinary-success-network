import { NextResponse } from "next/server";
import { requireExpert } from "@/lib/auth/guards";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { serverError } from "@/lib/api/errorResponse";
import { loadExpertSelf, billingSummary, profileChecklist, isPubliclyListable } from "@/lib/expert/load";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET /api/expert/me: the signed-in expert, billing view, checklist, counts, dual flag. */
export async function GET() {
  const guard = await requireExpert();
  if (!guard.ok) return guard.response;
  try {
    const db = supabaseAdmin();
    const expert = await loadExpertSelf(guard.expertId);
    if (!expert) return NextResponse.json({ ok: false, error: "Expert not found." }, { status: 404 });

    const [kits, posts, inquiries, openInq, unread, partner] = await Promise.all([
      db.from("expert_resources").select("id", { count: "exact", head: true }).eq("expert_id", expert.id).neq("status", "archived"),
      db.from("expert_posts").select("id", { count: "exact", head: true }).eq("expert_id", expert.id).eq("status", "published"),
      db.from("expert_inquiries").select("id", { count: "exact", head: true }).eq("expert_id", expert.id),
      db.from("expert_inquiries").select("id", { count: "exact", head: true }).eq("expert_id", expert.id).eq("status", "open"),
      db.from("notifications").select("id", { count: "exact", head: true }).eq("expert_id", expert.id).is("read_at", null),
      db.from("partners").select("id, status").ilike("contact_email", expert.email).maybeSingle(),
    ]);

    const dual = !!partner.data && !["suspended", "churned", "rejected"].includes(partner.data.status);

    return NextResponse.json({
      ok: true,
      expert,
      billing: billingSummary(expert),
      checklist: profileChecklist(expert),
      listable: isPubliclyListable(expert),
      counts: {
        kits: kits.count ?? 0,
        posts: posts.count ?? 0,
        inquiries: inquiries.count ?? 0,
        openInquiries: openInq.count ?? 0,
        unread: unread.count ?? 0,
      },
      dual,
      onboardingCallUrl: process.env.ONBOARDING_CALL_URL || null,
    });
  } catch (err) {
    return serverError(err, { route: "GET /api/expert/me" });
  }
}
