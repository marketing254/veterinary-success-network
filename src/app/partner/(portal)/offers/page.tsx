"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { usePartner, api, fmtDate } from "@/components/partner/PartnerContext";

type Offer = { id: string; catalog_item_id: string | null; headline: string; discount_value: string; promo_code: string | null; description: string; terms: string | null; redeem_url: string | null; valid_from: string; valid_to: string | null; redemption_limit_per_member: string; image_url: string | null; review_status: string; review_note: string | null; created_at: string };
type Item = { id: string; name: string };
const LABEL: Record<string, string> = { pending_review: "In review", needs_changes: "Needs changes", approved: "Live", rejected: "Declined", draft: "Draft" };

export default function PartnerOffersPage() {
  const { me, refresh } = usePartner();
  const [rows, setRows] = useState<Offer[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Offer | null>(null);
  const [f, setF] = useState<Record<string, string>>({ limit: "unlimited" });
  const [image, setImage] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  async function load() {
    const [a, b] = await Promise.all([api<{ rows: Offer[] }>("/api/partner/offers"), api<{ rows: Item[] }>("/api/partner/catalog")]);
    if (a.ok) setRows(a.data.rows);
    if (b.ok) setItems(b.data.rows);
    setLoading(false);
  }
  useEffect(() => { load(); }, []);
  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => setF((s) => ({ ...s, [k]: e.target.value }));

  function startEdit(o: Offer) {
    setEditing(o);
    setF({ headline: o.headline, discount_value: o.discount_value, promo_code: o.promo_code || "", description: o.description, terms: o.terms || "", redeem_url: o.redeem_url || "", valid_from: o.valid_from, valid_to: o.valid_to || "", limit: o.redemption_limit_per_member, catalog_item_id: o.catalog_item_id || "" });
    setMsg(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
  function reset() { setEditing(null); setF({ limit: "unlimited" }); setImage(null); if (fileRef.current) fileRef.current.value = ""; }

  async function submit(ev: FormEvent) {
    ev.preventDefault();
    setBusy(true); setMsg(null);
    let r;
    if (editing) r = await api(`/api/partner/offers/${editing.id}`, { method: "PATCH", body: JSON.stringify(f) });
    else {
      const fd = new FormData();
      Object.entries(f).forEach(([k, v]) => fd.append(k, v));
      if (image) fd.append("image", image);
      r = await api("/api/partner/offers", { method: "POST", body: fd });
    }
    setBusy(false);
    if (r.ok) { setMsg({ kind: "ok", text: editing ? "Saved and sent back to review." : "Submitted. Members see it once the team approves it." }); reset(); load(); refresh(); }
    else setMsg({ kind: "err", text: r.data.error || "Could not save." });
  }
  async function remove(id: string) {
    if (!confirm("Archive this offer? Members will no longer see it.")) return;
    await api(`/api/partner/offers/${id}`, { method: "DELETE" });
    load(); refresh();
  }
  if (!me) return null;

  return (
    <div className="pw-grid c2">
      <section>
        <div className="pw-card" style={{ marginBottom: 18 }}>
          <h2>Member offers</h2>
          <p className="lead" style={{ margin: 0 }}>Your partner agreement asks for one exclusive member offer that beats your standard pricing. Changes to a live offer need 30 days&apos; notice, so set an end date rather than editing mid-flight.</p>
        </div>
        {loading ? <div className="pw-card pw-empty">Loading…</div> : rows.length === 0 ? (
          <div className="pw-card pw-empty"><b>No offers yet</b>Your company offer from the application is on your profile. Turn it into a redeemable offer here with a code or a link.</div>
        ) : (
          <div className="pw-items">
            {rows.map((o) => (
              <article className="pw-item" key={o.id}>
                {o.image_url && (
                  <div className="img">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={o.image_url} alt="" />
                  </div>
                )}
                <div className="bd">
                  <div className="val">{o.discount_value}</div>
                  <b>{o.headline}</b>
                  <p>{o.description.slice(0, 120)}{o.description.length > 120 ? "…" : ""}</p>
                  <div className="meta">
                    <span className={`pw-tag ${o.review_status}`}>{LABEL[o.review_status] || o.review_status}</span>
                    {o.promo_code && <span className="code">{o.promo_code}</span>}
                    <span>{o.valid_to ? `Until ${fmtDate(o.valid_to)}` : "No end date"}</span>
                  </div>
                  {o.review_note && o.review_status === "needs_changes" && <p style={{ color: "#9a3b1e", marginTop: 8 }}>Team note: {o.review_note}</p>}
                </div>
                <div className="ft"><button className="pw-btn ghost sm" onClick={() => startEdit(o)}>Edit</button><button className="pw-btn danger sm" onClick={() => remove(o.id)}>Archive</button></div>
              </article>
            ))}
          </div>
        )}
      </section>

      <form className="pw-card" onSubmit={submit} style={{ alignSelf: "start" }}>
        <h2>{editing ? "Edit offer" : "Create an offer"}</h2>
        <p className="lead">Members redeem with a code, a link, or by mentioning VSN when they book.</p>
        {msg && <div className={`pw-msg ${msg.kind}`}>{msg.text}</div>}
        <div className="pw-field"><label>Headline</label><input value={f.headline || ""} onChange={set("headline")} maxLength={160} required placeholder="Two months free on Ekwa's Core plan" /></div>
        <div className="pw-2col">
          <div className="pw-field"><label>Member value</label><input value={f.discount_value || ""} onChange={set("discount_value")} maxLength={80} required placeholder="$250 off x 2 months" /></div>
          <div className="pw-field"><label>Promo code <small>(optional)</small></label><input value={f.promo_code || ""} onChange={set("promo_code")} maxLength={40} placeholder="VSN250" /></div>
        </div>
        <div className="pw-field"><label>Description</label><textarea value={f.description || ""} onChange={set("description")} maxLength={1000} required style={{ minHeight: 90 }} /></div>
        <div className="pw-field"><label>Terms <small>(optional)</small></label><textarea value={f.terms || ""} onChange={set("terms")} maxLength={4000} style={{ minHeight: 70 }} /></div>
        <div className="pw-2col">
          <div className="pw-field"><label>Valid from</label><input type="date" value={f.valid_from || ""} onChange={set("valid_from")} /></div>
          <div className="pw-field"><label>Valid to <small>(blank = open ended)</small></label><input type="date" value={f.valid_to || ""} onChange={set("valid_to")} /></div>
        </div>
        <div className="pw-2col">
          <div className="pw-field"><label>Redemption link <small>(optional)</small></label><input value={f.redeem_url || ""} onChange={set("redeem_url")} inputMode="url" placeholder="www.yoursite.com/vsn" /></div>
          <div className="pw-field"><label>Limit per member</label><select value={f.limit || "unlimited"} onChange={set("limit")}><option value="unlimited">Unlimited</option><option value="once">Once</option><option value="once per year">Once per year</option></select></div>
        </div>
        <div className="pw-field"><label>Attach to catalog item <small>(optional)</small></label><select value={f.catalog_item_id || ""} onChange={set("catalog_item_id")}><option value="">None</option>{items.map((i) => <option key={i.id} value={i.id}>{i.name}</option>)}</select></div>
        {!editing && <div className="pw-field"><label>Image <small>(optional)</small></label><input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp" onChange={(e) => setImage(e.target.files?.[0] || null)} /></div>}
        <div style={{ display: "flex", gap: 8 }}>
          <button className="pw-btn primary" type="submit" disabled={busy}>{busy ? "Saving…" : editing ? "Save changes" : "Submit for review"}</button>
          {editing && <button type="button" className="pw-btn ghost" onClick={reset}>Cancel</button>}
        </div>
      </form>
    </div>
  );
}
