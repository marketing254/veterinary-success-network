"use client";

import { FormEvent, useState } from "react";
import { fmtDate, StatusBadge } from "@/components/admin/RecordsPage";
import { adminApi, useAdminList, useFlash, Head } from "@/components/admin/useAdmin";

type Expert = { id: string; email: string; full_name: string; display_name: string | null; company_name: string | null; specialty: string | null; topics: string | null; bio: string | null; website: string | null; booking_link: string | null; headshot_url: string | null; phone: string | null; years_experience: string | null; status: string; source: string; invited_at: string; activated_at: string | null; notes: string | null; agreement_signed_at: string | null; agreement_version: string | null; subscription_status: string | null; free_period_ends_at: string | null; billing_exempt: boolean; billing_exempt_reason: string | null; card_brand: string | null; card_last4: string | null };

const EDITABLE: [keyof Expert, string][] = [["full_name", "Full name"], ["display_name", "Display name"], ["company_name", "Company"], ["specialty", "Specialty"], ["years_experience", "Years with practices"], ["phone", "Phone"], ["website", "Website"], ["booking_link", "Booking link"], ["headshot_url", "Headshot URL"]];

export default function ExpertsLivePage() {
  const [status, setStatus] = useState("all");
  const [q, setQ] = useState("");
  const [qq, setQq] = useState("");
  const { rows, extra, loading, reload } = useAdminList<Expert>(`/api/admin/experts/live?status=${status}&q=${encodeURIComponent(qq)}`);
  const { flash, Msg } = useFlash();
  const [open, setOpen] = useState<string | null>(null);
  const [edit, setEdit] = useState<Record<string, string>>({});
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [add, setAdd] = useState<Record<string, string>>({});
  const slots = (extra.slots as { cap: number; used: number; remaining: number } | undefined) ?? { cap: 20, used: 0, remaining: 20 };

  async function act(row: Expert, action: string) {
    if (action === "grant_free" && !confirm(`Make ${row.full_name} free for life? This cannot be undone. ${slots.remaining} of ${slots.cap} slots remain.`)) return;
    setBusy(true);
    const r = await adminApi("/api/admin/experts/live", { method: "PATCH", body: JSON.stringify({ id: row.id, action, note }) });
    setBusy(false);
    if (r.ok) { flash("ok", `Done: ${action.replace(/_/g, " ")}.`); setNote(""); reload(); } else flash("err", r.data.error || "Failed.");
  }
  async function saveEdit(row: Expert, ev: FormEvent) {
    ev.preventDefault();
    setBusy(true);
    const r = await adminApi("/api/admin/experts/live", { method: "POST", body: JSON.stringify({ id: row.id, ...edit }) });
    setBusy(false);
    if (r.ok) { flash("ok", "Profile saved."); reload(); } else flash("err", r.data.error || "Failed.");
  }
  async function remove(row: Expert) {
    if (!confirm(`Delete ${row.full_name} (${row.email}) everywhere? Profile, kits, posts, inquiries, applications, invites and sign-in user. Not reversible.`)) return;
    if (prompt("Type DELETE to confirm") !== "DELETE") return;
    setBusy(true);
    const r = await adminApi<{ report: { removed: string[] } }>("/api/admin/experts/live", { method: "DELETE", body: JSON.stringify({ email: row.email }) });
    setBusy(false);
    if (r.ok) { flash("ok", `Deleted: ${r.data.report.removed.join(", ")}.`); setOpen(null); reload(); } else flash("err", r.data.error || "Failed (owner only).");
  }
  async function addExpert(ev: FormEvent) {
    ev.preventDefault();
    setBusy(true);
    const r = await adminApi("/api/admin/experts/live", { method: "POST", body: JSON.stringify({ ...add, sendEmail: add.sendEmail === "yes" }) });
    setBusy(false);
    if (r.ok) { flash("ok", "Expert added."); setAdd({}); setShowAdd(false); reload(); } else flash("err", r.data.error || "Failed.");
  }

  return (
    <>
      <Head title="Experts" sub="Live expert accounts (approved applicants, founding invitees and hand-added experts). Lifetime free is private and capped at 20.">
        <span className="adm-chip">Founding slots: {slots.used} of {slots.cap} used · {slots.remaining} left</span>
        <button className="adm-btn" onClick={() => setShowAdd((s) => !s)}>{showAdd ? "Close" : "Add expert by hand"}</button>
        <a className="adm-btn" href={`/api/admin/experts/live?format=csv&status=${status}`}>Export CSV</a>
      </Head>
      {Msg}
      {showAdd && (
        <div className="adm-card">
          <div className="hd"><h2>Add an expert without an application</h2></div>
          <form className="adm-form" onSubmit={addExpert}>
            <div className="frow"><label className="flab">Full name</label><input type="text" required value={add.full_name || ""} onChange={(e) => setAdd({ ...add, full_name: e.target.value })} /></div>
            <div className="frow"><label className="flab">Email</label><input type="email" required value={add.email || ""} onChange={(e) => setAdd({ ...add, email: e.target.value })} /></div>
            <div className="frow"><label className="flab">Company</label><input type="text" value={add.company_name || ""} onChange={(e) => setAdd({ ...add, company_name: e.target.value })} /></div>
            <div className="frow"><label className="flab">Specialty</label><input type="text" value={add.specialty || ""} onChange={(e) => setAdd({ ...add, specialty: e.target.value })} /></div>
            <div className="frow"><label className="flab">Send approval email now?</label><select value={add.sendEmail || "no"} onChange={(e) => setAdd({ ...add, sendEmail: e.target.value })}><option value="no">No, I will tell them</option><option value="yes">Yes, send the approval email</option></select></div>
            <div className="actions"><button className="adm-btn primary" disabled={busy}>Add expert</button></div>
          </form>
        </div>
      )}
      <div className="adm-card">
        <div className="adm-toolbar">
          <input type="text" placeholder="Search name, email, company, specialty…" value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => e.key === "Enter" && setQq(q)} />
          <button className="adm-btn" onClick={() => setQq(q)}>Search</button>
          <select value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="all">All</option><option value="invited">Invited (not signed in yet)</option><option value="active">Active</option><option value="founding">Lifetime free</option><option value="suspended">Suspended</option><option value="archived">Archived</option>
          </select>
          <span style={{ marginLeft: "auto", fontSize: 12.5, color: "var(--muted)" }}>{loading ? "Loading…" : `${rows.length} experts`}</span>
        </div>
        <div className="adm-tablewrap">
          <table className="adm-table">
            <thead><tr><th>Expert</th><th>Specialty</th><th>Source</th><th>Agreement</th><th>Billing</th><th>Status</th><th>Since</th></tr></thead>
            <tbody>
              {rows.length === 0 && !loading && <tr><td colSpan={7}><div className="adm-empty">No experts yet. Approve an application or add one by hand.</div></td></tr>}
              {rows.map((r) => (
                <RowBlock key={r.id} r={r} open={open === r.id} onToggle={() => { setOpen(open === r.id ? null : r.id); setEdit({}); setNote(""); }} />
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );

  function RowBlock({ r, open, onToggle }: { r: Expert; open: boolean; onToggle: () => void }) {
    return (
      <>
        <tr onClick={onToggle}>
          <td className="em">{r.display_name || r.full_name}<span className="sub">{r.email}{r.company_name ? ` · ${r.company_name}` : ""}</span></td>
          <td>{r.specialty || "—"}</td>
          <td><StatusBadge status={r.source} /></td>
          <td>{r.agreement_signed_at ? <StatusBadge status="accepted" /> : <StatusBadge status="pending" />}</td>
          <td>{r.billing_exempt ? <StatusBadge status="exempt" /> : <StatusBadge status={r.subscription_status || "free_months"} />}</td>
          <td><StatusBadge status={r.status} /></td>
          <td>{fmtDate(r.invited_at)}</td>
        </tr>
        {open && (
          <tr className="adm-detail"><td colSpan={7}>
            <div className="adm-split">
              <div>
                <div className="grid">
                  <div className="kv"><b>Bio</b><span>{r.bio || "—"}</span></div>
                  <div className="kv"><b>Topics</b><span>{r.topics || "—"}</span></div>
                  <div className="kv"><b>Website</b><span>{r.website || "—"}</span></div>
                  <div className="kv"><b>Booking</b><span>{r.booking_link || "—"}</span></div>
                  <div className="kv"><b>Agreement</b><span>{r.agreement_signed_at ? `${r.agreement_version} on ${fmtDate(r.agreement_signed_at)}` : "Not accepted"}</span></div>
                  <div className="kv"><b>Free until</b><span>{r.billing_exempt ? `Lifetime (${r.billing_exempt_reason || ""})` : r.free_period_ends_at ? fmtDate(r.free_period_ends_at) : "Set at agreement"}</span></div>
                  <div className="kv"><b>Card</b><span>{r.card_brand ? `${r.card_brand} ····${r.card_last4}` : "None (Phase 5)"}</span></div>
                  <div className="kv"><b>Notes</b><span>{r.notes || "—"}</span></div>
                </div>
                <div className="note"><input type="text" placeholder="Optional note (kept in the audit log)" value={note} onChange={(e) => setNote(e.target.value)} /></div>
                <div className="row-actions">
                  {!r.billing_exempt && r.status !== "archived" && <button className="adm-btn lime" disabled={busy || slots.remaining <= 0} onClick={() => act(r, "grant_free")}>Grant lifetime free</button>}
                  {r.status !== "suspended" && r.status !== "archived" && <button className="adm-btn" disabled={busy} onClick={() => act(r, "suspend")}>Suspend</button>}
                  {(r.status === "suspended" || r.status === "archived") && <button className="adm-btn primary" disabled={busy} onClick={() => act(r, "reactivate")}>Reactivate</button>}
                  {r.status !== "archived" && <button className="adm-btn" disabled={busy} onClick={() => act(r, "archive")}>Archive</button>}
                  <button className="adm-btn" disabled={busy} onClick={() => act(r, "resend_approval")}>Resend approval email</button>
                  {r.agreement_signed_at && <a className="adm-btn" href={`/experts/${r.id}`} target="_blank" rel="noreferrer">Public profile</a>}
                  <button className="adm-btn danger" disabled={busy} onClick={() => remove(r)}>Delete everywhere</button>
                </div>
              </div>
              <form onSubmit={(e) => saveEdit(r, e)}>
                <div className="adm-form" style={{ padding: 0, gridTemplateColumns: "1fr 1fr" }}>
                  {EDITABLE.map(([k, label]) => (
                    <div className="frow" key={k}><label className="flab">{label}</label><input type="text" value={edit[k] ?? (r[k] as string | null) ?? ""} onChange={(e) => setEdit({ ...edit, [k]: e.target.value })} /></div>
                  ))}
                  <div className="frow full"><label className="flab">Bio</label><textarea value={edit.bio ?? r.bio ?? ""} onChange={(e) => setEdit({ ...edit, bio: e.target.value })} style={{ minHeight: 80 }} /></div>
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
