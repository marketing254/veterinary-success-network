"use client";

import { FormEvent, useState } from "react";
import { fmtDate, StatusBadge } from "@/components/admin/RecordsPage";
import { adminApi, useAdminList, useFlash, Head } from "@/components/admin/useAdmin";
import CategoryPicker from "@/components/forms/CategoryPicker";

type Partner = { id: string; billing_parent_id: string | null; company_name: string; display_name: string | null; category: string | null; website: string | null; description: string | null; member_offer: string | null; logo_url: string | null; booking_link: string | null; contact_name: string; contact_email: string; contact_phone: string | null; billing_email: string | null; status: string; verified: boolean; source: string; billing_plan: string; notes: string | null; agreement_signed_at: string | null; agreement_version: string | null; subscription_status: string | null; free_period_ends_at: string | null; card_brand: string | null; card_last4: string | null; created_at: string };

const EDITABLE: [keyof Partner, string][] = [["company_name", "Company"], ["display_name", "Display name"], ["contact_name", "Contact"], ["contact_phone", "Phone"], ["billing_email", "Billing email"], ["website", "Website"], ["booking_link", "Booking link"], ["logo_url", "Logo URL"]];

export default function PartnersLivePage() {
  const [status, setStatus] = useState("all");
  const [q, setQ] = useState("");
  const [qq, setQq] = useState("");
  const { rows, loading, reload } = useAdminList<Partner>(`/api/admin/partners/live?status=${status}&q=${encodeURIComponent(qq)}`);
  const { flash, Msg } = useFlash();
  const [open, setOpen] = useState<string | null>(null);
  const [edit, setEdit] = useState<Record<string, string>>({});
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [add, setAdd] = useState<Record<string, string>>({ billing_plan: "ladder" });
  const principals = rows.filter((r) => !r.billing_parent_id);
  const nameOf = (id: string | null) => rows.find((r) => r.id === id)?.company_name ?? id;

  async function act(row: Partner, action: string) {
    setBusy(true);
    const r = await adminApi("/api/admin/partners/live", { method: "PATCH", body: JSON.stringify({ id: row.id, action, note }) });
    setBusy(false);
    if (r.ok) { flash("ok", `Done: ${action.replace(/_/g, " ")}.`); setNote(""); reload(); } else flash("err", r.data.error || "Failed.");
  }
  async function saveEdit(row: Partner, ev: FormEvent) {
    ev.preventDefault();
    setBusy(true);
    const r = await adminApi("/api/admin/partners/live", { method: "POST", body: JSON.stringify({ id: row.id, ...edit }) });
    setBusy(false);
    if (r.ok) { flash("ok", "Profile saved."); reload(); } else flash("err", r.data.error || "Failed.");
  }
  async function remove(row: Partner) {
    if (!confirm(`Delete ${row.company_name} (${row.contact_email}) everywhere, including covered companies, catalog, offers and the sign-in user? Not reversible.`)) return;
    if (prompt("Type DELETE to confirm") !== "DELETE") return;
    setBusy(true);
    const r = await adminApi<{ report: { removed: string[] } }>("/api/admin/partners/live", { method: "DELETE", body: JSON.stringify({ email: row.contact_email }) });
    setBusy(false);
    if (r.ok) { flash("ok", `Deleted: ${r.data.report.removed.join(", ")}.`); setOpen(null); reload(); } else flash("err", r.data.error || "Failed (owner only).");
  }
  async function addPartner(ev: FormEvent) {
    ev.preventDefault();
    setBusy(true);
    const r = await adminApi("/api/admin/partners/live", { method: "POST", body: JSON.stringify({ ...add, sendEmail: add.sendEmail === "yes" }) });
    setBusy(false);
    if (r.ok) { flash("ok", "Partner added."); setAdd({ billing_plan: "ladder" }); setShowAdd(false); reload(); } else flash("err", r.data.error || "Failed.");
  }

  return (
    <>
      <Head title="Partners" sub="Live partner companies. Plan: ladder is $39 x 12 then $149; flat is $39 with no increase. Covered companies share a principal's billing and agreement.">
        <button className="adm-btn" onClick={() => setShowAdd((s) => !s)}>{showAdd ? "Close" : "Add company by hand"}</button>
        <a className="adm-btn" href={`/api/admin/partners/live?format=csv&status=${status}`}>Export CSV</a>
      </Head>
      {Msg}
      {showAdd && (
        <div className="adm-card">
          <div className="hd"><h2>Add a company without an application</h2></div>
          <form className="adm-form" onSubmit={addPartner}>
            <div className="frow"><label className="flab">Company</label><input type="text" required value={add.company_name || ""} onChange={(e) => setAdd({ ...add, company_name: e.target.value })} /></div>
            <div className="frow"><label className="flab">Contact name</label><input type="text" required value={add.contact_name || ""} onChange={(e) => setAdd({ ...add, contact_name: e.target.value })} /></div>
            <div className="frow"><label className="flab">Contact email</label><input type="email" required value={add.contact_email || ""} onChange={(e) => setAdd({ ...add, contact_email: e.target.value })} /></div>
            <div className="frow"><label className="flab">Category</label><CategoryPicker value={add.category || ""} onChange={(v) => setAdd({ ...add, category: v })} /></div>
            <div className="frow"><label className="flab">Plan</label><select value={add.billing_plan} onChange={(e) => setAdd({ ...add, billing_plan: e.target.value })}><option value="ladder">Ladder: $39 x 12 then $149</option><option value="flat">Flat: $39, no increase</option></select></div>
            <div className="frow"><label className="flab">Covered by (principal)</label><select value={add.billing_parent_id || ""} onChange={(e) => setAdd({ ...add, billing_parent_id: e.target.value })}><option value="">Not covered (bills on its own)</option>{principals.map((p) => <option key={p.id} value={p.id}>{p.company_name}</option>)}</select></div>
            <div className="frow"><label className="flab">Send approval email now?</label><select value={add.sendEmail || "no"} onChange={(e) => setAdd({ ...add, sendEmail: e.target.value })}><option value="no">No</option><option value="yes">Yes, send the approval email</option></select></div>
            <div className="actions"><button className="adm-btn primary" disabled={busy}>Add company</button></div>
          </form>
        </div>
      )}
      <div className="adm-card">
        <div className="adm-toolbar">
          <input type="text" placeholder="Search company, contact, email, category…" value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => e.key === "Enter" && setQq(q)} />
          <button className="adm-btn" onClick={() => setQq(q)}>Search</button>
          <select value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="all">All</option><option value="pending">Pending</option><option value="approved">Approved</option><option value="covered">Covered companies</option><option value="suspended">Suspended</option><option value="churned">Churned</option><option value="rejected">Rejected</option>
          </select>
          <span style={{ marginLeft: "auto", fontSize: 12.5, color: "var(--muted)" }}>{loading ? "Loading…" : `${rows.length} partners`}</span>
        </div>
        <div className="adm-tablewrap">
          <table className="adm-table">
            <thead><tr><th>Company</th><th>Category</th><th>Plan</th><th>Agreement</th><th>Billing</th><th>Status</th><th>Since</th></tr></thead>
            <tbody>
              {rows.length === 0 && !loading && <tr><td colSpan={7}><div className="adm-empty">No partners yet.</div></td></tr>}
              {rows.map((r) => (
                <Row key={r.id} r={r} open={open === r.id} onToggle={() => { setOpen(open === r.id ? null : r.id); setEdit({}); setNote(""); }} />
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );

  function Row({ r, open, onToggle }: { r: Partner; open: boolean; onToggle: () => void }) {
    return (
      <>
        <tr onClick={onToggle}>
          <td className="em">{r.display_name || r.company_name}{r.verified && <span className="adm-chip" style={{ marginLeft: 6 }}>Verified</span>}<span className="sub">{r.contact_name} · {r.contact_email}{r.billing_parent_id ? ` · covered by ${nameOf(r.billing_parent_id)}` : ""}</span></td>
          <td>{r.category || "—"}</td>
          <td>{r.billing_parent_id ? <StatusBadge status="covered" /> : <StatusBadge status={r.billing_plan} />}</td>
          <td>{r.agreement_signed_at || r.billing_parent_id ? <StatusBadge status="accepted" /> : <StatusBadge status="pending" />}</td>
          <td><StatusBadge status={r.billing_parent_id ? "covered" : r.subscription_status || "free_months"} /></td>
          <td><StatusBadge status={r.status} /></td>
          <td>{fmtDate(r.created_at)}</td>
        </tr>
        {open && (
          <tr className="adm-detail"><td colSpan={7}>
            <div className="adm-split">
              <div>
                <div className="grid">
                  <div className="kv"><b>Description</b><span>{r.description || "—"}</span></div>
                  <div className="kv"><b>Member offer</b><span>{r.member_offer || "—"}</span></div>
                  <div className="kv"><b>Website</b><span>{r.website || "—"}</span></div>
                  <div className="kv"><b>Booking</b><span>{r.booking_link || "—"}</span></div>
                  <div className="kv"><b>Agreement</b><span>{r.agreement_signed_at ? `${r.agreement_version} on ${fmtDate(r.agreement_signed_at)}` : r.billing_parent_id ? "Covered by principal" : "Not accepted"}</span></div>
                  <div className="kv"><b>Free until</b><span>{r.free_period_ends_at ? fmtDate(r.free_period_ends_at) : "Set at agreement"}</span></div>
                  <div className="kv"><b>Card</b><span>{r.card_brand ? `${r.card_brand} ····${r.card_last4}` : "None (Phase 5)"}</span></div>
                  <div className="kv"><b>Source</b><span>{r.source}</span></div>
                </div>
                <div className="note"><input type="text" placeholder="Optional note (kept in the audit log)" value={note} onChange={(e) => setNote(e.target.value)} /></div>
                <div className="row-actions">
                  {r.status === "pending" && <button className="adm-btn primary" disabled={busy} onClick={() => act(r, "approve")}>Approve + verify</button>}
                  {r.status === "pending" && <button className="adm-btn danger" disabled={busy} onClick={() => act(r, "reject")}>Reject</button>}
                  {r.status === "approved" && (r.verified ? <button className="adm-btn" disabled={busy} onClick={() => act(r, "unverify")}>Remove Verified badge</button> : <button className="adm-btn lime" disabled={busy} onClick={() => act(r, "verify")}>Give Verified badge</button>)}
                  {!r.billing_parent_id && (r.billing_plan === "ladder" ? <button className="adm-btn" disabled={busy} onClick={() => act(r, "plan_flat")}>Switch to flat $39</button> : <button className="adm-btn" disabled={busy} onClick={() => act(r, "plan_ladder")}>Switch to ladder</button>)}
                  {r.status === "approved" && <button className="adm-btn" disabled={busy} onClick={() => act(r, "suspend")}>Suspend</button>}
                  {(r.status === "suspended" || r.status === "churned" || r.status === "rejected") && <button className="adm-btn primary" disabled={busy} onClick={() => act(r, "reactivate")}>Reactivate</button>}
                  {r.status === "approved" && <button className="adm-btn" disabled={busy} onClick={() => act(r, "churn")}>Mark churned</button>}
                  <button className="adm-btn" disabled={busy} onClick={() => act(r, "grant_login")}>Create sign-in user</button>
                  <button className="adm-btn" disabled={busy} onClick={() => act(r, "resend_approval")}>Resend approval email</button>
                  {r.status === "approved" && <a className="adm-btn" href={`/partners/${r.id}`} target="_blank" rel="noreferrer">Public listing</a>}
                  <button className="adm-btn danger" disabled={busy} onClick={() => remove(r)}>Delete everywhere</button>
                </div>
              </div>
              <form onSubmit={(e) => saveEdit(r, e)}>
                <div className="adm-form" style={{ padding: 0, gridTemplateColumns: "1fr 1fr" }}>
                  {EDITABLE.map(([k, label]) => (
                    <div className="frow" key={k}><label className="flab">{label}</label><input type="text" value={edit[k] ?? (r[k] as string | null) ?? ""} onChange={(e) => setEdit({ ...edit, [k]: e.target.value })} /></div>
                  ))}
                  <div className="frow"><label className="flab">Category</label><CategoryPicker value={edit.category ?? r.category ?? ""} onChange={(v) => setEdit({ ...edit, category: v })} emptyLabel="—" /></div>
                  <div className="frow"><label className="flab">Covered by</label><select value={edit.billing_parent_id ?? r.billing_parent_id ?? ""} onChange={(e) => setEdit({ ...edit, billing_parent_id: e.target.value })}><option value="">Not covered</option>{principals.filter((p) => p.id !== r.id).map((p) => <option key={p.id} value={p.id}>{p.company_name}</option>)}</select></div>
                  <div className="frow full"><label className="flab">Description</label><textarea value={edit.description ?? r.description ?? ""} onChange={(e) => setEdit({ ...edit, description: e.target.value })} style={{ minHeight: 70 }} /></div>
                  <div className="frow full"><label className="flab">Member offer</label><textarea value={edit.member_offer ?? r.member_offer ?? ""} onChange={(e) => setEdit({ ...edit, member_offer: e.target.value })} style={{ minHeight: 60 }} /></div>
                  <div className="frow full"><label className="flab">Internal notes</label><input type="text" value={edit.notes ?? r.notes ?? ""} onChange={(e) => setEdit({ ...edit, notes: e.target.value })} /></div>
                  <div className="actions"><button className="adm-btn primary" disabled={busy || Object.keys(edit).length === 0}>Save profile</button></div>
                </div>
              </form>
            </div>
          </td></tr>
        )}
      </>
    );
  }
}
