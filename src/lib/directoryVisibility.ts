/**
 * Which experts and partners may appear on the PUBLIC site (/experts, /partners,
 * profile pages, directory APIs). Hidden on top of the approved + photo + bio gate:
 *   BILLING_BYPASS_EMAILS, TEST_MEMBER_EMAILS, HIDE_FROM_DIRECTORY_EMAILS
 *   (comma lists; "*@domain.com" and "prefix*" wildcards) and any +test / +vsn /
 *   +qa / +demo plus-alias. Portals and the admin console are NOT affected.
 */
function list(name: string): string[] {
  return (process.env[name] ?? "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}

function matches(pattern: string, email: string): boolean {
  if (!pattern.includes("*")) return pattern === email;
  const re = new RegExp(`^${pattern.replace(/[.+?^${}()|[\]\\]/g, "\\$&").replace(/\*/g, ".*")}$`);
  return re.test(email);
}

export function isHiddenFromDirectory(email: string | null | undefined): boolean {
  if (!email) return false;
  const e = email.trim().toLowerCase();
  if (/^[^@]+\+(test|vsn|qa|demo)[^@]*@/.test(e)) return true;
  const patterns = [...list("BILLING_BYPASS_EMAILS"), ...list("TEST_MEMBER_EMAILS"), ...list("HIDE_FROM_DIRECTORY_EMAILS")];
  return patterns.some((p) => matches(p, e));
}
