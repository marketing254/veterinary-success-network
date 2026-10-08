"use client";

import { FormEvent, useEffect, useState } from "react";
import { adminApi, useFlash, Head } from "@/components/admin/useAdmin";

type Draft = { key: string; label: string; audience: string };

export default function EmailPreviewsPage() {
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [sandbox, setSandbox] = useState<{ on: boolean; to: string } | null>(null);
  const [sel, setSel] = useState<Set<string>>(new Set());
  const [to, setTo] = useState("");
  const [busy, setBusy] = useState(false);
  const [results, setResults] = useState<{ key: string; ok: boolean; error?: string }[]>([]);
  const { flash, Msg } = useFlash();

  useEffect(() => {
    adminApi<{ drafts: Draft[]; sandbox: boolean; sandboxTo: string }>("/api/admin/email-previews").then((r) => {
      if (r.ok) { setDrafts(r.data.drafts); setSandbox({ on: r.data.sandbox, to: r.data.sandboxTo }); setSel(new Set(r.data.drafts.map((d) => d.key))); }
    });
  }, []);

  async function send(ev: FormEvent) {
    ev.preventDefault();
    setBusy(true); setResults([]);
    const r = await adminApi<{ results: { key: string; ok: boolean; error?: string }[] }>("/api/admin/email-previews", { method: "POST", body: JSON.stringify({ to, keys: [...sel] }) });
    setBusy(false);
    if (r.ok) { setResults(r.data.results); flash("ok", `${r.data.results.filter((x) => x.ok).length} of ${r.data.results.length} sent.`); } else flash("err", r.data.error || "Failed.");
  }
  const toggle = (k: string) => setSel((s) => { const n = new Set(s); if (n.has(k)) n.delete(k); else n.add(k); return n; });

  return (
    <>
      <Head title="Email drafts" sub="Send every transactional email with sample data (Jordan Lee, Radiance Diagnostics) to one inbox to check copy, fonts and the PDF attachments before any flow test.">
        {sandbox && <span className="adm-chip">{sandbox.on ? `Sandbox ON · everything lands in ${sandbox.to}` : "Sandbox OFF · real delivery"}</span>}
      </Head>
      {Msg}
      <div className="adm-card">
        <form className="adm-form" onSubmit={send}>
          <div className="frow full"><label className="flab">Send to</label><input type="email" required value={to} onChange={(e) => setTo(e.target.value)} placeholder="you@example.com" /></div>
          <div className="full" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 8, marginBottom: 14 }}>
            {drafts.map((d) => {
              const res = results.find((r) => r.key === d.key);
              return (
                <label key={d.key} className="adm-check"><input type="checkbox" checked={sel.has(d.key)} onChange={() => toggle(d.key)} /> {d.label} <span className="adm-chip">{d.audience}</span>{res && <span style={{ color: res.ok ? "var(--deep)" : "#a04b2e", fontWeight: 700 }}>{res.ok ? "sent" : res.error}</span>}</label>
              );
            })}
          </div>
          <div className="actions">
            <button className="adm-btn primary" disabled={busy || sel.size === 0}>{busy ? "Sending…" : `Send ${sel.size} draft${sel.size === 1 ? "" : "s"}`}</button>
            <button type="button" className="adm-btn" onClick={() => setSel(new Set(drafts.map((d) => d.key)))}>All</button>
            <button type="button" className="adm-btn" onClick={() => setSel(new Set())}>None</button>
          </div>
        </form>
      </div>
    </>
  );
}
