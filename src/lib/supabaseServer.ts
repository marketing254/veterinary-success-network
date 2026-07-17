import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

function url(): string {
  const u = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!u) throw new Error("NEXT_PUBLIC_SUPABASE_URL is not set.");
  return u;
}

/** Anon key preferred; server-only fallback to the service key so a missing anon key never breaks login. */
export function publicKey(): string {
  const k = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!k) throw new Error("Set NEXT_PUBLIC_SUPABASE_ANON_KEY (Settings → API) in env.");
  return k;
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
