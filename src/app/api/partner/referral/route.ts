import { NextResponse } from "next/server";
import { requirePartner } from "@/lib/auth/guards";
import { serverError } from "@/lib/api/errorResponse";
import { getOrCreatePartnerReferral, referralStats, siteOrigin } from "@/lib/referral";
import { REFERRAL_PAYOUT_USD } from "@/lib/providerBilling";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const guard = await requirePartner();
  if (!guard.ok) return guard.response;
  try {
    const ref = await getOrCreatePartnerReferral(guard.partnerId, guard.companyName || "vsn");
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
    return serverError(err, { route: "GET /api/partner/referral" });
  }
}
