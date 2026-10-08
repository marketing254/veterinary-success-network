import { NextResponse } from "next/server";
import { requireExpert } from "@/lib/auth/guards";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { serverError } from "@/lib/api/errorResponse";
import { getOrCreateExpertReferral, referralStats, siteOrigin } from "@/lib/referral";
import { REFERRAL_PAYOUT_USD } from "@/lib/providerBilling";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET /api/expert/referral: code, vanity link, signup and conversion counts. Creates the code on first call. */
export async function GET() {
  const guard = await requireExpert();
  if (!guard.ok) return guard.response;
  try {
    const { data: me } = await supabaseAdmin().from("experts").select("display_name, full_name").eq("id", guard.expertId).maybeSingle();
    const ref = await getOrCreateExpertReferral(guard.expertId, me?.display_name || me?.full_name || "vsn");
    const stats = await referralStats(ref.id);
    const origin = siteOrigin();
    return NextResponse.json({
      ok: true,
      code: ref.code,
      slug: ref.slug,
      link: ref.slug ? `${origin}/${ref.slug}` : `${origin}/join?ref=${ref.code}`,
      codeLink: `${origin}/join?ref=${ref.code}`,
      payoutUsd: REFERRAL_PAYOUT_USD,
      ...stats,
    });
  } catch (err) {
    return serverError(err, { route: "GET /api/expert/referral" });
  }
}
