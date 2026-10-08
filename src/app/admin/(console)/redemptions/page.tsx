"use client";

import { FormEvent, useState } from "react";
import { fmtDate, StatusBadge } from "@/components/admin/RecordsPage";
import { adminApi, useAdminList, useFlash, Head } from "@/components/admin/useAdmin";

type R = { id: string; company: string; offer: string; promo_code: string | null; member_display: string; member_location: string | null; amount_saved: number | null; status: string; redeemed_on: string; notes: string | null; created_by: string | null };
type Opt = { id: string; label: string };

export default function RedemptionsAdminPage() {
  const { rows, extra, loading, reload } = useAdminList<R>("/api/admin/redemptions");
  const offers = (extra.offers as Opt[] | undefined) ?? [];
  const { flash, Msg } = useFlash();
  const [f, setF] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  async function log(ev: FormEvent) {
    ev.preventDefault();
    setBusy(true);
    const r = await adminApi("/api/admin/redemptions", { method: "POST", body: JSON.stringify(f) });
    setBusy(false);
    if (r.ok) { flash("ok", "Logged. The partner sees it in their portal."); setF({}); reload(); } else flash("err", r.data.error || "Failed.");
  }
  async function setSt(id: string, status: string) {
    const r = await adminApi("/api/admin/redemptions", { method: "PATCH", body: JSON.stringify({ id, status }) });
    if (r.ok) reload(); else flash("err", r.data.error || "Failed.");
  }
  const total = rows.filter((r) => r.status === "confirmed").reduce((s, r) => s + Number(r.amount_saved || 0), 0);

  return (
    <>
      <Head title="Redemptions" sub="Log a member using a partner offer. Partners see first name and location only. Member self-service redemption arrives with the member portal.">
        <span className="adm-chip">${Math.round(total).toLocaleString()} saved for members</span>
      </Head>
      {Msg}
      <div className="adm-card">
        <div className="hd"><h2>Log a redemption</h2></div>
        <form className="adm-form" onSubmit={log}>
          <div className="frow full"><label className="flab">Offer</label><select required value={f.offer_id || ""} onChange={(e) => setF({ ...f, offer_id: e.target.value })}><option value="">Choose an approved offer…</option>{offers.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}</select></div>
          <div className="frow"><label className="flab">Member (first name or Dr. Lastname)</label><input type="text" required value={f.member_display || ""} onChange={(e) => setF({ ...f, member_display: e.target.value })} /></div>
          <div className="frow"><label className="flab">Location</label><input type="text" value={f.member_location || ""} onChange={(e) => setF({ ...f, member_location: e.target.value })} placeholder="Austin, TX" /></div>
          <div className="frow"><label className="flab">Amount saved ($)</label><input type="text" inputMode="decimal" value={f.amount_saved || ""} onChange={(e) => setF({ ...f, amount_saved: e.target.value })} /></div>
          <div className="frow"><label className="flab">Date</label><input type="date" value={f.redeemed_on || ""} onChange={(e) => setF({ ...f, redeemed_on: e.target.value })} /></div>
          <div className="frow full"><label className="flab">Notes</label><input type="text" value={f.notes || ""} onChange={(e) => setF({ ...f, notes: e.target.value })} /></div>
          <div className="actions"><button className="adm-btn primary" disabled={busy || offers.length === 0}>Log redemption</button>{offers.length === 0 && <span style={{ fontSize: 12.5, color: "var(--muted)" }}>Approve an offer first.</span>}</div>
        </form>
      </div>
      <div className="adm-card">
        <div className="adm-tablewrap">
          <table className="adm-table">
            <thead><tr><th>Date</th><th>Partner · offer</th><th>Member</th><th>Saved</th><th>Status</th><th>Logged by</th><th></th></tr></thead>
            <tbody>
              {rows.length === 0 && !loading && <tr><td colSpan={7}><div className="adm-empty">No redemptions logged yet.</div></td></tr>}
              {rows.map((r) => (
                <tr key={r.id}>
                  <td>{fmtDate(r.redeemed_on)}</td>
                  <td className="em">{r.company}<span className="sub">{r.offer}{r.promo_code ? ` (${r.promo_code})` : ""}</span></td>
                  <td>{r.member_display}{r.member_location ? `, ${r.member_location}` : ""}{r.notes && <span className="sub">{r.notes}</span>}</td>
                  <td>{r.amount_saved != null ? `$${Number(r.amount_saved).toLocaleString()}` : "—"}</td>
                  <td><StatusBadge status={r.status} /></td>
                  <td>{r.created_by || "—"}</td>
                  <td style={{ whiteSpace: "nowrap" }}>
                    {r.status !== "confirmed" && <button className="adm-btn sm" onClick={() => setSt(r.id, "confirmed")}>Confirm</button>}
                    {r.status !== "voided" && <button className="adm-btn sm danger" onClick={() => setSt(r.id, "voided")}>Void</button>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
