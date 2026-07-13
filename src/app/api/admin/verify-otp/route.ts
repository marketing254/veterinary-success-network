import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { clean, EMAIL_RE } from "@/lib/signup";
import { rateLimit } from "@/lib/rateLimit";
import { hashIp, requestIp } from "@/lib/ipHash";
import { otpHash } from "@/lib/adminOtp";
import { createSessionToken, ADMIN_COOKIE } from "@/lib/adminSession";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid request." }, { status: 400 });
  }

  const email = clean(body.email, 200).toLowerCase();
  const code = clean(body.code, 10);
  if (!EMAIL_RE.test(email) || !/^\d{6}$/.test(code)) {
    return NextResponse.json({ ok: false, error: "Enter the 6-digit code from your email." }, { status: 400 });
  }

  const ip = requestIp(req);
  if (!rateLimit(`admin-verify:${ip}:${email}`, 10, 15 * 60 * 1000)) {
    return NextResponse.json({ ok: false, error: "Too many attempts. Request a new code." }, { status: 429 });
  }

  const db = supabaseAdmin();
  const { data: otp } = await db
    .from("admin_otps")
    .select("id, code_hash, expires_at, attempts, consumed_at")
    .eq("email", email)
    .is("consumed_at", null)
    .gt("expires_at", new Date().toISOString())
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const audit = (event: string) =>
    db.from("auth_audit").insert({
      email,
      event,
      ip_hash: hashIp(ip),
      user_agent: clean(req.headers.get("user-agent"), 400) || null,
    });

  if (!otp || otp.attempts >= 5 || otp.code_hash !== otpHash(code)) {
    if (otp) await db.from("admin_otps").update({ attempts: otp.attempts + 1 }).eq("id", otp.id);
    await audit("otp_failed");
    return NextResponse.json({ ok: false, error: "That code isn't right or has expired." }, { status: 401 });
  }

  const { data: admin } = await db
    .from("admin_users")
    .select("email, full_name, role, active")
    .ilike("email", email)
    .maybeSingle();
  if (!admin || !admin.active) {
    return NextResponse.json({ ok: false, error: "This account is not active." }, { status: 403 });
  }

  await db.from("admin_otps").update({ consumed_at: new Date().toISOString() }).eq("id", otp.id);
  await audit("otp_verified");

  const token = await createSessionToken({ email: admin.email, name: admin.full_name, role: admin.role });
  const res = NextResponse.json({ ok: true });
  res.cookies.set(ADMIN_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 7 * 24 * 3600,
  });
  return res;
}
