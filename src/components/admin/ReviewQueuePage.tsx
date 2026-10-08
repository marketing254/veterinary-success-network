"use client";

import { useState } from "react";
import { fmtDate, StatusBadge } from "@/components/admin/RecordsPage";
import { adminApi, useAdminList, useFlash, Head } from "./useAdmin";

type Owner = { id: string; name: string; email: string; contact?: string };
export type ReviewItem = Record<string, unknown> & { id: string; status: string; owner: Owner | null; review_note: string | null; created_at: string; reviewed_by?: string | null; reviewed_at?: string | null };

type Props<T extends ReviewItem> = {
  title: string;
  sub: string;
  endpoint: string;
  itemKind: "kit" | "catalog item" | "offer";
  renderBody: (item: T) => React.ReactNode;
  /** kits only: ask for a published URL on approve */
  askPublishedUrl?: boolean;
};

export default function ReviewQueuePage<T extends ReviewItem>({ title, sub, endpoint, itemKind, renderBody, askPublishedUrl }: Props<T>) {
  const [status, setStatus] = useState("pending_review");
  const { rows, loading, reload } = useAdminList<T>(`${endpoint}?status=${status}`);
  const { flash, Msg } = useFlash();
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [urls, setUrls] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  async function act(item: T, action: string) {
    if (action === "reject" && !confirm(`Decline this ${itemKind}? The owner is emailed.`)) return;
    setBusy(true);
    const r = await adminApi(endpoint, { method: "PATCH", body: JSON.stringify({ id: item.id, action, note: notes[item.id] || "", published_url: urls[item.id] || "" }) });
    setBusy(false);
    if (r.ok) { flash("ok", `Done: ${action.replace(/_/g, " ")}. The owner has been notified.`); reload(); } else flash("err", r.data.error || "Failed.");
  }

  return (
    <>
      <Head title={title} sub={sub} />
      {Msg}
      <div className="adm-card">
        <div className="adm-bar">
          <select value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="pending_review">Awaiting review</option><option value="needs_changes">Needs changes</option><option value="approved">Approved</option><option value="rejected">Declined</option><option value="archived">Archived</option><option value="all">All</option>
          </select>
          <span style={{ marginLeft: "auto", fontSize: 12.5, color: "var(--muted)" }}>{loading ? "Loading…" : `${rows.length} item${rows.length === 1 ? "" : "s"}`}</span>
        </div>
        <div className="adm-review">
          {rows.length === 0 && !loading && <div className="adm-empty">Nothing in this queue.</div>}
          {rows.map((item) => (
            <div className="adm-item" key={item.id}>
              <div>
                {renderBody(item)}
                <div className="meta">
                  <StatusBadge status={item.status} />
                  <span>{item.owner ? `${item.owner.name}${item.owner.contact ? ` (${item.owner.contact})` : ""} · ${item.owner.email}` : "Owner unknown"}</span>
                  <span>Submitted {fmtDate(item.created_at)}</span>
                  {item.reviewed_by && <span>Reviewed by {item.reviewed_by} {fmtDate(item.reviewed_at || undefined)}</span>}
                  {item.review_note && <span>Note: {item.review_note}</span>}
                </div>
              </div>
              <div className="side">
                {askPublishedUrl && item.status !== "approved" && <input type="text" placeholder="Published URL (optional, member library link)" value={urls[item.id] || ""} onChange={(e) => setUrls({ ...urls, [item.id]: e.target.value })} />}
                <textarea placeholder="Note to the owner (required for Needs changes)" value={notes[item.id] || ""} onChange={(e) => setNotes({ ...notes, [item.id]: e.target.value })} />
                <div className="btns">
                  {item.status !== "approved" && <button className="adm-btn primary sm" disabled={busy} onClick={() => act(item, "approve")}>Approve</button>}
                  {item.status !== "needs_changes" && item.status !== "approved" && <button className="adm-btn sm" disabled={busy} onClick={() => act(item, "needs_changes")}>Needs changes</button>}
                  {item.status !== "rejected" && item.status !== "approved" && <button className="adm-btn danger sm" disabled={busy} onClick={() => act(item, "reject")}>Decline</button>}
                  {item.status === "approved" && <button className="adm-btn sm" disabled={busy} onClick={() => act(item, "archive")}>Unpublish</button>}
                  {(item.status === "rejected" || item.status === "archived") && <button className="adm-btn sm" disabled={busy} onClick={() => act(item, "reopen")}>Reopen</button>}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
