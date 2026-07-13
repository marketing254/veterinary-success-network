import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { hashIp, requestIp } from "./ipHash";
import { rateLimit } from "./rateLimit";

export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function clean(v: unknown, max = 2000): string {
  return typeof v === "string" ? v.trim().slice(0, max) : "";
}

export function ok(message?: string) {
  return NextResponse.json({ ok: true, ...(message ? { message } : {}) });
}

export function bad(message: string, status = 400) {
  return NextResponse.json({ ok: false, error: message }, { status });
}

/**
 * Shared pre-flight for every public signup route.
 * Returns a response to short-circuit with, or the request context to proceed.
 */
export function preflight(
  req: NextRequest,
  body: Record<string, unknown>,
  email: string
): { block: NextResponse } | { block?: undefined; ipHash: string; userAgent: string } {
  // Honeypot: pretend success so bots learn nothing.
  if (clean(body.bt)) return { block: ok() };
  if (!EMAIL_RE.test(email)) return { block: bad("Please enter a valid email address.") };
  const ip = requestIp(req);
  if (!rateLimit(`${ip}:${email.toLowerCase()}`)) {
    return { block: bad("Too many attempts. Please try again in a little while.", 429) };
  }
  return { ipHash: hashIp(ip), userAgent: clean(req.headers.get("user-agent"), 400) };
}

export function isUniqueViolation(error: { code?: string } | null): boolean {
  return !!error && error.code === "23505";
}
