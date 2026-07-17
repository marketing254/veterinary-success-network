import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "./supabaseAdmin";
import { requireAdmin, isResponse, logAction, toCsv, csvResponse } from "./adminApi";
import { clean } from "./signup";

export type EntityConfig = {
  table: string;
  entityType: string;
  searchColumns: string[];
  csvColumns: [string, string][];
  orderBy: { column: string; ascending: boolean };
  /** action name -> resulting status */
  actions: Record<string, string>;
  /** table has reviewed_by / reviewed_at columns */
  review: boolean;
  /** table has decision_note column */
  decisionNote?: boolean;
  /** called after a successful status change, with the row's status BEFORE the update */
  afterAction?: (
    adminEmail: string,
    row: Record<string, any>,
    action: string,
    priorStatus: string
  ) => Promise<void>;
};

export function makeHandlers(cfg: EntityConfig) {
  async function GET(req: NextRequest) {
    const session = await requireAdmin();
    if (isResponse(session)) return session;

    const url = new URL(req.url);
    const status = clean(url.searchParams.get("status"), 40);
    const q = clean(url.searchParams.get("q"), 120).replace(/[,()]/g, " ").trim();
    const format = url.searchParams.get("format");

    let query = supabaseAdmin()
      .from(cfg.table)
      .select("*")
      .order(cfg.orderBy.column, { ascending: cfg.orderBy.ascending })
      .limit(1000);

    if (status && status !== "all") query = query.eq("status", status);
    if (q) query = query.or(cfg.searchColumns.map((c) => `${c}.ilike.%${q}%`).join(","));

    const { data, error } = await query;
    if (error) {
      console.error(`${cfg.table} list failed:`, error);
      return NextResponse.json({ ok: false, error: "Query failed." }, { status: 500 });
    }

    if (format === "csv") {
      return csvResponse(toCsv(data || [], cfg.csvColumns), `vsn-${cfg.table}.csv`);
    }
    return NextResponse.json({ ok: true, rows: data || [] });
  }

  async function PATCH(req: NextRequest) {
    const session = await requireAdmin();
    if (isResponse(session)) return session;

    let body: Record<string, unknown>;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ ok: false, error: "Invalid request." }, { status: 400 });
    }

    const id = clean(body.id, 60);
    const action = clean(body.action, 40);
    const note = clean(body.note, 1000);
    const newStatus = cfg.actions[action];
    if (!id || !newStatus) {
      return NextResponse.json({ ok: false, error: "Unknown action." }, { status: 400 });
    }

    const db = supabaseAdmin();
    const { data: prior } = await db.from(cfg.table).select("status").eq("id", id).maybeSingle();
    if (!prior) return NextResponse.json({ ok: false, error: "Not found." }, { status: 404 });

    const update: Record<string, unknown> = { status: newStatus };
    if (cfg.review) {
      update.reviewed_by = session.email;
      update.reviewed_at = new Date().toISOString();
    }
    if (cfg.decisionNote && note) update.decision_note = note;

    const { data, error } = await db.from(cfg.table).update(update).eq("id", id).select().maybeSingle();

    if (error || !data) {
      console.error(`${cfg.table} update failed:`, error);
      return NextResponse.json({ ok: false, error: "Update failed." }, { status: 500 });
    }

    await logAction(session.email, cfg.entityType, id, action, note || undefined);
    if (cfg.afterAction) {
      try {
        await cfg.afterAction(session.email, data, action, prior.status);
      } catch (err) {
        console.error(`${cfg.table} afterAction failed (action still applied):`, err);
      }
    }
    return NextResponse.json({ ok: true, row: data });
  }

  return { GET, PATCH };
}
