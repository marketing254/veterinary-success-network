import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

/**
 * Edge middleware: security headers on every response, plus auth gates.
 *   /admin/*, /api/admin/*     Supabase session + active admin_users row (by email)
 *   /expert/*, /api/expert/*   Supabase session + experts row (by email), not suspended/archived
 *   /partner/*, /api/partner/* Supabase session + partners row (by contact_email), not suspended/churned/rejected
 * Public exceptions: the login / verify / signup / logout endpoints and the login pages.
 * Dev bypass: VSN_DEV_PREVIEW_BYPASS=1 outside production skips the portal gates (never in Vercel).
 */

/** Keep in sync with src/lib/referral.ts (middleware runs on the Edge runtime). */
const REFERRAL_COOKIE = "vsn_ref";

const PUBLIC_EXACT = new Set([
  "/admin/login",
  "/api/admin/login",
  "/api/admin/verify-otp",
  "/expert/login",
  "/expert/applied",
  "/api/expert/login",
  "/api/expert/verify-otp",
  "/api/expert/logout",
  "/api/expert/signup",
  "/partner/login",
  "/partner/applied",
  "/api/partner/login",
  "/api/partner/verify-otp",
  "/api/partner/logout",
  "/api/partner/signup",
]);

type Gate = { kind: "admin" | "expert" | "partner"; isApi: boolean; loginPath: string };

function gateFor(pathname: string): Gate | null {
  const isApi = pathname.startsWith("/api/");
  const p = isApi ? pathname.slice(4) : pathname; // strip /api
  if (p === "/admin" || p.startsWith("/admin/")) return { kind: "admin", isApi, loginPath: "/admin/login" };
  if (p === "/expert" || p.startsWith("/expert/")) return { kind: "expert", isApi, loginPath: "/expert/login" };
  if (p === "/partner" || p.startsWith("/partner/")) return { kind: "partner", isApi, loginPath: "/partner/login" };
  return null;
}

function securityHeaders(res: NextResponse, supabaseUrl: string | undefined) {
  const supaHost = supabaseUrl ? new URL(supabaseUrl).host : "";
  const supaHttps = supaHost ? `https://${supaHost}` : "";
  const supaWss = supaHost ? `wss://${supaHost}` : "";
  const dev = process.env.NODE_ENV !== "production";
  const csp = [
    "default-src 'self'",
    `script-src 'self' 'unsafe-inline' ${dev ? "'unsafe-eval' " : ""}blob: https://vercel.live https://js.stripe.com https://*.js.stripe.com https://checkout.stripe.com https://www.googletagmanager.com`,
    `connect-src 'self' ${supaHttps} ${supaWss} https://vercel.live wss://*.pusher.com https://api.stripe.com https://js.stripe.com https://m.stripe.network https://m.stripe.com https://r.stripe.com https://checkout.stripe.com https://www.google-analytics.com https://www.googletagmanager.com https://analytics.google.com https://fonts.googleapis.com https://fonts.gstatic.com`,
    `frame-src 'self' ${supaHttps} https://vercel.live https://js.stripe.com https://hooks.stripe.com https://*.js.stripe.com https://m.stripe.network https://checkout.stripe.com`,
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' data: https://fonts.gstatic.com https://vercel.live",
    "img-src 'self' data: blob: https:",
    "media-src 'self' blob: https:",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self' https://checkout.stripe.com",
    "frame-ancestors 'none'",
  ].join("; ");
  res.headers.set("Content-Security-Policy", csp);
  res.headers.set("Strict-Transport-Security", "max-age=63072000; includeSubDomains; preload");
  res.headers.set("X-Frame-Options", "DENY");
  res.headers.set("X-Content-Type-Options", "nosniff");
  res.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  res.headers.set(
    "Permissions-Policy",
    'camera=(), microphone=(), geolocation=(), payment=(self "https://js.stripe.com" "https://checkout.stripe.com")'
  );
  return res;
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  const gate = gateFor(pathname);
  if (!gate || PUBLIC_EXACT.has(pathname)) {
    const pass = NextResponse.next();
    // First-touch referral attribution: ?ref=CODE → vsn_ref cookie (90 days), consumed by the join form.
    const ref = req.nextUrl.searchParams.get("ref");
    if (ref && /^[A-Za-z0-9-]{4,16}$/.test(ref) && !req.cookies.get(REFERRAL_COOKIE)) {
      pass.cookies.set(REFERRAL_COOKIE, ref.toUpperCase(), { maxAge: 90 * 24 * 60 * 60, path: "/", sameSite: "lax", httpOnly: true, secure: process.env.NODE_ENV === "production" });
    }
    // Standard invite link /invite/<code> → vsn_invite cookie, consumed by the expert/partner signup routes.
    const inviteMatch = pathname.match(/^\/invite\/([A-Za-z0-9]{6,40})$/);
    if (inviteMatch) {
      pass.cookies.set("vsn_invite", inviteMatch[1], { maxAge: 60 * 24 * 60 * 60, path: "/", sameSite: "lax", httpOnly: true, secure: process.env.NODE_ENV === "production" });
    }
    return securityHeaders(pass, url);
  }

  const res = NextResponse.next({ request: req });

  const deny = () => {
    if (gate.isApi) {
      return securityHeaders(NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 }), url);
    }
    const login = req.nextUrl.clone();
    login.pathname = gate.loginPath;
    login.search = pathname !== gate.loginPath ? `?next=${encodeURIComponent(pathname)}` : "";
    return securityHeaders(NextResponse.redirect(login), url);
  };

  if (process.env.NODE_ENV !== "production" && process.env.VSN_DEV_PREVIEW_BYPASS === "1" && gate.kind !== "admin") {
    return securityHeaders(res, url);
  }

  if (!url || !key) return deny();

  const supa = createServerClient(url, key, {
    cookies: {
      getAll: () => req.cookies.getAll(),
      setAll: (cookiesToSet) =>
        cookiesToSet.forEach(({ name, value, options }) => res.cookies.set(name, value, options)),
    },
  });

  const {
    data: { user },
  } = await supa.auth.getUser();
  if (!user?.email) return deny();

  // Row lookup by email with the service key (RLS-independent). Deny on any error.
  try {
    const email = encodeURIComponent(user.email);
    let q: string;
    let ok: (row: Record<string, unknown>) => boolean;
    if (gate.kind === "admin") {
      q = `${url}/rest/v1/admin_users?select=active&email=ilike.${email}&limit=1`;
      ok = (r) => r.active === true;
    } else if (gate.kind === "expert") {
      q = `${url}/rest/v1/experts?select=status&email=ilike.${email}&limit=1`;
      ok = (r) => r.status === "invited" || r.status === "active";
    } else {
      q = `${url}/rest/v1/partners?select=status&contact_email=ilike.${email}&limit=1`;
      ok = (r) => r.status === "pending" || r.status === "approved";
    }
    const rows = (await fetch(q, {
      headers: { apikey: serviceKey || key, Authorization: `Bearer ${serviceKey || key}` },
    }).then((r) => r.json())) as Array<Record<string, unknown>>;
    if (!Array.isArray(rows) || !rows[0] || !ok(rows[0])) return deny();
  } catch {
    return deny();
  }

  return securityHeaders(res, url);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|.*\\.(?:png|jpg|jpeg|gif|svg|ico|webp|avif|css|js|map|txt|xml|woff2?)$).*)"],
};
