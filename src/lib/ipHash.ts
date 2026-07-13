import { createHash } from "crypto";
import type { NextRequest } from "next/server";

/** Salted hash of the caller IP. Raw IPs are never stored; the salt must never rotate after launch. */
export function hashIp(ip: string): string {
  const salt = process.env.IP_HASH_SALT || process.env.SIGNUP_IP_SALT || "vsn-dev-salt";
  return createHash("sha256").update(`${salt}:${ip}`).digest("hex");
}

export function requestIp(req: NextRequest): string {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  return req.headers.get("x-real-ip") || "0.0.0.0";
}
