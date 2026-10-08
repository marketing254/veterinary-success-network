"use client";

import { useEffect, useState } from "react";
import { adminApi, useFlash } from "./useAdmin";
import { fmtDate, StatusBadge } from "./RecordsPage";

type Res = { id: string; position: number; full_name: string; email: string; status: string; launch_email_sent_at: string | null; created_at: string };

/** "The doors are open" bulk send. Only works when MEMBER_LAUNCH_ENABLED is true on the server. */
export default function LaunchEmailPanel({ onDone }: { onDone: () => void }) {
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState<Res[]>([]);
  const [sel, setSel] = useState<Set<string>>(new Set());
  const [launch, setLaunch] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);
  const [resend, setResend] = useState(false);
  const { flash, Msg } = useFlash();

  useEffect(() => {
    if (!open) return;
    adminApi<{ rows: Res[] }>("/api/admin/reservations?status=all").then((r) => r.ok && setRows(r.data.rows.filter((x) => x.status === "reserved" || x.status === "invited")));
    adminApi<{ launchEnabled: boolean }>("/api/admin/overview").then((r) => r.ok && setLaunch(!!r.data.launchEnabled));
  }, [open]);

  const toggle = (id: string) => setSel((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  async function send() {
    if (!confirm(`Send "The doors are open" to ${sel.size} reservation${sel.size === 1 ? "" : "s"}?`)) return;
    setBusy(true);
    const r = await adminApi<{ sent: number; skipped: string[] }>("/api/admin/reservations/launch-email", { method: "POST", body: JSON.stringify({ ids: [...sel], resend }) });
    setBusy(false);
    if (r.ok) { flash("ok", `Sent ${r.data.sent}. ${r.data.skipped.length ? `Skipped: ${r.data.skipped.join(", ")}` : ""}`); setSel(new Set()); onDone(); setOpen(false); }
    else flash("err", r.data.error || "Failed.");
  }

  return (
    <div className="adm-card">
      <div className="hd">
        <h2>Launch email</h2>
        <button className="adm-btn" onClick={() => setOpen((o) => !o)}>{open ? "Close" : "Send \"The doors are open\""}</button>
      </div>
      {open && (
        <div style={{ padding: "0 20px 16px" }}>
          {Msg}
          {launch === false && <div className="adm-msg show err">Member launch is OFF. Set MEMBER_LAUNCH_ENABLED=true and NEXT_PUBLIC_MEMBER_LAUNCH_ENABLED=true in Vercel, redeploy, then come back. Until then nothing is sent.</div>}
          <p style={{ fontSize: 13.5, color: "var(--muted)", margin: "12px 0" }}>Pick the reservations to invite. Each gets one email linking to the join page with their details prefilled. Rows already sent are skipped unless you tick resend.</p>
          <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 10, flexWrap: "wrap" }}>
            <button className="adm-btn sm" onClick={() => setSel(new Set(rows.filter((r) => !r.launch_email_sent_at).map((r) => r.id)))}>Select all unsent</button>
            <button className="adm-btn sm" onClick={() => setSel(new Set())}>None</button>
            <label className="adm-check"><input type="checkbox" checked={resend} onChange={(e) => setResend(e.target.checked)} /> Allow resend to rows already sent</label>
            <button className="adm-btn primary sm" disabled={busy || sel.size === 0 || launch === false} onClick={send}>{busy ? "Sending…" : `Send to ${sel.size}`}</button>
          </div>
          <div className="adm-tablewrap">
            <table className="adm-table">
              <thead><tr><th></th><th>Spot</th><th>Member</th><th>Status</th><th>Launch email</th></tr></thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} onClick={() => toggle(r.id)}>
                    <td><input type="checkbox" checked={sel.has(r.id)} onChange={() => toggle(r.id)} onClick={(e) => e.stopPropagation()} /></td>
                    <td>#{r.position}</td>
                    <td className="em">{r.full_name}<span className="sub">{r.email}</span></td>
                    <td><StatusBadge status={r.status} /></td>
                    <td>{r.launch_email_sent_at ? `Sent ${fmtDate(r.launch_email_sent_at)}` : "Not sent"}</td>
                  </tr>
                ))}
                {rows.length === 0 && <tr><td colSpan={5}><div className="adm-empty">No open reservations.</div></td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
