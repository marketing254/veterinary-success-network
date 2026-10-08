/**
 * Email safety net. Runs on EVERY outbound message right before the transport.
 *
 * Sandbox ON  → the message is re-addressed to EMAIL_SANDBOX_TO (owner test inbox),
 *               cc/bcc dropped, subject prefixed with who it would have gone to.
 * Sandbox OFF → EMAIL_AUDIT_BCC addresses are added as silent BCC so staff see
 *               what clients receive without their addresses appearing in bodies.
 *
 * The sandbox is ON unless EMAIL_SANDBOX=false is set on purpose (Vercel Production).
 * Supabase Auth sign-in codes do not pass through here (they leave via the dashboard
 * SMTP) unless OTP_TRANSPORT=app, in which case they do.
 */

export const DEFAULT_SANDBOX_INBOX = "rushdhaakbar82@gmail.com";

export function emailListFromEnv(name: string, fallback: string[] = []): string[] {
  const raw = process.env[name];
  if (raw === undefined) return [...fallback];
  const list = raw.split(",").map((s) => s.trim()).filter(Boolean);
  return list.length > 0 ? list : [...fallback];
}

export function sandboxRecipient(): string {
  return process.env.EMAIL_SANDBOX_TO?.trim() || DEFAULT_SANDBOX_INBOX;
}

/** Sandbox is OFF unless EMAIL_SANDBOX=true is set on purpose (owner decision 2026-10-07: real delivery while testing). */
export function isEmailSandbox(): boolean {
  return (process.env.EMAIL_SANDBOX ?? "").trim().toLowerCase() === "true";
}

/** EMAIL_AUDIT_BCC: silent copies of every client-facing email (production only). */
export function auditBccList(): string[] {
  return emailListFromEnv("EMAIL_AUDIT_BCC", []);
}

/** TEST_MEMBER_EMAILS / HIDE_FROM_DIRECTORY_EMAILS helpers live in directoryVisibility.ts. */

function addressesOf(v: unknown): string[] {
  const list = Array.isArray(v) ? v : v ? [v] : [];
  return list
    .map((a) => (typeof a === "string" ? a : ((a as { address?: string })?.address ?? "")))
    .map((a) => a.replace(/^.*<([^>]+)>.*$/, "$1").trim().toLowerCase())
    .filter(Boolean);
}

export function withAuditBcc<T extends { to?: unknown; cc?: unknown; bcc?: unknown }>(msg: T): T {
  const audit = auditBccList().map((a) => a.toLowerCase());
  if (audit.length === 0) return msg;
  const visible = new Set([...addressesOf(msg.to), ...addressesOf(msg.cc)]);
  if (audit.some((a) => visible.has(a))) return msg; // team alert already goes there
  const merged = [...new Set([...addressesOf(msg.bcc), ...audit])];
  return { ...msg, bcc: merged };
}

function describe(v: unknown): string {
  return addressesOf(v).join(", ");
}

export type SandboxResult<T> = { message: T; sandboxed: boolean; originalTo: string };

export function applyEmailSandbox<T extends { to?: unknown; cc?: unknown; bcc?: unknown; subject?: string }>(
  msg: T
): SandboxResult<T> {
  const originalTo = describe(msg.to);
  if (!isEmailSandbox()) return { message: withAuditBcc(msg), sandboxed: false, originalTo };

  const parts = [`would go to ${originalTo || "(nobody)"}`];
  const cc = describe(msg.cc);
  const bcc = describe(msg.bcc);
  if (cc) parts.push(`cc ${cc}`);
  if (bcc) parts.push(`bcc ${bcc}`);
  const label = parts.join("; ");
  const target = sandboxRecipient();
  console.info(`[email-sandbox] redirected to ${target} (${label})`);
  return {
    message: { ...msg, to: target, cc: undefined, bcc: undefined, subject: `[TEST · ${label}] ${msg.subject ?? ""}`.trimEnd() },
    sandboxed: true,
    originalTo,
  };
}
