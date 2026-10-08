import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { requireAdmin, isResponse, logAction } from "@/lib/adminApi";
import { clean } from "@/lib/signup";
import { normalizeWebUrl } from "@/lib/url";
import { notify } from "@/lib/notify";
import { sendReviewDecisionEmail } from "@/lib/email/adminEmails";

/**
 * One handler factory for the three review queues (expert kits, partner catalog
 * items, partner offers). GET lists with the owner joined; PATCH applies
 * approve / needs_changes / reject / archive, notifies the owner (bell + email)
 * and logs the action.
 */
type Cfg = {
  table: string;
  statusCol: "status" | "review_status";
  ownerCol: "expert_id" | "partner_id";
  ownerTable: "experts" | "partners";
  entityType: string;
  itemKind: "kit" | "catalog item" | "offer";
  titleCol: string;
  selectCols: string;
  portalLink: string;
};

export function makeReviewHandlers(cfg: Cfg) {
  const ownerSelect = cfg.ownerTable === "experts" ? "experts(id, full_name, display_name, email)" : "partners(id, company_name, display_name, contact_name, contact_email)";

  async function GET(req: NextRequest) {
    const session = await requireAdmin();
    if (isResponse(session)) return session;
    const status = clean(new URL(req.url).searchParams.get("status"), 30) || "pending_review";
    const db = supabaseAdmin();
    let q = db.from(cfg.table).select(`${cfg.selectCols}, ${ownerSelect}`).order("created_at", { ascending: false }).limit(500);
    if (status !== "all") q = q.eq(cfg.statusCol, status);
    const { data, error } = await q;
    if (error) return NextResponse.json({ ok: false, error: "Query failed." }, { status: 500 });
    const rows = ((data ?? []) as unknown as Record<string, unknown>[]).map((r) => {
      const rec = r;
      const own = (Array.isArray(rec[cfg.ownerTable]) ? (rec[cfg.ownerTable] as unknown[])[0] : rec[cfg.ownerTable]) as Record<string, string> | null;
      const owner = own
        ? cfg.ownerTable === "experts"
          ? { id: own.id, name: own.display_name || own.full_name, email: own.email }
          : { id: own.id, name: own.display_name || own.company_name, contact: own.contact_name, email: own.contact_email }
        : null;
      const { [cfg.ownerTable]: _o, ...rest } = rec;
      void _o;
      return { ...rest, status: rec[cfg.statusCol], owner };
    });
    // signed download for kits
    if (cfg.table === "expert_resources") {
      for (const r of rows as Array<Record<string, unknown>>) {
        if (r.storage_path) {
          const { data: s } = await db.storage.from("expert-resources").createSignedUrl(String(r.storage_path), 900);
          r.downloadUrl = s?.signedUrl ?? null;
        }
      }
    }
    return NextResponse.json({ ok: true, rows });
  }

  async function PATCH(req: NextRequest) {
    const session = await requireAdmin();
    if (isResponse(session)) return session;
    const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
    if (!body) return NextResponse.json({ ok: false, error: "Invalid request." }, { status: 400 });
    const id = clean(body.id, 60);
    const action = clean(body.action, 30);
    const note = clean(body.note, 2000) || null;
    const map: Record<string, string> = { approve: "approved", needs_changes: "needs_changes", reject: "rejected", archive: "archived", reopen: "pending_review" };
    const next = map[action];
    if (!next) return NextResponse.json({ ok: false, error: "Unknown action." }, { status: 400 });
    if (action === "needs_changes" && !note) return NextResponse.json({ ok: false, error: "Tell them what to change (note required)." }, { status: 400 });

    const db = supabaseAdmin();
    const { data: row } = await db.from(cfg.table).select(`id, ${cfg.titleCol}, ${cfg.ownerCol}, ${ownerSelect}`).eq("id", id).maybeSingle();
    if (!row) return NextResponse.json({ ok: false, error: "Not found." }, { status: 404 });
    const rec = row as unknown as Record<string, unknown>;
    const now = new Date().toISOString();
    const patch: Record<string, unknown> = { [cfg.statusCol]: next, review_note: note, reviewed_at: now, reviewed_by: session.email };
    if (action === "approve") {
      patch.approved_at = now;
      if (cfg.table === "expert_resources") {
        patch.published_at = now;
        const url = clean(body.published_url, 500);
        if (url) {
          const u = normalizeWebUrl(url);
          if (!u) return NextResponse.json({ ok: false, error: "Invalid published URL." }, { status: 400 });
          patch.published_url = u;
        }
      }
    }
    const { error } = await db.from(cfg.table).update(patch).eq("id", id);
    if (error) return NextResponse.json({ ok: false, error: "Update failed." }, { status: 500 });
    await logAction(session.email, cfg.entityType, id, action, note || undefined);

    const own = (Array.isArray(rec[cfg.ownerTable]) ? (rec[cfg.ownerTable] as unknown[])[0] : rec[cfg.ownerTable]) as Record<string, string> | null;
    const title = String(rec[cfg.titleCol] ?? cfg.itemKind);
    if (own && ["approve", "needs_changes", "reject"].includes(action)) {
      const decision = next as "approved" | "needs_changes" | "rejected";
      const audience = cfg.ownerTable === "experts" ? "expert" : "partner";
      await notify({
        audience,
        expertId: audience === "expert" ? own.id : null,
        partnerId: audience === "partner" ? own.id : null,
        kind: `${cfg.entityType}_${decision}`,
        title: decision === "approved" ? `${title} is live` : decision === "needs_changes" ? `${title}: one more pass` : `${title} was not published`,
        body: note,
        link: cfg.portalLink,
      });
      await sendReviewDecisionEmail({
        to: audience === "expert" ? own.email : own.contact_email,
        name: audience === "expert" ? own.display_name || own.full_name : own.contact_name,
        audience,
        itemKind: cfg.itemKind,
        itemTitle: title,
        decision,
        note,
        publishedUrl: typeof patch.published_url === "string" ? patch.published_url : null,
      });
    }
    return NextResponse.json({ ok: true });
  }

  return { GET, PATCH };
}
