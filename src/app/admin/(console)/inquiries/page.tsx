"use client";

import { FormEvent, useEffect, useState } from "react";
import { fmtDate, StatusBadge } from "@/components/admin/RecordsPage";
import { adminApi, useAdminList, useFlash, Head } from "@/components/admin/useAdmin";

type Inq = { id: string; target: "expert" | "partner"; target_id: string; target_name: string; target_email: string; from_name: string; from_email: string; practice_name: string | null; subject: string | null; body: string; source: string; status: string; reply_count: number; created_by: string | null; created_at: string; updated_at: string };
type Opt = { id: string; label: string };

export default function InquiriesAdminPage() {
  const [status, setStatus] = useState("open");
  const { rows, loading, reload } = useAdminList<Inq>(`/api/admin/inquiries?status=${status}`);
  const { flash, Msg } = useFlash();
  const [experts, setExperts] = useState<Opt[]>([]);
  const [partners, setPartners] = useState<Opt[]>([]);
  const [f, setF] = useState<Record<string, string>>({ target: "expert", source: "hotline" });
  const [busy, setBusy] = useState(false);
  const [show, setShow] = useState(false);

  useEffect(() => {
    adminApi<{ rows: { id: string; full_name: string; display_name: string | null; email: string }[] }>("/api/admin/experts/live?status=all").then((r) => r.ok && setExperts(r.data.rows.map((e) => ({ id: e.id, label: `${e.display_name || e.full_name} · ${e.email}` }))));
    adminApi<{ rows: { id: string; company_name: string; contact_email: string }[] }>("/api/admin/partners/live?status=approved").then((r) => r.ok && setPartners(r.data.rows.map((p) => ({ id: p.id, label: `${p.company_name} · ${p.contact_email}` }))));
  }, []);

  async function route(ev: FormEvent) {
    ev.preventDefault();
    setBusy(true);
    const r = await adminApi("/api/admin/inquiries", { method: "POST", body: JSON.stringify(f) });
    setBusy(false);
    if (r.ok) { flash("ok", "Routed. The recipient is notified by bell and email."); setF({ target: f.target, source: "hotline" }); setShow(false); reload(); } else flash("err", r.data.error || "Failed.");
  }
  async function setSt(i: Inq, st: string) {
    const r = await adminApi("/api/admin/inquiries", { method: "PATCH", body: JSON.stringify({ target: i.target, id: i.id, status: st }) });
    if (r.ok) reload(); else flash("err", r.data.error || "Failed.");
  }

  return (
    <>
      <Head title="Inquiries" sub="Every member question routed to an expert or partner, with reply counts. Hotline triage: log a voicemail question here and route it to the best-fit expert; they reply from their portal and the member gets it by email.">
        <button className="adm-btn primary" onClick={() => setShow((s) => !s)}>{show ? "Close" : "Route a question"}</button>
      </Head>
      {Msg}
      {show && (
        <div className="adm-card">
          <div className="hd"><h2>Route a member question</h2></div>
          <form className="adm-form" onSubmit={route}>
            <div className="frow"><label className="flab">Send to</label><select value={f.target} onChange={(e) => setF({ ...f, target: e.target.value, target_id: "" })}><option value="expert">An expert</option><option value="partner">A partner</option></select></div>
            <div className="frow"><label className="flab">{f.target === "expert" ? "Expert" : "Partner"}</label><select required value={f.target_id || ""} onChange={(e) => setF({ ...f, target_id: e.target.value })}><option value="">Choose…</option>{(f.target === "expert" ? experts : partners).map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}</select></div>
            <div className="frow"><label className="flab">Member name</label><input type="text" required value={f.from_name || ""} onChange={(e) => setF({ ...f, from_name: e.target.value })} /></div>
            <div className="frow"><label className="flab">Member email</label><input type="email" required value={f.from_email || ""} onChange={(e) => setF({ ...f, from_email: e.target.value })} /></div>
            <div className="frow"><label className="flab">Practice</label><input type="text" value={f.practice_name || ""} onChange={(e) => setF({ ...f, practice_name: e.target.value })} /></div>
            <div className="frow"><label className="flab">Source</label><select value={f.source} onChange={(e) => setF({ ...f, source: e.target.value })}><option value="hotline">Expert Hotline voicemail</option><option value="admin">Team referral</option></select></div>
            <div className="frow full"><label className="flab">Subject</label><input type="text" value={f.subject || ""} onChange={(e) => setF({ ...f, subject: e.target.value })} /></div>
            <div className="frow full"><label className="flab">The question (transcribed)</label><textarea required value={f.body || ""} onChange={(e) => setF({ ...f, body: e.target.value })} /></div>
            <div className="actions"><button className="adm-btn primary" disabled={busy}>Route and notify</button></div>
          </form>
        </div>
      )}
      <div className="adm-card">
        <div className="adm-bar">
          <select value={status} onChange={(e) => setStatus(e.target.value)}><option value="open">Open</option><option value="answered">Answered</option><option value="closed">Closed</option><option value="all">All</option></select>
          <span style={{ marginLeft: "auto", fontSize: 12.5, color: "var(--muted)" }}>{loading ? "Loading…" : `${rows.length} inquiries`}</span>
        </div>
        <div className="adm-tablewrap">
          <table className="adm-table">
            <thead><tr><th>Member</th><th>To</th><th>Question</th><th>Replies</th><th>Status</th><th>Updated</th><th></th></tr></thead>
            <tbody>
              {rows.length === 0 && !loading && <tr><td colSpan={7}><div className="adm-empty">Nothing here.</div></td></tr>}
              {rows.map((i) => (
                <tr key={`${i.target}-${i.id}`}>
                  <td className="em">{i.from_name}<span className="sub">{i.from_email}{i.practice_name ? ` · ${i.practice_name}` : ""}</span></td>
                  <td><StatusBadge status={i.target} /><span className="sub">{i.target_name}</span></td>
                  <td style={{ maxWidth: 420 }}>{i.subject && <b>{i.subject}: </b>}{i.body.slice(0, 180)}{i.body.length > 180 ? "…" : ""}<span className="sub">{i.source}{i.created_by ? ` · logged by ${i.created_by}` : ""}</span></td>
                  <td>{i.reply_count}</td>
                  <td><StatusBadge status={i.status} /></td>
                  <td>{fmtDate(i.updated_at)}</td>
                  <td style={{ whiteSpace: "nowrap" }}>{i.status !== "closed" ? <button className="adm-btn sm" onClick={() => setSt(i, "closed")}>Close</button> : <button className="adm-btn sm" onClick={() => setSt(i, "open")}>Reopen</button>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
