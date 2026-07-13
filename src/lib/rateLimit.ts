/**
 * Simple in-memory rate limiter keyed by ip+email, mirroring the DMN reference.
 * Good enough for the waitlist phase on a single instance.
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
    // Opportunistic cleanup
    for (const [k, v] of buckets) {
      if (v.every((t) => now - t >= windowMs)) buckets.delete(k);
    }
  }
  return true;
}
