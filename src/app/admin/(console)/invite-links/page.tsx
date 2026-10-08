"use client";

import { FormEvent, useState } from "react";
import { fmtDate, StatusBadge } from "@/components/admin/RecordsPage";
import { adminApi, useAdminList, useFlash, Head } from "@/components/admin/useAdmin";

type Link = { id: string; code: string; url: string; kind: string; full_name: string; email: string | null; company_name: string | null; notes: string | null; status: string; viewed_at: string | null; accepted_at: string | null; expires_at: string; created_by: string | null; created_at: string };

export default function InviteLinksPage() {
  const { rows, loading, reload } = useAdminList<Link>("/api/admin/invite-links");
  const { flash, Msg } = useFlash();
  const [f, setF] = useState<Record<string, string>>({ kind: "expert" });
  const [busy, setBusy] = useState(false);

  async function create(ev: FormEvent) {
    ev.preventDefault();
    setBusy(true);
    const r = await adminApi<{ row: Link }>("/api/admin/invite-links", { method: "POST", body: JSON.stringify(f) });
    setBusy(false);
    if (r.ok) { flash("ok", `Link created: ${r.data.row.url}`); navigator.clipboard?.writeText(r.data.row.url); setF({ kind: "expert" }); reload(); } else flash("err", r.data.error || "Failed.");
  }
  async function act(id: string, action: string) {
    const r = await adminApi("/api/admin/invite-links", { method: "PATCH", body: JSON.stringify({ id, action }) });
    if (r.ok) reload(); else flash("err", r.data.error || "Failed.");
  }

  return (
    <>
      <Head title="Invite links" sub="Personal links for prospects you email yourself: /invite/<code> greets them by name and sends them to the normal application form. No agreement, no payment, standard terms. Founding terms use Founding invites instead." />
      {Msg}
      <div className="adm-card">
        <div className="hd"><h2>Create a link</h2></div>
        <form className="adm-form" onSubmit={create}>
          <div className="frow"><label className="flab">Kind</label><select value={f.kind} onChange={(e) => setF({ ...f, kind: e.target.value })}><option value="expert">Expert</option><option value="partner">Partner</option></select></div>
          <div className="frow"><label className="flab">Name</label><input type="text" required value={f.full_name || ""} onChange={(e) => setF({ ...f, full_name: e.target.value })} /></div>
          <div className="frow"><label className="flab">Email (optional)</label><input type="email" value={f.email || ""} onChange={(e) => setF({ ...f, email: e.target.value })} /></div>
          <div className="frow"><label className="flab">Company (optional)</label><input type="text" value={f.company_name || ""} onChange={(e) => setF({ ...f, company_name: e.target.value })} /></div>
          <div className="frow full"><label className="flab">Internal note</label><input type="text" value={f.notes || ""} onChange={(e) => setF({ ...f, notes: e.target.value })} /></div>
          <div className="actions"><button className="adm-btn primary" disabled={busy}>Create and copy link</button></div>
        </form>
      </div>
      <div className="adm-card">
        <div className="adm-tablewrap">
          <table className="adm-table">
            <thead><tr><th>Person</th><th>Kind</th><th>Link</th><th>Status</th><th>Created</th><th></th></tr></thead>
            <tbody>
              {rows.length === 0 && !loading && <tr><td colSpan={6}><div className="adm-empty">No links yet.</div></td></tr>}
              {rows.map((r) => (
                <tr key={r.id}>
                  <td className="em">{r.full_name}<span className="sub">{[r.email, r.company_name].filter(Boolean).join(" · ") || "—"}{r.notes ? ` · ${r.notes}` : ""}</span></td>
                  <td><StatusBadge status={r.kind} /></td>
                  <td><span className="adm-copy"><code>{r.url}</code><button className="adm-btn sm" onClick={() => navigator.clipboard?.writeText(r.url)}>Copy</button></span></td>
                  <td><StatusBadge status={r.status} />{r.accepted_at ? <span className="sub">applied {fmtDate(r.accepted_at)}</span> : r.viewed_at ? <span className="sub">viewed {fmtDate(r.viewed_at)}</span> : null}</td>
                  <td>{fmtDate(r.created_at)}<span className="sub">{r.created_by}</span></td>
                  <td style={{ whiteSpace: "nowrap" }}>{r.status === "revoked" ? <button className="adm-btn sm" onClick={() => act(r.id, "reactivate")}>Reactivate</button> : r.status !== "accepted" && <button className="adm-btn sm danger" onClick={() => act(r.id, "revoke")}>Revoke</button>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
