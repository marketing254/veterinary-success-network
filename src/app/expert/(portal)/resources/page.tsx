"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { useExpert, api, fmtDate } from "@/components/expert/ExpertContext";

type Kit = { id: string; title: string; description: string | null; kind: string; external_url: string | null; file_name: string | null; file_size: number | null; status: string; submitted_at: string; review_note: string | null; published_url: string | null; downloadUrl: string | null; created_at: string };

const KINDS: [string, string][] = [
  ["recording", "Recording (video or audio)"],
  ["slide_deck", "Slide deck"],
  ["sop", "SOP or process"],
  ["template", "Template"],
  ["checklist", "Checklist"],
  ["worksheet", "Worksheet"],
  ["pdf", "PDF or guide"],
  ["link", "Link to existing content"],
  ["other", "Other"],
];

const STATUS_LABEL: Record<string, string> = { pending_review: "In review", needs_changes: "Needs changes", approved: "Published", rejected: "Declined", draft: "Draft" };

function size(n: number | null) {
  if (!n) return "";
  return n > 1024 * 1024 ? `${(n / 1024 / 1024).toFixed(1)} MB` : `${Math.round(n / 1024)} KB`;
}

export default function ExpertKitsPage() {
  const { me, refresh } = useExpert();
  const [rows, setRows] = useState<Kit[]>([]);
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [kind, setKind] = useState("recording");
  const [link, setLink] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  async function load() {
    const r = await api<{ rows: Kit[] }>("/api/expert/resources");
    if (r.ok) setRows(r.data.rows);
    setLoading(false);
  }
  useEffect(() => {
    load();
  }, []);

  async function submit(ev: FormEvent) {
    ev.preventDefault();
    setBusy(true);
    setMsg(null);
    const fd = new FormData();
    fd.append("title", title);
    fd.append("description", desc);
    fd.append("kind", kind);
    if (link) fd.append("external_url", link);
    if (file) fd.append("file", file);
    const r = await api("/api/expert/resources", { method: "POST", body: fd });
    setBusy(false);
    if (r.ok) {
      setMsg({ kind: "ok", text: "Submitted. The team reviews it, brands it, and lets you approve the final kit before it goes live." });
      setTitle(""); setDesc(""); setLink(""); setFile(null);
      if (fileRef.current) fileRef.current.value = "";
      load();
      refresh();
    } else setMsg({ kind: "err", text: r.data.error || "Could not submit." });
  }

  async function remove(id: string) {
    if (!confirm("Withdraw this kit? The team will no longer see it.")) return;
    await api(`/api/expert/resources/${id}`, { method: "DELETE" });
    load();
    refresh();
  }

  if (!me) return null;

  return (
    <div className="xp-grid c2">
      <section className="xp-card">
        <h2>Your kits</h2>
        <p className="lead">One recording becomes a full kit: training video, action guide, checklist, worksheet and slide deck, in your branding. Every kit carries a book-a-meeting button to you.</p>
        {loading ? (
          <div className="xp-empty">Loading…</div>
        ) : rows.length === 0 ? (
          <div className="xp-empty"><b>No kits yet</b>Share your first recording or document on the right. Most experts start with a 20 to 40 minute teaching session.</div>
        ) : (
          <div className="xp-list">
            {rows.map((k) => (
              <div className="xp-row" key={k.id}>
                <div className="ic">{k.kind.replace("_", " ").slice(0, 5)}</div>
                <div className="bd">
                  <b>{k.title}</b>
                  {k.description && <p>{k.description}</p>}
                  {k.review_note && k.status === "needs_changes" && <p style={{ color: "#9a3b1e" }}>Team note: {k.review_note}</p>}
                  <div className="meta">
                    <span className={`xp-tag ${k.status}`}>{STATUS_LABEL[k.status] || k.status}</span>
                    <span>Submitted {fmtDate(k.submitted_at)}</span>
                    {k.file_name && <span>{k.file_name} {size(k.file_size)}</span>}
                  </div>
                </div>
                <div className="acts">
                  {k.published_url && <a className="xp-btn sm primary" href={k.published_url} target="_blank" rel="noreferrer">View live</a>}
                  {k.downloadUrl && <a className="xp-btn sm ghost" href={k.downloadUrl} target="_blank" rel="noreferrer">File</a>}
                  {k.external_url && <a className="xp-btn sm ghost" href={k.external_url} target="_blank" rel="noreferrer">Link</a>}
                  {k.status !== "approved" && <button className="xp-btn sm danger" onClick={() => remove(k.id)}>Withdraw</button>}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <form className="xp-card" onSubmit={submit} style={{ alignSelf: "start" }}>
        <h2>Submit a kit</h2>
        <p className="lead">Upload a file (up to 50 MB) or paste a link to a recording on Zoom, Loom, Drive or YouTube.</p>
        {!me.expert.agreement_signed_at && <div className="xp-msg info">You can submit now; kits are published once your agreement is accepted.</div>}
        {msg && <div className={`xp-msg ${msg.kind}`}>{msg.text}</div>}
        <div className="xp-field"><label>Title</label><input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={200} required placeholder="e.g. Fixing no-shows without discounting" /></div>
        <div className="xp-field">
          <label>Type</label>
          <select value={kind} onChange={(e) => setKind(e.target.value)}>{KINDS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select>
        </div>
        <div className="xp-field"><label>What members will learn <small>(optional)</small></label><textarea value={desc} onChange={(e) => setDesc(e.target.value)} maxLength={4000} style={{ minHeight: 90 }} /></div>
        <div className="xp-field">
          <label>File</label>
          <input ref={fileRef} type="file" onChange={(e) => setFile(e.target.files?.[0] || null)} />
          <div className="hint">PDF, Office, image, MP4, MP3 or ZIP.</div>
        </div>
        <div className="xp-field"><label>Or a link</label><input value={link} onChange={(e) => setLink(e.target.value)} inputMode="url" placeholder="loom.com/share/…" /></div>
        <button className="xp-btn primary" type="submit" disabled={busy}>{busy ? "Uploading…" : "Submit for review"}</button>
      </form>
    </div>
  );
}
