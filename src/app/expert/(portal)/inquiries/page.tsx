"use client";

import { FormEvent, useEffect, useState } from "react";
import { useExpert, api, timeAgo, fmtDate } from "@/components/expert/ExpertContext";

type Inq = { id: string; from_name: string; from_email: string; practice_name: string | null; subject: string | null; body: string; source: string; status: string; reply_count: number; created_at: string; updated_at: string };
type Reply = { id: string; author_kind: string; author_display_name: string; body: string; created_at: string };

export default function ExpertInquiriesPage() {
  const { me, refresh } = useExpert();
  const [tab, setTab] = useState<"open" | "answered" | "closed" | "all">("open");
  const [rows, setRows] = useState<Inq[]>([]);
  const [loading, setLoading] = useState(true);
  const [active, setActive] = useState<Inq | null>(null);
  const [replies, setReplies] = useState<Reply[]>([]);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function load(t = tab) {
    setLoading(true);
    const r = await api<{ rows: Inq[] }>(`/api/expert/inquiries?status=${t}`);
    if (r.ok) setRows(r.data.rows);
    setLoading(false);
  }
  useEffect(() => {
    load(tab);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  async function openThread(i: Inq) {
    setActive(i);
    setMsg(null);
    const r = await api<{ inquiry: Inq; replies: Reply[] }>(`/api/expert/inquiries/${i.id}`);
    if (r.ok) setReplies(r.data.replies);
  }

  async function reply(ev: FormEvent) {
    ev.preventDefault();
    if (!active || !text.trim()) return;
    setBusy(true);
    const r = await api(`/api/expert/inquiries/${active.id}`, { method: "POST", body: JSON.stringify({ body: text }) });
    setBusy(false);
    if (r.ok) {
      setText("");
      setMsg("Reply sent. The member gets it by email with your address as reply-to.");
      openThread(active);
      load();
      refresh();
    } else setMsg(r.data.error || "Could not send.");
  }

  async function setStatus(status: string) {
    if (!active) return;
    await api(`/api/expert/inquiries/${active.id}`, { method: "PATCH", body: JSON.stringify({ status }) });
    setActive({ ...active, status });
    load();
    refresh();
  }

  if (!me) return null;

  return (
    <div className="xp-grid c2">
      <section>
        <div className="xp-tabs">
          {(["open", "answered", "closed", "all"] as const).map((t) => (
            <button key={t} className={tab === t ? "on" : undefined} onClick={() => setTab(t)} style={{ textTransform: "capitalize" }}>{t}</button>
          ))}
        </div>
        {loading ? (
          <div className="xp-empty">Loading…</div>
        ) : rows.length === 0 ? (
          <div className="xp-card xp-empty"><b>No {tab === "all" ? "" : tab} inquiries</b>When a member contacts you through your profile or the Expert Hotline routes a question to you, it lands here. Aim to reply within one business day.</div>
        ) : (
          <div className="xp-list">
            {rows.map((i) => (
              <button key={i.id} className="xp-row" onClick={() => openThread(i)} style={{ textAlign: "left", cursor: "pointer", font: "inherit", borderColor: active?.id === i.id ? "var(--xp-green)" : undefined }}>
                <div className="ic">{i.source === "hotline" ? "Hot" : i.source === "resource" ? "Kit" : "Msg"}</div>
                <div className="bd">
                  <b>{i.subject || `Question from ${i.from_name}`}</b>
                  <p>{i.from_name}{i.practice_name ? ` · ${i.practice_name}` : ""}</p>
                  <p style={{ color: "var(--xp-ink)" }}>{i.body.slice(0, 140)}{i.body.length > 140 ? "…" : ""}</p>
                  <div className="meta"><span className={`xp-tag ${i.status}`}>{i.status}</span><span>{i.reply_count} replies</span><span>{timeAgo(i.updated_at)}</span></div>
                </div>
              </button>
            ))}
          </div>
        )}
      </section>

      <section className="xp-card" style={{ alignSelf: "start" }}>
        {!active ? (
          <div className="xp-empty"><b>Select an inquiry</b>The full thread and your reply box appear here.</div>
        ) : (
          <>
            <h2>{active.subject || `Question from ${active.from_name}`}</h2>
            <p className="lead">{active.from_name} · {active.from_email}{active.practice_name ? ` · ${active.practice_name}` : ""} · {fmtDate(active.created_at)}</p>
            <div className="xp-comment" style={{ marginBottom: 12, whiteSpace: "pre-wrap" }}>{active.body}</div>
            <div className="xp-comments" style={{ marginBottom: 14 }}>
              {replies.map((r) => (
                <div className="xp-comment" key={r.id} style={{ background: r.author_kind === "expert" ? "#eafad6" : "#f6fbf0", whiteSpace: "pre-wrap" }}>
                  <b>{r.author_display_name}</b>{r.body}
                  <small>{timeAgo(r.created_at)}</small>
                </div>
              ))}
            </div>
            {msg && <div className="xp-msg ok">{msg}</div>}
            <form onSubmit={reply}>
              <div className="xp-field"><textarea value={text} onChange={(e) => setText(e.target.value)} maxLength={4000} placeholder="Write your reply. Keep it specific; include your booking link if a call is the next step." /></div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <button className="xp-btn primary" type="submit" disabled={busy || !text.trim()}>{busy ? "Sending…" : "Send reply"}</button>
                {active.status !== "closed" ? (
                  <button type="button" className="xp-btn ghost" onClick={() => setStatus("closed")}>Mark closed</button>
                ) : (
                  <button type="button" className="xp-btn ghost" onClick={() => setStatus("open")}>Reopen</button>
                )}
              </div>
            </form>
          </>
        )}
      </section>
    </div>
  );
}
