"use client";

import { FormEvent, useState } from "react";
import { fmtDate, StatusBadge } from "@/components/admin/RecordsPage";
import { adminApi, useAdminList, useFlash, Head } from "@/components/admin/useAdmin";
import CategoryPicker from "@/components/forms/CategoryPicker";

type Invite = { id: string; code: string; url: string; role: "expert" | "partner" | "both"; full_name: string; email: string; phone: string | null; company_name: string | null; category: string | null; website: string | null; description: string | null; member_offer: string | null; booking_link: string | null; notes: string | null; pricing_plan: string; expert_free_for_life: boolean; status: string; sent_at: string | null; viewed_at: string | null; accepted_at: string | null; accepted_name: string | null; expires_at: string; created_by: string | null; created_at: string };

const EMPTY: Record<string, string> = { role: "expert", pricing_plan: "ladder", expert_free_for_life: "no" };

export default function FoundingInvitesPage() {
  const [status, setStatus] = useState("all");
  const { rows, loading, reload } = useAdminList<Invite>(`/api/admin/founding?status=${status}`);
  const { flash, Msg } = useFlash();
  const [form, setForm] = useState<Record<string, string>>(EMPTY);
  const [editing, setEditing] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState<string | null>(null);
  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const isPartnerRole = form.role !== "expert";

  function startEdit(inv: Invite) {
    setEditing(inv.id);
    setForm({ role: inv.role, full_name: inv.full_name, email: inv.email, phone: inv.phone || "", company_name: inv.company_name || "", category: inv.category || "", website: inv.website || "", booking_link: inv.booking_link || "", description: inv.description || "", member_offer: inv.member_offer || "", notes: inv.notes || "", pricing_plan: inv.pricing_plan, expert_free_for_life: inv.expert_free_for_life ? "yes" : "no" });
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
  async function save(ev: FormEvent) {
    ev.preventDefault();
    setBusy(true);
    const r = await adminApi("/api/admin/founding", { method: "POST", body: JSON.stringify({ ...(editing ? { id: editing } : {}), ...form, expert_free_for_life: form.expert_free_for_life === "yes" }) });
    setBusy(false);
    if (r.ok) { flash("ok", editing ? "Draft updated." : "Draft saved. Nothing has been sent; click Send invite when ready."); setForm(EMPTY); setEditing(null); setShowForm(false); reload(); }
    else flash("err", r.data.error || "Failed.");
  }
  async function act(inv: Invite, action: string) {
    if (action === "send" && !confirm(`Send the founding invite to ${inv.email} now? This emails the private link and the draft agreement PDF.`)) return;
    if (action === "revoke" && !confirm("Revoke this invite? The link stops working.")) return;
    if (action === "delete" && !confirm("Delete this draft?")) return;
    setBusy(true);
    const r = await adminApi("/api/admin/founding", { method: "PATCH", body: JSON.stringify({ id: inv.id, action }) });
    setBusy(false);
    if (r.ok) { flash("ok", `Done: ${action}.`); reload(); } else flash("err", r.data.error || "Failed.");
  }
  const planLabel = (inv: Invite) => inv.role === "expert" ? (inv.expert_free_for_life ? "Free for life" : "12 mo free, then $39") : inv.pricing_plan === "flat" ? "6 mo free, then $39 flat" : "6 mo free, $39 x 12, then $149";

  return (
    <>
      <Head title="Founding invites" sub="The private, invitation-only path. Draft first; nothing is emailed until you click Send. The invitee reads their personalised agreement at /founding/<code> and accepts. Website applicants never get these links.">
        <button className="adm-btn primary" onClick={() => { setShowForm((s) => !s); setEditing(null); setForm(EMPTY); }}>{showForm && !editing ? "Close" : "New invite"}</button>
      </Head>
      {Msg}
      {showForm && (
        <div className="adm-card">
          <div className="hd"><h2>{editing ? "Edit draft" : "New founding invite"}</h2></div>
          <form className="adm-form" onSubmit={save}>
            <div className="frow"><label className="flab">Role</label><select value={form.role} onChange={set("role")}><option value="expert">Expert</option><option value="partner">Partner (company)</option><option value="both">Both: expert and partner</option></select></div>
            <div className="frow"><label className="flab">Full name</label><input type="text" required value={form.full_name || ""} onChange={set("full_name")} /></div>
            <div className="frow"><label className="flab">Email</label><input type="email" required value={form.email || ""} onChange={set("email")} /></div>
            <div className="frow"><label className="flab">Phone</label><input type="text" value={form.phone || ""} onChange={set("phone")} /></div>
            {isPartnerRole && <div className="frow"><label className="flab">Company</label><input type="text" required value={form.company_name || ""} onChange={set("company_name")} /></div>}
            {isPartnerRole && <div className="frow"><label className="flab">Category</label><CategoryPicker value={form.category || ""} onChange={(v) => setForm((f) => ({ ...f, category: v }))} /></div>}
            {!isPartnerRole && <div className="frow"><label className="flab">Company (optional)</label><input type="text" value={form.company_name || ""} onChange={set("company_name")} /></div>}
            <div className="frow"><label className="flab">Website</label><input type="text" value={form.website || ""} onChange={set("website")} placeholder="www.example.com" /></div>
            <div className="frow"><label className="flab">Booking link</label><input type="text" value={form.booking_link || ""} onChange={set("booking_link")} /></div>
            {isPartnerRole && <div className="frow"><label className="flab">Partner plan</label><select value={form.pricing_plan} onChange={set("pricing_plan")}><option value="ladder">Ladder: 6 mo free, $39 x 12, then $149</option><option value="flat">Flat: 6 mo free, then $39 no increase</option></select></div>}
            {form.role !== "partner" && <div className="frow"><label className="flab">Expert billing</label><select value={form.expert_free_for_life} onChange={set("expert_free_for_life")}><option value="no">12 months free, then $39 flat</option><option value="yes">Free for life (founding 20, private)</option></select></div>}
            <div className="frow full"><label className="flab">{isPartnerRole ? "What the company does" : "Topics / specialty"}</label><textarea value={form.description || ""} onChange={set("description")} style={{ minHeight: 60 }} /></div>
            {isPartnerRole && <div className="frow full"><label className="flab">Member offer (goes in the agreement)</label><textarea value={form.member_offer || ""} onChange={set("member_offer")} style={{ minHeight: 60 }} /></div>}
            <div className="frow full"><label className="flab">Internal notes (never shown)</label><input type="text" value={form.notes || ""} onChange={set("notes")} /></div>
            <div className="actions">
              <button className="adm-btn primary" disabled={busy}>{editing ? "Save draft" : "Save as draft"}</button>
              <button type="button" className="adm-btn" onClick={() => { setShowForm(false); setEditing(null); setForm(EMPTY); }}>Cancel</button>
            </div>
          </form>
        </div>
      )}
      <div className="adm-card">
        <div className="adm-toolbar">
          <select value={status} onChange={(e) => setStatus(e.target.value)}><option value="all">All</option><option value="draft">Draft</option><option value="sent">Sent</option><option value="viewed">Viewed</option><option value="accepted">Accepted</option><option value="revoked">Revoked</option></select>
          <span style={{ marginLeft: "auto", fontSize: 12.5, color: "var(--muted)" }}>{loading ? "Loading…" : `${rows.length} invites`}</span>
        </div>
        <div className="adm-tablewrap">
          <table className="adm-table">
            <thead><tr><th>Invitee</th><th>Role</th><th>Terms</th><th>Status</th><th>Sent</th><th>Expires</th></tr></thead>
            <tbody>
              {rows.length === 0 && !loading && <tr><td colSpan={6}><div className="adm-empty">No invites yet.</div></td></tr>}
              {rows.map((inv) => (
                <>
                  <tr key={inv.id} onClick={() => setOpen(open === inv.id ? null : inv.id)}>
                    <td className="em">{inv.full_name}<span className="sub">{inv.email}{inv.company_name ? ` · ${inv.company_name}` : ""}</span></td>
                    <td><StatusBadge status={inv.role} /></td>
                    <td>{planLabel(inv)}</td>
                    <td><StatusBadge status={inv.status} /></td>
                    <td>{inv.sent_at ? fmtDate(inv.sent_at) : "—"}</td>
                    <td>{fmtDate(inv.expires_at)}</td>
                  </tr>
                  {open === inv.id && (
                    <tr className="adm-detail" key={`${inv.id}-d`}><td colSpan={6}>
                      <div className="grid">
                        <div className="kv"><b>Private link</b><span className="adm-copy"><code>{inv.url}</code><button className="adm-btn sm" onClick={() => navigator.clipboard?.writeText(inv.url)}>Copy</button></span></div>
                        <div className="kv"><b>Category</b><span>{inv.category || "—"}</span></div>
                        <div className="kv"><b>Member offer</b><span>{inv.member_offer || "—"}</span></div>
                        <div className="kv"><b>Viewed</b><span>{inv.viewed_at ? fmtDate(inv.viewed_at) : "—"}</span></div>
                        <div className="kv"><b>Accepted</b><span>{inv.accepted_at ? `${fmtDate(inv.accepted_at)} as ${inv.accepted_name}` : "—"}</span></div>
                        <div className="kv"><b>Created by</b><span>{inv.created_by || "—"} · {fmtDate(inv.created_at)}</span></div>
                        <div className="kv"><b>Notes</b><span>{inv.notes || "—"}</span></div>
                      </div>
                      <div className="row-actions">
                        {inv.status === "draft" && <button className="adm-btn primary" disabled={busy} onClick={() => act(inv, "send")}>Send invite</button>}
                        {(inv.status === "sent" || inv.status === "viewed") && <button className="adm-btn" disabled={busy} onClick={() => act(inv, "resend")}>Resend</button>}
                        {inv.status !== "accepted" && inv.status !== "revoked" && <button className="adm-btn" disabled={busy} onClick={() => startEdit(inv)}>Edit</button>}
                        {inv.status !== "accepted" && inv.status !== "revoked" && <button className="adm-btn danger" disabled={busy} onClick={() => act(inv, "revoke")}>Revoke</button>}
                        {inv.status === "revoked" && <button className="adm-btn" disabled={busy} onClick={() => act(inv, "reopen")}>Reopen as draft</button>}
                        {inv.status === "draft" && <button className="adm-btn danger" disabled={busy} onClick={() => act(inv, "delete")}>Delete draft</button>}
                        {inv.status !== "draft" && <a className="adm-btn" href={inv.url} target="_blank" rel="noreferrer">Open page</a>}
                      </div>
                    </td></tr>
                  )}
                </>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
