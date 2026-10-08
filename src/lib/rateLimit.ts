/**
 * Rate limiting.
 *
 * rateLimit(key, max, windowMs)      synchronous, in-memory (kept for the public signup
 *                                    routes that already use it; single-instance only).
 * checkRateLimit(key, opts)          async, durable: Postgres RPC check_rate_limit
 *                                    (migration 0010) so the limit holds across serverless
 *                                    instances; falls back to memory when the RPC is missing.
 * Default for checkRateLimit: 5 hits per key per 10 minutes. Keys in use:
 *   expert-login, expert-verify, partner-login, partner-verify (+ admin-login/admin-verify
 *   through rateLimit). When a legitimate flow trips a limit raise THAT key, not the default.
 */
const buckets = new Map<string, number[]>();

export function rateLimit(key: string, max = 6, windowMs = 60 * 60 * 1000): boolean {
  const now = Date.now();
  const hits = (buckets.get(key) || []).filter((t) => now - t < windowMs);
  if (hits.length >= max) {
    buckets.set(key, hits);
    return false; // limited
  }
  hits.push(now);
  buckets.set(key, hits);
  if (buckets.size > 5000) {
    for (const [k, v] of buckets) {
      if (v.every((t) => now - t >= windowMs)) buckets.delete(k);
    }
  }
  return true;
}

export const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000;
export const RATE_LIMIT_MAX_HITS = 5;

export type RateLimitResult = { allowed: boolean; retryAfterSec?: number };

let rpcUnavailable = false;

function isMissingFunction(err: { code?: string; message?: string } | null): boolean {
  if (!err) return false;
  if (err.code === "42883" || err.code === "PGRST202") return true;
  const msg = (err.message ?? "").toLowerCase();
  return msg.includes("check_rate_limit") && (msg.includes("does not exist") || msg.includes("could not find"));
}

export async function checkRateLimit(
  key: string,
  opts?: { maxHits?: number; windowMs?: number }
): Promise<RateLimitResult> {
  const maxHits = opts?.maxHits ?? RATE_LIMIT_MAX_HITS;
  const windowMs = opts?.windowMs ?? RATE_LIMIT_WINDOW_MS;
  const windowSeconds = Math.floor(windowMs / 1000);

  if (!rpcUnavailable) {
    try {
      const { supabaseAdmin } = await import("./supabaseAdmin");
      const { data, error } = await supabaseAdmin().rpc("check_rate_limit", {
        p_key: key,
        p_limit: maxHits,
        p_window_seconds: windowSeconds,
      });
      if (error) {
        if (isMissingFunction(error)) {
          rpcUnavailable = true;
          console.warn("[rate-limit] check_rate_limit RPC not found (run migration 0010); using memory.");
        } else {
          console.warn("[rate-limit] RPC error; using memory.", error.message);
        }
      } else if (typeof data === "boolean") {
        return data ? { allowed: true } : { allowed: false, retryAfterSec: windowSeconds };
      }
    } catch (err) {
      console.warn("[rate-limit] RPC unavailable; using memory.", err);
    }
  }
  const allowed = rateLimit(key, maxHits, windowMs);
  return allowed ? { allowed: true } : { allowed: false, retryAfterSec: windowSeconds };
}
