import { NextResponse } from "next/server";
import { supabaseAdmin } from "./supabaseAdmin";
import { supabaseServer } from "./supabaseServer";

export type AdminSession = { email: string; name: string; role: string; userId: string };

/**
 * Guard for every /api/admin/* handler (ASN model): Supabase session cookie →
 * active admin_users row matched BY EMAIL. Side effects: links auth_user_id
 * (null until first sign-in) and bumps last_active_at.
 */
export async function requireAdmin(): Promise<AdminSession | NextResponse> {
  const supa = supabaseServer();
  const {
    data: { user },
  } = await supa.auth.getUser();
  if (!user?.email) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const db = supabaseAdmin();
  const { data: row } = await db
    .from("admin_users")
    .select("id, email, full_name, role, active, auth_user_id")
    .ilike("email", user.email)
    .maybeSingle();

  if (!row || !row.active) {
    return NextResponse.json({ ok: false, error: "Not an active admin." }, { status: 403 });
  }

  // Best-effort: keep the auth link + activity fresh (columns exist after migration 0009).
  db.from("admin_users")
    .update({ auth_user_id: user.id, last_active_at: new Date().toISOString() })
    .eq("id", row.id)
    .then(({ error }) => {
      if (error) console.error("admin_users activity update failed:", error.message);
    });

  return { email: row.email, name: row.full_name, role: row.role, userId: user.id };
}

/** Same as requireAdmin, plus the owner role (admin-team mutations). */
export async function requireOwner(): Promise<AdminSession | NextResponse> {
  const session = await requireAdmin();
  if (isResponse(session)) return session;
  if (session.role !== "owner") {
    return NextResponse.json(
      { ok: false, error: "Only an owner can manage the admin team." },
      { status: 403 }
    );
  }
  return session;
}

export function isResponse(v: AdminSession | NextResponse): v is NextResponse {
  return v instanceof NextResponse;
}

export async function logAction(
  adminEmail: string,
  entityType: string,
  entityId: string,
  action: string,
  note?: string
) {
  const { error } = await supabaseAdmin().from("review_actions").insert({
    admin_email: adminEmail,
    entity_type: entityType,
    entity_id: entityId,
    action,
    note: note || null,
  });
  if (error) console.error("review_actions insert failed:", error);
}

export function toCsv(rows: Record<string, unknown>[], columns: [string, string][]): string {
  const esc = (v: unknown) => {
    const s = v == null ? "" : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const header = columns.map(([, label]) => esc(label)).join(",");
  const body = rows.map((r) => columns.map(([key]) => esc(r[key])).join(",")).join("\n");
  return `${header}\n${body}`;
}

export function csvResponse(csv: string, filename: string): NextResponse {
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
