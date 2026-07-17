import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { supabaseAnon } from "@/lib/supabaseServer";
import { clean, EMAIL_RE } from "@/lib/signup";
import { rateLimit } from "@/lib/rateLimit";
import { hashIp, requestIp } from "@/lib/ipHash";
import { sendAdminCodeEmail } from "@/lib/email/confirmations";

export const runtime = "nodejs";

/**
 * ASN-model admin login: allow-list gate FIRST (no email ever goes to non-admins),
 * then Supabase sends the 6-digit code (signInWithOtp + {{ .Token }} template).
 * On ANY Supabase send failure we fall back to generateLink → email_otp → our own
 * transport, so a broken dashboard SMTP can never lock the team out.
 */
export async function POST(req: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid request." }, { status: 400 });
  }

  const email = clean(body.email, 200).toLowerCase();
  if (!EMAIL_RE.test(email)) {
    return NextResponse.json({ ok: false, error: "Enter a valid email." }, { status: 400 });
  }

  const ip = requestIp(req);
  if (!rateLimit(`admin-login:${ip}:${email}`, 5, 15 * 60 * 1000)) {
    return NextResponse.json(
      { ok: false, error: "Too many attempts. Try again in a few minutes." },
      { status: 429 }
    );
  }

  const db = supabaseAdmin();
  const { data: admin } = await db
    .from("admin_users")
    .select("email, full_name, active")
    .ilike("email", email)
    .maybeSingle();

  if (!admin || !admin.active) {
    return NextResponse.json(
      { ok: false, error: "That email is not on the admin allow-list." },
      { status: 403 }
    );
  }

  const audit = (event: string, metadata?: Record<string, unknown>) =>
    db
      .from("auth_audit")
      .insert({
        email,
        event,
        user_type: "admin",
        metadata: metadata || null,
        ip_hash: hashIp(ip),
        user_agent: clean(req.headers.get("user-agent"), 400) || null,
      })
      .then(({ error }) => error && console.error("auth_audit insert failed:", error.message));

  // Primary: Supabase emails the code (dashboard SMTP + {{ .Token }} Magic Link template).
  const { error: otpError } = await supabaseAnon().auth.signInWithOtp({
    email,
    options: { shouldCreateUser: false },
  });

  if (!otpError) {
    await audit("otp_requested", { sentVia: "supabase" });
    return NextResponse.json({ ok: true, sentVia: "supabase" });
  }

  // Supabase's ~60s resend throttle → friendly 429, no double-send.
  if (otpError.status === 429 || /security purposes|seconds/i.test(otpError.message || "")) {
    return NextResponse.json(
      { ok: false, error: "A code was sent recently. Wait a minute, then try again." },
      { status: 429 }
    );
  }

  // Missing auth user (shouldCreateUser:false) → tell the operator exactly what to fix.
  if (otpError.status === 422 || /signups not allowed/i.test(otpError.message || "")) {
    return NextResponse.json(
      {
        ok: false,
        error:
          "This admin has no Supabase auth user yet. Create it in Authentication → Users, then retry.",
      },
      { status: 422 }
    );
  }

  // Fallback: mint the code server-side and send it through our own transport.
  console.error("Supabase OTP send failed, using fallback:", otpError.message);
  const { data: linkData, error: linkError } = await db.auth.admin.generateLink({
    type: "magiclink",
    email,
  });
  const code = linkData?.properties?.email_otp;
  if (linkError || !code) {
    console.error("generateLink fallback failed:", linkError?.message);
    return NextResponse.json(
      { ok: false, error: "Couldn't send a sign-in code. Check the server logs." },
      { status: 500 }
    );
  }

  try {
    // NOT fail-soft: login must know if delivery failed.
    await sendAdminCodeEmail(email, code);
  } catch (err) {
    console.error("fallback code email failed:", err);
    return NextResponse.json(
      { ok: false, error: "Couldn't email the sign-in code. Check the SMTP settings." },
      { status: 500 }
    );
  }

  await audit("otp_requested", { sentVia: "fallback", reason: otpError.message });
  return NextResponse.json({ ok: true, sentVia: "fallback" });
}
