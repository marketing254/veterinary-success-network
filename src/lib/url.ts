/** Accepts www.site.com or https://site.com; prefixes https. Returns null for anything else. */
export const LOOSE_URL_RE = /^(https?:\/\/)?([a-z0-9-]+\.)+[a-z]{2,}(:\d+)?(\/[^\s]*)?$/i;

export function normalizeWebUrl(v: string): string | null {
  const t = v.trim();
  if (!t || !LOOSE_URL_RE.test(t)) return null;
  return /^https?:\/\//i.test(t) ? t : `https://${t}`;
}
