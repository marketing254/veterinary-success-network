import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { serverError } from "@/lib/api/errorResponse";
import { isHiddenFromDirectory } from "@/lib/directoryVisibility";
import { houseFirst, HOUSE_EXPERT_EMAILS } from "@/lib/houseOrder";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/directory/experts[?id=]  public-safe expert cards.
 * Listed when: status invited/active, agreement accepted, headshot + bio present,
 * not hidden by the visibility filter. Never returns email or phone.
 */
export async function GET(req: NextRequest) {
  try {
    const id = new URL(req.url).searchParams.get("id");
    let q = supabaseAdmin()
      .from("experts")
      .select("id, email, full_name, display_name, company_name, specialty, topics, bio, website, booking_link, headshot_url, created_at")
      .in("status", ["invited", "active"])
      .not("agreement_signed_at", "is", null)
      .not("headshot_url", "is", null)
      .not("bio", "is", null)
      .order("created_at", { ascending: true });
    if (id) q = q.eq("id", id);
    const { data, error } = await q;
    if (error) throw error;
    const rows = houseFirst(data ?? [], HOUSE_EXPERT_EMAILS)
      .filter((e) => !isHiddenFromDirectory(e.email))
      .map(({ email: _e, ...rest }) => {
        void _e;
        return rest;
      });
    return NextResponse.json({ ok: true, rows }, { headers: { "Cache-Control": "public, max-age=60, s-maxage=300" } });
  } catch (err) {
    return serverError(err, { route: "GET /api/directory/experts" });
  }
}
