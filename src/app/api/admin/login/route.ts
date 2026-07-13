import { NextRequest, NextResponse } from "next/server";
import { randomInt } from "crypto";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { clean, EMAIL_RE } from "@/lib/signup";
import { rateLimit } from "@/lib/rateLimit";
import { hashIp, requestIp } from "@/lib/ipHash";
import { sendEmail, emailShell } from "@/lib/email/mailer";
import { otpHash } from "@/lib/adminOtp";

export const runtime = "nodejs";

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

  // Always answer identically so admin emails can't be enumerated.
  const generic = NextResponse.json({
    ok: true,
    message: "If that email belongs to an admin, a sign-in code is on its way.",
  });

  if (!admin || !admin.active) return generic;

  const code = String(randomInt(100000, 1000000));
  await db.from("admin_otps").insert({
    email,
    code_hash: otpHash(code),
    expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
  });
  await db.from("auth_audit").insert({
    email,
    event: "otp_requested",
    ip_hash: hashIp(ip),
    user_agent: clean(req.headers.get("user-agent"), 400) || null,
  });

  const emailConfigured =
    !!process.env.SMTP_HOST || !!process.env.GMAIL_USER || !!process.env.RESEND_API_KEY;
  if (!emailConfigured) {
    console.log(`[admin-otp:dev] ${email} -> ${code}`);
  }
  await sendEmail({
    to: email,
    subject: `${code} is your VSN admin sign-in code`,
    html: emailShell(
      "Your sign-in code",
      `<p style="font-size:14px;color:#2c3a22;">Enter this code to sign in to the VSN admin portal. It expires in 10 minutes.</p>
       <p style="font-family:Georgia,serif;font-size:34px;letter-spacing:.25em;color:#1c3310;font-weight:700;margin:18px 0;">${code}</p>
       <p style="font-size:12.5px;color:#74806a;">If you didn't request this, you can ignore this email.</p>`
    ),
  }).catch((err) => console.error("otp email failed:", err));

  return generic;
}
