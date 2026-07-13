"use client";

import { useEffect, useState } from "react";
import { fmtDate } from "@/components/admin/RecordsPage";

type Action = {
  id: string;
  created_at: string;
  admin_email: string;
  entity_type: string;
  entity_id: string;
  action: string;
  note: string | null;
};

type AuthEvent = {
  id: string;
  created_at: string;
  email: string;
  event: string;
};

export default function AuditLogPage() {
  const [actions, setActions] = useState<Action[]>([]);
  const [auth, setAuth] = useState<AuthEvent[]>([]);
  const [err, setErr] = useState(false);

  useEffect(() => {
    fetch("/api/admin/audit")
      .then((r) => r.json())
      .then((d) => {
        if (!d.ok) return setErr(true);
        setActions(d.actions);
        setAuth(d.auth);
      })
      .catch(() => setErr(true));
  }, []);

  return (
    <>
      <div className="adm-head">
        <div>
          <h1>Audit log</h1>
          <p>Every review action and every sign-in event, newest first.</p>
        </div>
      </div>
      {err && <div className="adm-msg show err">Couldn&apos;t load the audit log.</div>}

      <div className="adm-card">
        <div className="hd"><h2>Review actions</h2></div>
        <div className="adm-tablewrap">
          <table className="adm-table">
            <thead>
              <tr><th>When</th><th>Admin</th><th>Record</th><th>Action</th><th>Note</th></tr>
            </thead>
            <tbody>
              {actions.map((a) => (
                <tr key={a.id}>
                  <td>{fmtDate(a.created_at)}</td>
                  <td className="em">{a.admin_email}</td>
                  <td>{a.entity_type.replace(/_/g, " ")}<span className="sub">{a.entity_id}</span></td>
                  <td><span className="badge new">{a.action.replace(/_/g, " ")}</span></td>
                  <td>{a.note || "—"}</td>
                </tr>
              ))}
              {actions.length === 0 && (
                <tr><td colSpan={5}><div className="adm-empty">No actions logged yet.</div></td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="adm-card">
        <div className="hd"><h2>Sign-in events</h2></div>
        <div className="adm-tablewrap">
          <table className="adm-table">
            <thead>
              <tr><th>When</th><th>Email</th><th>Event</th></tr>
            </thead>
            <tbody>
              {auth.map((a) => (
                <tr key={a.id}>
                  <td>{fmtDate(a.created_at)}</td>
                  <td className="em">{a.email}</td>
                  <td><span className={`badge ${a.event === "otp_failed" ? "declined" : "new"}`}>{a.event.replace(/_/g, " ")}</span></td>
                </tr>
              ))}
              {auth.length === 0 && (
                <tr><td colSpan={3}><div className="adm-empty">No sign-in events yet.</div></td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
