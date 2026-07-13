import { createHash } from "crypto";

export function otpHash(code: string): string {
  const salt = process.env.ADMIN_SESSION_SECRET || "vsn-dev-session-secret-change-me";
  return createHash("sha256").update(`${salt}:${code}`).digest("hex");
}
