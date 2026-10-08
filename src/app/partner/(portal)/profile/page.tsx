"use client";

import Link from "next/link";
import { FormEvent, useEffect, useRef, useState } from "react";
import { usePartner, api, initials } from "@/components/partner/PartnerContext";
import CategoryPicker from "@/components/forms/CategoryPicker";

export default function PartnerProfilePage() {
  const { me, refresh } = usePartner();
  const [f, setF] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!me) return;
    const p = me.partner;
    setF({
      display_name: p.display_name || p.company_name,
      category: p.category || "",
      website: p.website || "",
      booking_link: p.booking_link || "",
      description: p.description || "",
      member_offer: p.member_offer || "",
      lead_response_time: p.lead_response_time || "",
      contact_name: p.contact_name || "",
      contact_phone: p.contact_phone || "",
    });
  }, [me]);
  if (!me) return null;
  const p = me.partner;
  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => setF((s) => ({ ...s, [k]: e.target.value }));

  async function save(ev: FormEvent) {
    ev.preventDefault();
    setBusy(true); setMsg(null);
    const r = await api("/api/partner/profile", { method: "PATCH", body: JSON.stringify(f) });
    setBusy(false);
    if (r.ok) { setMsg({ kind: "ok", text: "Company profile saved." }); refresh(); } else setMsg({ kind: "err", text: r.data.error || "Could not save." });
  }
  async function upload(file: File) {
    setUploading(true); setMsg(null);
    const fd = new FormData(); fd.append("file", file);
    const r = await api("/api/partner/profile/logo", { method: "POST", body: fd });
    setUploading(false);
    if (r.ok) { setMsg({ kind: "ok", text: "Logo updated." }); refresh(); } else setMsg({ kind: "err", text: r.data.error || "Upload failed." });
  }

  return (
    <div className="pw-grid c2">
      <form className="pw-card" onSubmit={save}>
        <h2>Company profile</h2>
        <p className="lead">Shown in the partner directory and on your listing page. Contact details below stay private.</p>
        {msg && <div className={`pw-msg ${msg.kind}`}>{msg.text}</div>}
        <div className="pw-logoup" style={{ marginBottom: 20 }}>
          <div className="ph">{p.logo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={p.logo_url} alt="" />
          ) : initials(p.company_name)}</div>
          <div>
            <div style={{ fontWeight: 600, color: "var(--pw-deep)", marginBottom: 6 }}>Logo</div>
            <div style={{ fontSize: 12.5, color: "var(--pw-muted)", marginBottom: 10 }}>PNG with transparent background works best. Under 5 MB.</div>
            <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp" onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])} />
            <button type="button" className="pw-btn ghost sm" disabled={uploading} onClick={() => fileRef.current?.click()}>{uploading ? "Uploading…" : p.logo_url ? "Replace logo" : "Upload logo"}</button>
          </div>
        </div>
        <div className="pw-2col">
          <div className="pw-field"><label>Display name</label><input value={f.display_name || ""} onChange={set("display_name")} maxLength={120} /></div>
          <div className="pw-field">
            <label>Category</label>
            <CategoryPicker value={f.category || ""} onChange={(v) => setF((s) => ({ ...s, category: v }))} />
          </div>
        </div>
        <div className="pw-field"><label>What you do <small>60 characters minimum</small></label><textarea value={f.description || ""} onChange={set("description")} maxLength={2000} /><div className="hint">{(f.description || "").length} / 2000</div></div>
        <div className="pw-field"><label>Exclusive member offer <small>must be better than your standard pricing; 30 days&apos; notice on changes</small></label><textarea value={f.member_offer || ""} onChange={set("member_offer")} maxLength={2000} style={{ minHeight: 80 }} /></div>
        <div className="pw-2col">
          <div className="pw-field"><label>Website</label><input value={f.website || ""} onChange={set("website")} inputMode="url" placeholder="www.yourcompany.com" /></div>
          <div className="pw-field"><label>Booking link</label><input value={f.booking_link || ""} onChange={set("booking_link")} inputMode="url" placeholder="calendly.com/yourteam" /></div>
        </div>
        <div className="pw-2col">
          <div className="pw-field"><label>Primary contact</label><input value={f.contact_name || ""} onChange={set("contact_name")} maxLength={160} /></div>
          <div className="pw-field"><label>Contact phone <small>(private)</small></label><input value={f.contact_phone || ""} onChange={set("contact_phone")} inputMode="tel" maxLength={40} /></div>
        </div>
        <div className="pw-field">
          <label>Lead response time</label>
          <select value={f.lead_response_time || ""} onChange={set("lead_response_time")}>
            <option value="">Choose…</option>
            <option>Same business day</option>
            <option>Within 1 business day</option>
          </select>
        </div>
        <button className="pw-btn primary" type="submit" disabled={busy}>{busy ? "Saving…" : "Save profile"}</button>
      </form>
      <div className="pw-grid" style={{ gap: 18, alignContent: "start" }}>
        <section className="pw-card">
          <h2>Listing status</h2>
          <p className="lead">{me.listable ? "Live in the partner directory." : "Goes live once the checklist is complete and the team has reviewed it."}</p>
          <ul className="pw-check">{me.checklist.map((c) => <li key={c.key} className={c.done ? "done" : undefined}><span className="tk">{c.done ? "✓" : ""}</span>{c.label}</li>)}</ul>
          {me.listable && <Link className="pw-btn ghost sm" href={`/partners/${p.id}`} target="_blank" style={{ marginTop: 14 }}>Open public listing</Link>}
        </section>
        <section className="pw-card">
          <h2>Sign-in</h2>
          <dl className="pw-kv"><dt>Contact email</dt><dd>{p.contact_email}</dd><dt>Status</dt><dd style={{ textTransform: "capitalize" }}>{p.status}</dd></dl>
          <p className="lead" style={{ marginTop: 12, marginBottom: 0 }}>To change the sign-in email, reply to any of our emails and the team will move it.</p>
        </section>
      </div>
    </div>
  );
}
