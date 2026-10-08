"use client";

import { FormEvent, useState } from "react";
import { fmtDate, StatusBadge } from "@/components/admin/RecordsPage";
import { adminApi, useAdminList, useFlash, Head } from "@/components/admin/useAdmin";

type Post = { id: string; author: string; author_kind: string; content: string; link_url: string | null; status: string; published_at: string | null; hidden_reason: string | null; reaction_count: number; comment_count: number; created_at: string };

export default function BroadcastPage() {
  const { rows, loading, reload } = useAdminList<Post>("/api/admin/broadcast");
  const { flash, Msg } = useFlash();
  const [content, setContent] = useState("");
  const [link, setLink] = useState("");
  const [busy, setBusy] = useState(false);

  async function post(ev: FormEvent) {
    ev.preventDefault();
    setBusy(true);
    const r = await adminApi("/api/admin/broadcast", { method: "POST", body: JSON.stringify({ content, link_url: link }) });
    setBusy(false);
    if (r.ok) { flash("ok", "Posted to the network feed as the VSN team."); setContent(""); setLink(""); reload(); } else flash("err", r.data.error || "Failed.");
  }
  async function act(id: string, action: string) {
    const reason = action === "hide" ? prompt("Reason (kept in the audit log, shown to nobody else):") || "" : "";
    if (action === "delete" && !confirm("Delete this post?")) return;
    const r = await adminApi("/api/admin/broadcast", { method: "PATCH", body: JSON.stringify({ id, action, reason }) });
    if (r.ok) reload(); else flash("err", r.data.error || "Failed.");
  }

  return (
    <>
      <Head title="Network feed" sub="Post as the VSN team, and moderate what experts and partners publish. Hidden posts disappear from every portal but stay in the record." />
      {Msg}
      <div className="adm-card">
        <div className="hd"><h2>Broadcast</h2></div>
        <form className="adm-form" onSubmit={post}>
          <div className="frow full"><textarea required value={content} onChange={(e) => setContent(e.target.value)} maxLength={4000} placeholder="A short, practical update for the whole network…" /></div>
          <div className="frow full"><label className="flab">Link (optional)</label><input type="text" value={link} onChange={(e) => setLink(e.target.value)} placeholder="www.example.com/article" /></div>
          <div className="actions"><button className="adm-btn primary" disabled={busy || content.trim().length < 2}>Publish</button></div>
        </form>
      </div>
      <div className="adm-card">
        <div className="hd"><h2>All posts</h2><span style={{ fontSize: 12.5, color: "var(--muted)" }}>{loading ? "Loading…" : `${rows.length} posts`}</span></div>
        <div className="adm-feed">
          {rows.length === 0 && !loading && <div className="adm-empty">No posts yet.</div>}
          {rows.map((p) => (
            <div className="adm-post" key={p.id}>
              <div className="au"><span><b>{p.author}</b> · <StatusBadge status={p.author_kind} /> · {fmtDate(p.published_at || p.created_at)} · ♥ {p.reaction_count} · {p.comment_count} comments</span><span><StatusBadge status={p.status} /></span></div>
              <div className="ct">{p.content}</div>
              {p.link_url && <div style={{ marginTop: 6 }}><a href={p.link_url} target="_blank" rel="noreferrer" style={{ color: "var(--deep)", fontWeight: 700, fontSize: 13 }}>{p.link_url}</a></div>}
              {p.hidden_reason && <div className="sub" style={{ marginTop: 6, fontSize: 12, color: "var(--muted)" }}>Hidden: {p.hidden_reason}</div>}
              <div style={{ display: "flex", gap: 6, marginTop: 10 }}>
                {p.status === "published" ? <button className="adm-btn sm" onClick={() => act(p.id, "hide")}>Hide</button> : <button className="adm-btn sm" onClick={() => act(p.id, "unhide")}>Unhide</button>}
                <button className="adm-btn sm danger" onClick={() => act(p.id, "delete")}>Delete</button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
