import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { supabaseAnon } from "@/lib/supabaseServer";
import { sendSignInCodeEmail } from "@/lib/email/signInCode";

/**
 * Shared 6-digit code sender for the expert and partner sign-in routes
 * (the admin route keeps its own copy in /api/admin/login).
 *
 *  OTP_TRANSPORT=app  → mint the code with the Admin API (generateLink) and send
 *                       it through our own SMTP (fast, sandbox-aware).
 *  otherwise          → ask Supabase to email it (dashboard SMTP + {{ .Token }}
 *                       template), give up after OTP_SUPABASE_TIMEOUT_MS and fall
 *                       back to the app transport.
 * Verify routes accept both code types ("email" then "magiclink").
 */
export type OtpSendResult =
  | { ok: true; via: "supabase" | "app" }
  | { ok: false; reason: "no_user" | "throttled" | "failed"; detail?: string };

export type Audience = "expert" | "partner";

export async function sendViaApp(email: string, audience: Audience): Promise<OtpSendResult> {
  const db = supabaseAdmin();
  const { data, error } = await db.auth.admin.generateLink({ type: "magiclink", email });
  if (error) {
    if (error.status === 404 || error.status === 422 || /not found/i.test(error.message ?? "")) {
      return { ok: false, reason: "no_user", detail: error.message };
    }
    return { ok: false, reason: "failed", detail: error.message };
  }
  const code = data?.properties?.email_otp;
  if (!code) return { ok: false, reason: "failed", detail: "no email_otp in generateLink response" };
  try {
    await sendSignInCodeEmail(email, code, audience);
    return { ok: true, via: "app" };
  } catch (err) {
    return { ok: false, reason: "failed", detail: err instanceof Error ? err.message : String(err) };
  }
}

export async function requestSignInCode(email: string, audience: Audience): Promise<OtpSendResult> {
  if ((process.env.OTP_TRANSPORT ?? "").toLowerCase() === "app") {
    return sendViaApp(email, audience);
  }
  const ms = Number(process.env.OTP_SUPABASE_TIMEOUT_MS ?? "6000");
  const send = supabaseAnon().auth.signInWithOtp({ email, options: { shouldCreateUser: false } });
  const timeout = new Promise<{ error: { status?: number; message?: string } }>((resolve) =>
    setTimeout(() => resolve({ error: { status: 504, message: "supabase otp send timed out" } }), ms)
  );
  const { error } = await Promise.race([send, timeout]);
  if (!error) return { ok: true, via: "supabase" };
  if (error.status === 429 || /security purposes|once every|seconds/i.test(error.message ?? "")) {
    return { ok: false, reason: "throttled" };
  }
  if (error.status === 422 || /signups not allowed|not found/i.test(error.message ?? "")) {
    return { ok: false, reason: "no_user", detail: error.message };
  }
  console.error(`[otp:${audience}] supabase send failed, using app transport:`, error.status, error.message);
  return sendViaApp(email, audience);
}
