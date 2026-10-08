import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { serverError } from "@/lib/api/errorResponse";
import { isHiddenFromDirectory } from "@/lib/directoryVisibility";
import { houseFirst, HOUSE_PARTNER_EMAILS } from "@/lib/houseOrder";
import { hashIp, requestIp } from "@/lib/ipHash";
import { checkRateLimit } from "@/lib/rateLimit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET  /api/directory/partners[?id=]   public-safe partner cards (approved + verified + agreement + logo + description)
 * POST /api/directory/partners          { partner_id, kind: booking_click | website_click | offer_view } analytics ping (rate limited)
 */
export async function GET(req: NextRequest) {
  try {
    const id = new URL(req.url).searchParams.get("id");
    let q = supabaseAdmin()
      .from("partners")
      .select("id, contact_email, company_name, display_name, category, website, description, member_offer, logo_url, booking_link, verified, billing_parent_id, agreement_signed_at, created_at")
      .eq("status", "approved")
      .eq("verified", true)
      .not("logo_url", "is", null)
      .not("description", "is", null)
      .order("created_at", { ascending: true });
    if (id) q = q.eq("id", id);
    const { data, error } = await q;
    if (error) throw error;
    const parents = new Set((data ?? []).filter((p) => p.agreement_signed_at).map((p) => p.id));
    const rows = houseFirst(data ?? [], HOUSE_PARTNER_EMAILS)
      .filter((p) => (p.agreement_signed_at || (p.billing_parent_id && parents.has(p.billing_parent_id))) && !isHiddenFromDirectory(p.contact_email))
      .map(({ contact_email: _e, agreement_signed_at: _a, billing_parent_id: _b, ...rest }) => {
        void _e; void _a; void _b;
        return rest;
      });
    return NextResponse.json({ ok: true, rows }, { headers: { "Cache-Control": "public, max-age=60, s-maxage=300" } });
  } catch (err) {
    return serverError(err, { route: "GET /api/directory/partners" });
  }
}

const PUBLIC_KINDS = ["booking_click", "website_click", "offer_view", "catalog_view"];

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => null)) as { partner_id?: string; kind?: string; ref_id?: string } | null;
    const pid = body?.partner_id || "";
    const kind = body?.kind || "";
    if (!/^[0-9a-f-]{36}$/i.test(pid) || !PUBLIC_KINDS.includes(kind)) return NextResponse.json({ ok: true });
    const ip = requestIp(req);
    const rl = await checkRateLimit(`partner-event:${ip}`, { maxHits: 60 });
    if (!rl.allowed) return NextResponse.json({ ok: true });
    const visitor = hashIp(`${ip}|${req.headers.get("user-agent") || ""}`).slice(0, 32);
    await supabaseAdmin().from("partner_events").insert({ partner_id: pid, kind, ref_id: body?.ref_id && /^[0-9a-f-]{36}$/i.test(body.ref_id) ? body.ref_id : null, visitor });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: true });
  }
}
