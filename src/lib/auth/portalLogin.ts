import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { supabaseServer } from "@/lib/supabaseServer";
import { clean, EMAIL_RE } from "@/lib/signup";
import { checkRateLimit } from "@/lib/rateLimit";
import { hashIp, requestIp } from "@/lib/ipHash";
import { requestSignInCode, type Audience } from "@/lib/auth/otp";
import { serverError, apiError } from "@/lib/api/errorResponse";

/**
 * Shared handlers behind /api/expert/{login,verify-otp,logout} and
 * /api/partner/{login,verify-otp,logout}. Only emails with a matching
 * experts / partners row get a code (shouldCreateUser is never true), so a
 * member or a stranger cannot squat an email into the portal. Unknown
 * emails get the same neutral response as a successful send (no enumeration).
 */
const TABLE: Record<Audience, { table: string; emailCol: string; blocked: string[]; home: string }> = {
  expert: { table: "experts", emailCol: "email", blocked: ["suspended", "archived"], home: "/expert" },
  partner: { table: "partners", emailCol: "contact_email", blocked: ["suspended", "churned", "rejected"], home: "/partner" },
};

const NEUTRAL = "If that email has a portal account, a 6-digit code is on its way. It expires in 10 minutes.";

function audit(db: ReturnType<typeof supabaseAdmin>, req: NextRequest, email: string, audience: Audience, event: string, meta?: Record<string, unknown>, userId?: string) {
  return db
    .from("auth_audit")
    .insert({
      email,
      event,
      user_id: userId || null,
      user_type: audience,
      metadata: meta || null,
      ip_hash: hashIp(requestIp(req)),
      user_agent: clean(req.headers.get("user-agent"), 400) || null,
    })
    .then(({ error }) => error && console.error("auth_audit insert failed:", error.message));
}

export async function portalLogin(req: NextRequest, audience: Audience) {
  const route = `POST /api/${audience}/login`;
  try {
    let body: Record<string, unknown>;
    try {
      body = await req.json();
    } catch {
      return apiError.badRequest("Invalid request.", route);
    }
    const email = clean(body.email, 200).toLowerCase();
    if (!EMAIL_RE.test(email)) return apiError.validation("Enter a valid email address.", route);

    const rl = await checkRateLimit(`${audience}-login:${requestIp(req)}:${email}`);
    if (!rl.allowed) return apiError.rateLimited(route, rl.retryAfterSec);

    const cfg = TABLE[audience];
    const db = supabaseAdmin();
    const { data: row } = await db.from(cfg.table).select("id, status").ilike(cfg.emailCol, email).maybeSingle();

    if (!row) {
      await audit(db, req, email, audience, "otp_send_denied", { reason: "no_row" });
      return NextResponse.json({ ok: true, message: NEUTRAL });
    }
    if (cfg.blocked.includes(row.status)) {
      await audit(db, req, email, audience, "otp_send_denied", { reason: "status", status: row.status });
      return NextResponse.json({ ok: false, error: "Your portal isn't available right now. Reply to any of our emails and we will help." }, { status: 403 });
    }

    const sent = await requestSignInCode(email, audience);
    if (!sent.ok) {
      if (sent.reason === "throttled") {
        return NextResponse.json({ ok: false, error: "A code was sent recently. Wait a minute, then try again." }, { status: 429 });
      }
      if (sent.reason === "no_user") {
        // Row exists but no auth user yet (approval predates provisioning). Create it and retry once.
        const { error } = await db.auth.admin.createUser({ email, email_confirm: true, user_metadata: { role: audience } });
        if (!error) {
          const retry = await requestSignInCode(email, audience);
          if (retry.ok) {
            await audit(db, req, email, audience, "otp_requested", { via: retry.via, createdUser: true });
            return NextResponse.json({ ok: true, message: NEUTRAL });
          }
        }
      }
      console.error(`[${route}] send failed:`, sent.reason, sent.detail);
      return NextResponse.json({ ok: false, error: "Couldn't send your sign-in code. Please try again." }, { status: 500 });
    }
    await audit(db, req, email, audience, "otp_requested", { via: sent.via });
    return NextResponse.json({ ok: true, message: NEUTRAL });
  } catch (err) {
    return serverError(err, { route });
  }
}

export async function portalVerify(req: NextRequest, audience: Audience) {
  const route = `POST /api/${audience}/verify-otp`;
  try {
    let body: Record<string, unknown>;
    try {
      body = await req.json();
    } catch {
      return apiError.badRequest("Invalid request.", route);
    }
    const email = clean(body.email, 200).toLowerCase();
    const code = clean(body.code || body.token, 10);
    if (!EMAIL_RE.test(email) || !/^\d{6}$/.test(code)) {
      return apiError.validation("Enter the 6-digit code from your email.", route);
    }
    const rl = await checkRateLimit(`${audience}-verify:${requestIp(req)}:${email}`, { maxHits: 10 });
    if (!rl.allowed) return apiError.rateLimited(route, rl.retryAfterSec);

    const supa = supabaseServer();
    let { data, error } = await supa.auth.verifyOtp({ email, token: code, type: "email" });
    if (error) ({ data, error } = await supa.auth.verifyOtp({ email, token: code, type: "magiclink" }));

    const db = supabaseAdmin();
    if (error || !data?.user) {
      await audit(db, req, email, audience, "otp_failed");
      const expired = /expired/i.test(error?.message || "");
      return NextResponse.json(
        { ok: false, error: expired ? "That code has expired. Request a new one." : "That code isn't right. Check the digits and try again." },
        { status: 401 }
      );
    }

    const cfg = TABLE[audience];
    const { data: row } = await db
      .from(cfg.table)
      .select("id, status, auth_user_id")
      .ilike(cfg.emailCol, email)
      .maybeSingle();
    if (!row || cfg.blocked.includes(row.status)) {
      await supa.auth.signOut();
      return NextResponse.json({ ok: false, error: "This account does not have portal access." }, { status: 403 });
    }

    const update: Record<string, unknown> = {};
    if (row.auth_user_id !== data.user.id) update.auth_user_id = data.user.id;
    if (audience === "expert" && row.status === "invited") {
      update.status = "active";
      update.activated_at = new Date().toISOString();
    }
    if (Object.keys(update).length) {
      const { error: linkErr } = await db.from(cfg.table).update(update).eq("id", row.id);
      if (linkErr) console.error(`${cfg.table} link failed (run migrations 0011/0012):`, linkErr.message);
    }

    await audit(db, req, email, audience, "login_success", { id: row.id }, data.user.id);
    const next = clean(body.next, 200);
    const safeNext = next.startsWith(`${cfg.home}`) && !next.includes("//") ? next : cfg.home;
    return NextResponse.json({ ok: true, next: safeNext });
  } catch (err) {
    return serverError(err, { route });
  }
}

export async function portalLogout(audience: Audience) {
  try {
    await supabaseServer().auth.signOut();
  } catch (err) {
    console.error(`[${audience}:logout] signOut failed:`, err);
  }
  return NextResponse.json({ ok: true });
}
