/** House profiles are listed first in the public directories. Match on email, then name. */
export const HOUSE_EXPERT_EMAILS = ["naren@ekwa.com"];
export const HOUSE_PARTNER_EMAILS = ["helpdesk@ekwa.com"];

export function houseFirst<T extends { email?: string | null; contact_email?: string | null; created_at?: string }>(rows: T[], houseEmails: string[]): T[] {
  const rank = (r: T) => {
    const e = (r.email ?? r.contact_email ?? "").toLowerCase();
    const i = houseEmails.indexOf(e);
    return i === -1 ? houseEmails.length : i;
  };
  return [...rows].sort((a, b) => rank(a) - rank(b) || (a.created_at ?? "").localeCompare(b.created_at ?? ""));
}
