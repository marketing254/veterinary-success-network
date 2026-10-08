import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { serverError } from "@/lib/api/errorResponse";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/me/roles → { authenticated, expert, partner, dual, admin, name }
 * One auth user can back an experts row AND a partners row (dual account).
 * When both exist, auth_user_id is linked on both so either portal gate passes.
 */
export async function GET() {
  try {
    const {
      data: { user },
    } = await supabaseServer().auth.getUser();
    if (!user?.email) {
      return NextResponse.json({ authenticated: false, expert: false, partner: false, dual: false, admin: false });
    }
    const email = user.email.toLowerCase();
    const db = supabaseAdmin();
    const [{ data: expert }, { data: partner }, { data: admin }] = await Promise.all([
      db.from("experts").select("id, status, auth_user_id, full_name").ilike("email", email).maybeSingle(),
      db.from("partners").select("id, status, auth_user_id, company_name, contact_name").ilike("contact_email", email).maybeSingle(),
      db.from("admin_users").select("id, active").ilike("email", email).maybeSingle(),
    ]);
    const expertOk = !!expert && !["suspended", "archived"].includes(expert.status);
    const partnerOk = !!partner && !["suspended", "churned", "rejected"].includes(partner.status);

    const links: PromiseLike<unknown>[] = [];
    if (expertOk && expert.auth_user_id !== user.id) links.push(db.from("experts").update({ auth_user_id: user.id }).eq("id", expert.id));
    if (partnerOk && partner.auth_user_id !== user.id) links.push(db.from("partners").update({ auth_user_id: user.id }).eq("id", partner.id));
    if (links.length) await Promise.all(links);

    return NextResponse.json({
      authenticated: true,
      email,
      name: expert?.full_name || partner?.contact_name || null,
      company: partner?.company_name || null,
      expert: expertOk,
      partner: partnerOk,
      dual: expertOk && partnerOk,
      admin: !!admin?.active,
    });
  } catch (err) {
    return serverError(err, { route: "GET /api/me/roles" });
  }
}
