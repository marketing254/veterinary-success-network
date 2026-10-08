"use client";

import { FormEvent, useEffect, useState } from "react";
import { usePartner, api, timeAgo, fmtDate } from "@/components/partner/PartnerContext";

type Inq = { id: string; from_name: string; from_email: string; practice_name: string | null; subject: string | null; body: string; source: string; status: string; reply_count: number; created_at: string; updated_at: string };
type Reply = { id: string; author_kind: string; author_display_name: string; body: string; created_at: string };

export default function PartnerInquiriesPage() {
  const { me, refresh } = usePartner();
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
    const r = await api<{ rows: Inq[] }>(`/api/partner/inquiries?status=${t}`);
    if (r.ok) setRows(r.data.rows);
    setLoading(false);
  }
  useEffect(() => { load(tab); // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  async function openThread(i: Inq) {
    setActive(i); setMsg(null);
    const r = await api<{ replies: Reply[] }>(`/api/partner/inquiries/${i.id}`);
    if (r.ok) setReplies(r.data.replies);
  }
  async function reply(ev: FormEvent) {
    ev.preventDefault();
    if (!active || !text.trim()) return;
    setBusy(true);
    const r = await api(`/api/partner/inquiries/${active.id}`, { method: "POST", body: JSON.stringify({ body: text }) });
    setBusy(false);
    if (r.ok) { setText(""); setMsg("Reply sent. The member gets it by email with your contact address as reply-to."); openThread(active); load(); refresh(); }
    else setMsg(r.data.error || "Could not send.");
  }
  async function setStatus(status: string) {
    if (!active) return;
    await api(`/api/partner/inquiries/${active.id}`, { method: "PATCH", body: JSON.stringify({ status }) });
    setActive({ ...active, status }); load(); refresh();
  }
  if (!me) return null;

  return (
    <div className="pw-grid c2">
      <section>
        <div className="pw-seg">{(["open", "answered", "closed", "all"] as const).map((t) => <button key={t} className={tab === t ? "on" : undefined} onClick={() => setTab(t)}>{t}</button>)}</div>
        {loading ? <div className="pw-card pw-empty">Loading…</div> : rows.length === 0 ? (
          <div className="pw-card pw-empty"><b>No {tab === "all" ? "" : tab} inquiries</b>When a member contacts you from your listing or an offer, it lands here. Your commitment is a reply within one business day.</div>
        ) : (
          <div className="pw-list">
            {rows.map((i) => (
              <button key={i.id} className="pw-row" onClick={() => openThread(i)} style={{ textAlign: "left", cursor: "pointer", font: "inherit", borderColor: active?.id === i.id ? "var(--pw-green)" : undefined }}>
                <div className="ic">{i.source === "offer" ? "Offer" : i.source === "hotline" ? "Hot" : "Msg"}</div>
                <div className="bd">
                  <b>{i.subject || `Question from ${i.from_name}`}</b>
                  <p>{i.from_name}{i.practice_name ? ` · ${i.practice_name}` : ""}</p>
                  <p style={{ color: "var(--pw-ink)" }}>{i.body.slice(0, 140)}{i.body.length > 140 ? "…" : ""}</p>
                  <div className="meta"><span className={`pw-tag ${i.status}`}>{i.status}</span><span>{i.reply_count} replies</span><span>{timeAgo(i.updated_at)}</span></div>
                </div>
              </button>
            ))}
          </div>
        )}
      </section>
      <section className="pw-card" style={{ alignSelf: "start" }}>
        {!active ? <div className="pw-empty"><b>Select an inquiry</b>The thread and your reply box appear here.</div> : (
          <>
            <h2>{active.subject || `Question from ${active.from_name}`}</h2>
            <p className="lead">{active.from_name} · {active.from_email}{active.practice_name ? ` · ${active.practice_name}` : ""} · {fmtDate(active.created_at)}</p>
            <div className="pw-thread" style={{ marginBottom: 10 }}>{active.body}</div>
            <div className="pw-list" style={{ gap: 8, marginBottom: 14 }}>
              {replies.map((r) => <div key={r.id} className={`pw-thread${r.author_kind === "partner" ? " me" : ""}`}><b>{r.author_display_name}</b>{r.body}<small>{timeAgo(r.created_at)}</small></div>)}
            </div>
            {msg && <div className="pw-msg ok">{msg}</div>}
            <form onSubmit={reply}>
              <div className="pw-field"><textarea value={text} onChange={(e) => setText(e.target.value)} maxLength={4000} placeholder="Write your reply. Include your booking link if a call is the next step." /></div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <button className="pw-btn primary" type="submit" disabled={busy || !text.trim()}>{busy ? "Sending…" : "Send reply"}</button>
                {active.status !== "closed" ? <button type="button" className="pw-btn ghost" onClick={() => setStatus("closed")}>Mark closed</button> : <button type="button" className="pw-btn ghost" onClick={() => setStatus("open")}>Reopen</button>}
              </div>
            </form>
          </>
        )}
      </section>
    </div>
  );
}
