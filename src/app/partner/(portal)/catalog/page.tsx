"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { usePartner, api } from "@/components/partner/PartnerContext";
import CategoryPicker from "@/components/forms/CategoryPicker";

type Item = { id: string; type: string; name: string; tagline: string | null; description: string; category: string | null; price_label: string | null; highlights: string[]; link_url: string | null; review_status: string; review_note: string | null; offer_count: number; created_at: string; partner_catalog_media: { id: string; url: string }[] };

const LABEL: Record<string, string> = { pending_review: "In review", needs_changes: "Needs changes", approved: "Live", rejected: "Declined", draft: "Draft" };

export default function PartnerCatalogPage() {
  const { me, refresh } = usePartner();
  const [rows, setRows] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Item | null>(null);
  const [f, setF] = useState<Record<string, string>>({ type: "service" });
  const [image, setImage] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  async function load() {
    const r = await api<{ rows: Item[] }>("/api/partner/catalog");
    if (r.ok) setRows(r.data.rows);
    setLoading(false);
  }
  useEffect(() => { load(); }, []);
  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => setF((s) => ({ ...s, [k]: e.target.value }));

  function startEdit(it: Item) {
    setEditing(it);
    setF({ type: it.type, name: it.name, tagline: it.tagline || "", description: it.description, category: it.category || "", price_label: it.price_label || "", highlights: (it.highlights || []).join("\n"), link_url: it.link_url || "" });
    setMsg(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
  function reset() { setEditing(null); setF({ type: "service" }); setImage(null); if (fileRef.current) fileRef.current.value = ""; }

  async function submit(ev: FormEvent) {
    ev.preventDefault();
    setBusy(true); setMsg(null);
    let r;
    if (editing) {
      r = await api(`/api/partner/catalog/${editing.id}`, { method: "PATCH", body: JSON.stringify(f) });
    } else {
      const fd = new FormData();
      Object.entries(f).forEach(([k, v]) => fd.append(k, v));
      if (image) fd.append("image", image);
      r = await api("/api/partner/catalog", { method: "POST", body: fd });
    }
    setBusy(false);
    if (r.ok) { setMsg({ kind: "ok", text: editing ? "Saved and sent back to review." : "Submitted for review. It goes live once the team approves it." }); reset(); load(); refresh(); }
    else setMsg({ kind: "err", text: r.data.error || "Could not save." });
  }
  async function remove(id: string) {
    if (!confirm("Archive this item? It disappears from your listing.")) return;
    await api(`/api/partner/catalog/${id}`, { method: "DELETE" });
    load(); refresh();
  }
  if (!me) return null;

  return (
    <div className="pw-grid c2">
      <section>
        <div className="pw-card" style={{ marginBottom: 18 }}>
          <h2>Catalog</h2>
          <p className="lead" style={{ margin: 0 }}>Services, products and courses members can browse. Each item is reviewed before it is shown, and edits go back through review.</p>
        </div>
        {loading ? <div className="pw-card pw-empty">Loading…</div> : rows.length === 0 ? (
          <div className="pw-card pw-empty"><b>No catalog items yet</b>Add the one or two things practice owners most often buy from you. Attach an offer to each item to boost conversions.</div>
        ) : (
          <div className="pw-items">
            {rows.map((it) => (
              <article className="pw-item" key={it.id}>
                <div className="img">{it.partner_catalog_media?.[0]?.url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={it.partner_catalog_media[0].url} alt="" />
                ) : it.name.slice(0, 1)}</div>
                <div className="bd">
                  <b>{it.name}</b>
                  <p>{it.tagline || it.description.slice(0, 110)}</p>
                  <div className="meta"><span className={`pw-tag ${it.review_status}`}>{LABEL[it.review_status] || it.review_status}</span><span style={{ textTransform: "capitalize" }}>{it.type}</span>{it.price_label && <span>{it.price_label}</span>}{it.offer_count > 0 && <span>{it.offer_count} offer{it.offer_count > 1 ? "s" : ""}</span>}</div>
                  {it.review_note && it.review_status === "needs_changes" && <p style={{ color: "#9a3b1e", marginTop: 8 }}>Team note: {it.review_note}</p>}
                </div>
                <div className="ft"><button className="pw-btn ghost sm" onClick={() => startEdit(it)}>Edit</button><button className="pw-btn danger sm" onClick={() => remove(it.id)}>Archive</button></div>
              </article>
            ))}
          </div>
        )}
      </section>

      <form className="pw-card" onSubmit={submit} style={{ alignSelf: "start" }}>
        <h2>{editing ? `Edit: ${editing.name}` : "Add a catalog item"}</h2>
        <p className="lead">Plain language. Lead with the outcome for the practice, not the feature list.</p>
        {msg && <div className={`pw-msg ${msg.kind}`}>{msg.text}</div>}
        <div className="pw-2col">
          <div className="pw-field"><label>Type</label><select value={f.type || "service"} onChange={set("type")}><option value="service">Service</option><option value="product">Product</option><option value="course">Course</option></select></div>
          <div className="pw-field"><label>Category</label><CategoryPicker value={f.category || ""} onChange={(v) => setF((s) => ({ ...s, category: v }))} emptyLabel="Same as company" /></div>
        </div>
        <div className="pw-field"><label>Name</label><input value={f.name || ""} onChange={set("name")} maxLength={200} required /></div>
        <div className="pw-field"><label>Tagline <small>(one line)</small></label><input value={f.tagline || ""} onChange={set("tagline")} maxLength={240} /></div>
        <div className="pw-field"><label>Description</label><textarea value={f.description || ""} onChange={set("description")} maxLength={4000} required /></div>
        <div className="pw-field"><label>Highlights <small>one per line, up to 8</small></label><textarea value={f.highlights || ""} onChange={set("highlights")} style={{ minHeight: 80 }} /></div>
        <div className="pw-2col">
          <div className="pw-field"><label>Price label</label><input value={f.price_label || ""} onChange={set("price_label")} maxLength={60} placeholder="From $249/mo" /></div>
          <div className="pw-field"><label>Learn more link</label><input value={f.link_url || ""} onChange={set("link_url")} inputMode="url" placeholder="www.yoursite.com/product" /></div>
        </div>
        {!editing && (
          <div className="pw-field"><label>Image <small>(optional, under 5 MB)</small></label><input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp" onChange={(e) => setImage(e.target.files?.[0] || null)} /></div>
        )}
        <div style={{ display: "flex", gap: 8 }}>
          <button className="pw-btn primary" type="submit" disabled={busy}>{busy ? "Saving…" : editing ? "Save changes" : "Submit for review"}</button>
          {editing && <button type="button" className="pw-btn ghost" onClick={reset}>Cancel</button>}
        </div>
      </form>
    </div>
  );
}
