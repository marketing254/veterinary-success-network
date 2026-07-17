import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

const PUBLIC_PATHS = ["/admin/login", "/api/admin/login", "/api/admin/verify-otp"];

/** Gate /admin/* by a Supabase session + an active admin_users row, matched BY EMAIL
 *  (auth_user_id is null before the first sign-in — never gate on it). */
export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (PUBLIC_PATHS.includes(pathname)) return NextResponse.next();

  const res = NextResponse.next({ request: req });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  const deny = () => {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }
    const login = req.nextUrl.clone();
    login.pathname = "/admin/login";
    login.search = "";
    return NextResponse.redirect(login);
  };

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

  // Active allow-list row, by email (service-role read; falls back to deny on any error).
  try {
    const q = `${url}/rest/v1/admin_users?select=active&email=ilike.${encodeURIComponent(user.email)}&limit=1`;
    const rows = (await fetch(q, {
      headers: { apikey: serviceKey || key, Authorization: `Bearer ${serviceKey || key}` },
    }).then((r) => r.json())) as Array<{ active: boolean }>;
    if (!rows?.[0]?.active) return deny();
  } catch {
    return deny();
  }

  return res;
}

export const config = {
  matcher: ["/admin/:path*", "/api/admin/:path*"],
};
