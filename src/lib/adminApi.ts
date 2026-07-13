import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { ADMIN_COOKIE, verifySessionToken, AdminSession } from "./adminSession";
import { supabaseAdmin } from "./supabaseAdmin";

/** Session for the current admin API request (middleware already gates, this re-verifies). */
export async function requireAdmin(): Promise<AdminSession | NextResponse> {
  const session = await verifySessionToken(cookies().get(ADMIN_COOKIE)?.value);
  if (!session) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
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
