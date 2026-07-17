import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { supabaseServer } from "@/lib/supabaseServer";
import { clean, EMAIL_RE } from "@/lib/signup";
import { rateLimit } from "@/lib/rateLimit";
import { hashIp, requestIp } from "@/lib/ipHash";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid request." }, { status: 400 });
  }

  const email = clean(body.email, 200).toLowerCase();
  const code = clean(body.code || body.token, 10);
  if (!EMAIL_RE.test(email) || !/^\d{6}$/.test(code)) {
    return NextResponse.json(
      { ok: false, error: "Enter the 6-digit code from your email." },
      { status: 400 }
    );
  }

  const ip = requestIp(req);
  if (!rateLimit(`admin-verify:${ip}:${email}`, 10, 15 * 60 * 1000)) {
    return NextResponse.json(
      { ok: false, error: "Too many attempts. Request a new code." },
      { status: 429 }
    );
  }

  // Cookie-bound client: a successful verify writes the session cookies.
  const supa = supabaseServer();

  // signInWithOtp codes verify as type "email"; generateLink fallback codes as "magiclink".
  let { data, error } = await supa.auth.verifyOtp({ email, token: code, type: "email" });
  if (error) {
    ({ data, error } = await supa.auth.verifyOtp({ email, token: code, type: "magiclink" }));
  }

  const db = supabaseAdmin();
  const audit = (event: string, userId?: string) =>
    db
      .from("auth_audit")
      .insert({
        email,
        event,
        user_id: userId || null,
        user_type: "admin",
        ip_hash: hashIp(ip),
        user_agent: clean(req.headers.get("user-agent"), 400) || null,
      })
      .then(({ error: e }) => e && console.error("auth_audit insert failed:", e.message));

  if (error || !data?.user) {
    await audit("otp_failed");
    const expired = /expired/i.test(error?.message || "");
    return NextResponse.json(
      {
        ok: false,
        error: expired
          ? "That code has expired. Request a new one."
          : "That code isn't right. Check the digits and try again.",
      },
      { status: 401 }
    );
  }

  // The session exists now — confirm this email is still an active admin, or sign it back out.
  const { data: admin } = await db
    .from("admin_users")
    .select("id, email, full_name, role, active")
    .ilike("email", email)
    .maybeSingle();

  if (!admin || !admin.active) {
    await supa.auth.signOut();
    return NextResponse.json({ ok: false, error: "This account is not an active admin." }, { status: 403 });
  }

  const { error: linkErr } = await db
    .from("admin_users")
    .update({ auth_user_id: data.user.id, last_active_at: new Date().toISOString() })
    .eq("id", admin.id);
  if (linkErr) console.error("auth_user_id link failed (run migration 0009):", linkErr.message);

  await audit("login_success", data.user.id);
  return NextResponse.json({ ok: true });
}
