import { randomBytes } from "crypto";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

/**
 * Referral codes for experts and partners (migration 0015).
 * code: 8 chars A-Z0-9 (shown on the card). slug: vanity handle for /<slug>.
 * Lookups must validate /^[A-Z0-9-]{4,16}$/i before any ilike.
 */
const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function makeCode(len = 8): string {
  const bytes = randomBytes(len);
  let out = "";
  for (let i = 0; i < len; i++) out += ALPHABET[bytes[i] % ALPHABET.length];
  return out;
}

export function slugify(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 36);
}

export const CODE_RE = /^[A-Z0-9-]{4,16}$/i;

async function getOrCreate(owner: { expert_id?: string; partner_id?: string }, name: string) {
  const db = supabaseAdmin();
  const col = owner.expert_id ? "expert_id" : "partner_id";
  const id = owner.expert_id || owner.partner_id!;
  const { data: existing } = await db.from("referral_codes").select("id, code, slug").eq(col, id).maybeSingle();
  if (existing) return { id: existing.id as string, code: existing.code as string, slug: (existing.slug as string | null) ?? null };

  const base = slugify(name) || "vsn";
  for (let attempt = 0; attempt < 6; attempt++) {
    const code = makeCode();
    const slug = attempt === 0 ? base : `${base}-${makeCode(3).toLowerCase()}`;
    const { data, error } = await db
      .from("referral_codes")
      .insert({ ...owner, code, slug: slug.length >= 3 ? slug : null })
      .select("id, code, slug")
      .single();
    if (!error && data) return { id: data.id as string, code: data.code as string, slug: (data.slug as string | null) ?? null };
    if (error && error.code !== "23505") throw new Error(`referral_codes insert failed: ${error.message}`);
  }
  throw new Error("Could not allocate a referral code.");
}

export function getOrCreateExpertReferral(expertId: string, name: string) {
  return getOrCreate({ expert_id: expertId }, name);
}
export function getOrCreatePartnerReferral(partnerId: string, name: string) {
  return getOrCreate({ partner_id: partnerId }, name);
}

export async function referralStats(codeId: string) {
  const db = supabaseAdmin();
  const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const { data } = await db.from("referral_signups").select("created_at, converted_at").eq("code_id", codeId);
  const rows = data ?? [];
  return {
    signupsLifetime: rows.length,
    signupsLast30: rows.filter((r) => r.created_at >= cutoff).length,
    conversions: rows.filter((r) => !!r.converted_at).length,
  };
}

export function siteOrigin(): string {
  return (process.env.NEXT_PUBLIC_SITE_URL || "https://www.veterinarysuccessnetwork.com").replace(/\/$/, "");
}
