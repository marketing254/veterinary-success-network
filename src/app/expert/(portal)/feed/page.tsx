"use client";

import { FormEvent, useEffect, useState } from "react";
import { useExpert, api, initials, timeAgo } from "@/components/expert/ExpertContext";

type Post = { id: string; mine: boolean; author: { name: string; subtitle: string; image: string | null }; content: string; link_url: string | null; published_at: string; reaction_count: number; comment_count: number; reacted: boolean };
type Comment = { id: string; author_display_name: string; author_subtitle: string | null; content: string; created_at: string; mine: boolean };

function linkify(text: string) {
  const parts = text.split(/(https?:\/\/[^\s]+)/g);
  return parts.map((p, i) => (/^https?:\/\//.test(p) ? <a key={i} href={p} target="_blank" rel="noreferrer">{p}</a> : <span key={i}>{p}</span>));
}

function PostCard({ p, onChange }: { p: Post; onChange: () => void }) {
  const [open, setOpen] = useState(false);
  const [comments, setComments] = useState<Comment[] | null>(null);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);

  async function loadComments() {
    const r = await api<{ rows: Comment[] }>(`/api/expert/posts/${p.id}`);
    if (r.ok) setComments(r.data.rows);
  }
  async function toggle() {
    setOpen((o) => !o);
    if (!comments) loadComments();
  }
  async function react() {
    await api(`/api/expert/posts/${p.id}`, { method: "POST", body: JSON.stringify({ action: p.reacted ? "unreact" : "react" }) });
    onChange();
  }
  async function comment(ev: FormEvent) {
    ev.preventDefault();
    if (!text.trim()) return;
    setBusy(true);
    const r = await api(`/api/expert/posts/${p.id}`, { method: "POST", body: JSON.stringify({ action: "comment", content: text }) });
    setBusy(false);
    if (r.ok) {
      setText("");
      loadComments();
      onChange();
    } else alert(r.data.error || "Could not comment.");
  }
  async function remove() {
    if (!confirm("Delete this post?")) return;
    await api(`/api/expert/posts/${p.id}`, { method: "DELETE" });
    onChange();
  }

  return (
    <article className="xp-post">
      <div className="au">
        <div className="xp-avatar" style={{ width: 40, height: 40 }}>
          {p.author.image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={p.author.image} alt="" />
          ) : (
            initials(p.author.name)
          )}
        </div>
        <div>
          <b>{p.author.name}</b>
          <span>{p.author.subtitle}</span>
        </div>
        <time>{timeAgo(p.published_at)}</time>
      </div>
      <div className="ct">{linkify(p.content)}</div>
      {p.link_url && <p style={{ margin: "10px 0 0", fontSize: 13.5 }}><a href={p.link_url} target="_blank" rel="noreferrer" style={{ color: "var(--xp-deep)", fontWeight: 700 }}>{p.link_url}</a></p>}
      <div className="ft">
        <button className={p.reacted ? "on" : undefined} onClick={react}>♥ {p.reaction_count}</button>
        <button onClick={toggle}>Comments {p.comment_count}</button>
        {p.mine && <button onClick={remove} style={{ marginLeft: "auto" }}>Delete</button>}
      </div>
      {open && (
        <div className="xp-comments">
          {comments === null ? (
            <div className="xp-empty" style={{ padding: 10 }}>Loading…</div>
          ) : comments.length === 0 ? (
            <div className="xp-empty" style={{ padding: 10 }}>No comments yet.</div>
          ) : (
            comments.map((c) => (
              <div className="xp-comment" key={c.id}>
                <b>{c.author_display_name}</b>{c.content}
                <small>{c.author_subtitle ? `${c.author_subtitle} · ` : ""}{timeAgo(c.created_at)}</small>
              </div>
            ))
          )}
          <form className="xp-compose" onSubmit={comment}>
            <input value={text} onChange={(e) => setText(e.target.value)} placeholder="Add a comment" maxLength={2000} />
            <button className="xp-btn sm primary" type="submit" disabled={busy}>Post</button>
          </form>
        </div>
      )}
    </article>
  );
}

export default function ExpertFeedPage() {
  const { me, refresh } = useExpert();
  const [scope, setScope] = useState<"network" | "mine">("network");
  const [rows, setRows] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [content, setContent] = useState("");
  const [link, setLink] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

  async function load(s = scope) {
    setLoading(true);
    const r = await api<{ rows: Post[] }>(`/api/expert/posts?scope=${s}`);
    if (r.ok) setRows(r.data.rows);
    setLoading(false);
  }
  useEffect(() => {
    load(scope);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scope]);

  async function publish(ev: FormEvent) {
    ev.preventDefault();
    setBusy(true);
    setMsg(null);
    const r = await api("/api/expert/posts", { method: "POST", body: JSON.stringify({ content, link_url: link }) });
    setBusy(false);
    if (r.ok) {
      setContent(""); setLink("");
      setMsg({ kind: "ok", text: "Published to the network feed." });
      load();
      refresh();
    } else setMsg({ kind: "err", text: r.data.error || "Could not publish." });
  }

  if (!me) return null;

  return (
    <div className="xp-grid c2">
      <section>
        <div className="xp-tabs">
          <button className={scope === "network" ? "on" : undefined} onClick={() => setScope("network")}>Network</button>
          <button className={scope === "mine" ? "on" : undefined} onClick={() => setScope("mine")}>My posts</button>
        </div>
        {loading ? (
          <div className="xp-empty">Loading…</div>
        ) : rows.length === 0 ? (
          <div className="xp-card xp-empty"><b>Quiet for now</b>Posts from the network&apos;s experts and partners appear here. Share a tip, a win, or a question to start.</div>
        ) : (
          <div className="xp-list">{rows.map((p) => <PostCard key={p.id} p={p} onChange={() => load()} />)}</div>
        )}
      </section>

      <form className="xp-card" onSubmit={publish} style={{ alignSelf: "start" }}>
        <h2>Share with the network</h2>
        <p className="lead">Short, practical and specific travels furthest. Members see this feed once the network opens.</p>
        {!me.expert.agreement_signed_at && <div className="xp-msg info">Accept your agreement to post.</div>}
        {msg && <div className={`xp-msg ${msg.kind}`}>{msg.text}</div>}
        <div className="xp-field"><textarea value={content} onChange={(e) => setContent(e.target.value)} maxLength={4000} placeholder="What should practice owners know this week?" /></div>
        <div className="xp-field"><label>Link <small>(optional)</small></label><input value={link} onChange={(e) => setLink(e.target.value)} inputMode="url" placeholder="www.example.com/article" /></div>
        <button className="xp-btn primary" type="submit" disabled={busy || !me.expert.agreement_signed_at || content.trim().length < 2}>{busy ? "Publishing…" : "Publish"}</button>
      </form>
    </div>
  );
}
