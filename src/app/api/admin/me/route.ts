import { NextResponse } from "next/server";
import { requireAdmin, isResponse } from "@/lib/adminApi";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const session = await requireAdmin();
  if (isResponse(session)) return session;

  // Re-check the account is still active so deactivated admins lose access.
  const { data: admin } = await supabaseAdmin()
    .from("admin_users")
    .select("email, full_name, role, active")
    .ilike("email", session.email)
    .maybeSingle();
  if (!admin || !admin.active) {
    return NextResponse.json({ ok: false, error: "Account deactivated" }, { status: 403 });
  }
  return NextResponse.json({ ok: true, admin: { email: admin.email, name: admin.full_name, role: admin.role } });
}
