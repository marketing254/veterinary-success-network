import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

function url(): string {
  const u = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!u) throw new Error("NEXT_PUBLIC_SUPABASE_URL is not set.");
  return u;
}

/**
 * Anon key for the cookie-bound (RLS-respecting) client. In production the
 * anon key is required; locally a missing anon key falls back to the service
 * key with a warning so a half-filled .env.local does not block sign-in.
 */
export function publicKey(): string {
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (anon) return anon;
  if (process.env.NODE_ENV === "production") throw new Error("NEXT_PUBLIC_SUPABASE_ANON_KEY is required in production.");
  const svc = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!svc) throw new Error("Set NEXT_PUBLIC_SUPABASE_ANON_KEY (Settings → API) in env.");
  console.warn("[supabase] NEXT_PUBLIC_SUPABASE_ANON_KEY missing; using the service key locally only.");
  return svc;
}

/** Cookie-bound client for route handlers: verifyOtp/signOut here read & write the session cookies. */
export function supabaseServer() {
  const store = cookies();
  return createServerClient(url(), publicKey(), {
    cookies: {
      getAll: () => store.getAll(),
      setAll: (cookiesToSet) => {
        try {
          cookiesToSet.forEach(({ name, value, options }) => store.set(name, value, options));
        } catch {
          // Called from a Server Component — safe to ignore; middleware refreshes sessions.
        }
      },
    },
  });
}

/** Plain anon client (no cookies) — used to trigger signInWithOtp sends. */
export function supabaseAnon() {
  return createClient(url(), publicKey(), { auth: { persistSession: false, autoRefreshToken: false } });
}
