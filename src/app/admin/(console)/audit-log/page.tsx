"use client";

import { useEffect, useState } from "react";
import { fmtDate } from "@/components/admin/RecordsPage";

type TimelineEvent = {
  id: string;
  created_at: string;
  who: string;
  kind: "action" | "auth";
  what: string;
  target?: string;
  note?: string | null;
};

export default function AuditLogPage() {
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [filter, setFilter] = useState<"all" | "action" | "auth">("all");
  const [err, setErr] = useState(false);

  useEffect(() => {
    fetch("/api/admin/audit")
      .then((r) => r.json())
      .then((d) => {
        if (!d.ok) return setErr(true);
        const actions: TimelineEvent[] = (d.actions || []).map((a: any) => ({
          id: `a-${a.id}`,
          created_at: a.created_at,
          who: a.admin_email,
          kind: "action" as const,
          what: a.action.replace(/_/g, " "),
          target: `${a.entity_type.replace(/_/g, " ")} · ${a.entity_id}`,
          note: a.note,
        }));
        const auth: TimelineEvent[] = (d.auth || []).map((a: any) => ({
          id: `s-${a.id}`,
          created_at: a.created_at,
          who: a.email,
          kind: "auth" as const,
          what: a.event.replace(/_/g, " "),
        }));
        setEvents(
          [...actions, ...auth].sort(
            (x, y) => new Date(y.created_at).getTime() - new Date(x.created_at).getTime()
          )
        );
      })
      .catch(() => setErr(true));
  }, []);

  const visible = events.filter((e) => filter === "all" || e.kind === filter);

  return (
    <>
      <div className="adm-head">
        <div>
          <h1>Audit log</h1>
          <p>One timeline: every review action and every sign-in event, newest first.</p>
        </div>
      </div>
      {err && <div className="adm-msg show err">Couldn&apos;t load the audit log.</div>}

      <div className="adm-card">
        <div className="adm-toolbar">
          <select value={filter} onChange={(e) => setFilter(e.target.value as typeof filter)}>
            <option value="all">Everything</option>
            <option value="action">Review actions</option>
            <option value="auth">Sign-in events</option>
          </select>
          <span style={{ marginLeft: "auto", fontSize: 12.5, color: "var(--muted)" }}>
            {visible.length} event{visible.length === 1 ? "" : "s"}
          </span>
        </div>
        <div className="adm-tablewrap">
          <table className="adm-table">
            <thead>
              <tr><th>When</th><th>Who</th><th>Event</th><th>Record</th><th>Note</th></tr>
            </thead>
            <tbody>
              {visible.map((e) => (
                <tr key={e.id}>
                  <td style={{ whiteSpace: "nowrap" }}>{fmtDate(e.created_at)}</td>
                  <td className="em">{e.who}</td>
                  <td>
                    <span className={`badge ${e.kind === "auth" ? (e.what.includes("failed") ? "declined" : "invited") : "new"}`}>
                      {e.what}
                    </span>
                  </td>
                  <td>{e.target || "—"}</td>
                  <td>{e.note || "—"}</td>
                </tr>
              ))}
              {visible.length === 0 && (
                <tr><td colSpan={5}><div className="adm-empty">No events logged yet.</div></td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
