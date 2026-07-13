"use client";

import { useCallback, useEffect, useState } from "react";

export type Row = Record<string, any>;

export type Col = { key: string; label: string; render?: (row: Row) => React.ReactNode };
export type RowAction = {
  action: string;
  label: string;
  variant?: "primary" | "danger" | "default";
  when: (status: string) => boolean;
  withNote?: boolean;
};

export function fmtDate(v?: string): string {
  if (!v) return "";
  const d = new Date(v);
  return d.toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" });
}

export function StatusBadge({ status }: { status?: string }) {
  if (!status) return null;
  return <span className={`badge ${status}`}>{status.replace(/_/g, " ")}</span>;
}

type Props = {
  title: string;
  subtitle?: string;
  endpoint: string;
  statusOptions: string[];
  columns: Col[];
  detail: { key: string; label: string; isDate?: boolean }[];
  actions: RowAction[];
  searchPlaceholder?: string;
};

export default function RecordsPage({ title, subtitle, endpoint, statusOptions, columns, detail, actions, searchPlaceholder }: Props) {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState("all");
  const [q, setQ] = useState("");
  const [open, setOpen] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async (s: string, query: string) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (s !== "all") params.set("status", s);
      if (query) params.set("q", query);
      const res = await fetch(`${endpoint}?${params}`);
      const data = await res.json();
      setRows(data.rows || []);
    } catch {
      setMsg({ kind: "err", text: "Couldn't load records." });
    }
    setLoading(false);
  }, [endpoint]);

  useEffect(() => {
    load(status, q);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  async function act(row: Row, action: string) {
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch(endpoint, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: row.id, action, note }),
      });
      const data = await res.json();
      if (data.ok) {
        setRows((rs) => rs.map((r) => (r.id === row.id ? data.row : r)));
        setNote("");
        setMsg({ kind: "ok", text: `Done: ${action.replace(/_/g, " ")}.` });
      } else {
        setMsg({ kind: "err", text: data.error || "Action failed." });
      }
    } catch {
      setMsg({ kind: "err", text: "Action failed." });
    }
    setBusy(false);
  }

  const exportParams = new URLSearchParams({ format: "csv" });
  if (status !== "all") exportParams.set("status", status);
  if (q) exportParams.set("q", q);

  return (
    <>
      <div className="adm-head">
        <div>
          <h1>{title}</h1>
          {subtitle && <p>{subtitle}</p>}
        </div>
        <div className="adm-actions">
          <a className="adm-btn" href={`${endpoint}?${exportParams}`}>Export CSV</a>
        </div>
      </div>
      {msg && <div className={`adm-msg show ${msg.kind}`}>{msg.text}</div>}
      <div className="adm-card">
        <div className="adm-toolbar">
          <input
            type="text"
            placeholder={searchPlaceholder || "Search…"}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && load(status, q)}
          />
          <button className="adm-btn" onClick={() => load(status, q)}>Search</button>
          <select value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="all">All statuses</option>
            {statusOptions.map((s) => (
              <option key={s} value={s}>{s.replace(/_/g, " ")}</option>
            ))}
          </select>
          <span style={{ marginLeft: "auto", fontSize: 12.5, color: "var(--muted)" }}>
            {loading ? "Loading…" : `${rows.length} record${rows.length === 1 ? "" : "s"}`}
          </span>
        </div>
        <div className="adm-tablewrap">
          <table className="adm-table">
            <thead>
              <tr>
                {columns.map((c) => (
                  <th key={c.key}>{c.label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && !loading && (
                <tr>
                  <td colSpan={columns.length}>
                    <div className="adm-empty">Nothing here yet.</div>
                  </td>
                </tr>
              )}
              {rows.map((row) => (
                <RowPair
                  key={row.id}
                  row={row}
                  columns={columns}
                  detail={detail}
                  actions={actions}
                  open={open === row.id}
                  onToggle={() => {
                    setOpen(open === row.id ? null : row.id);
                    setNote("");
                  }}
                  note={note}
                  setNote={setNote}
                  busy={busy}
                  act={act}
                />
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}

function RowPair({
  row,
  columns,
  detail,
  actions,
  open,
  onToggle,
  note,
  setNote,
  busy,
  act,
}: {
  row: Row;
  columns: Col[];
  detail: Props["detail"];
  actions: RowAction[];
  open: boolean;
  onToggle: () => void;
  note: string;
  setNote: (v: string) => void;
  busy: boolean;
  act: (row: Row, action: string) => void;
}) {
  const available = actions.filter((a) => a.when(row.status));
  const anyNote = available.some((a) => a.withNote);
  return (
    <>
      <tr onClick={onToggle}>
        {columns.map((c) => (
          <td key={c.key}>{c.render ? c.render(row) : row[c.key]}</td>
        ))}
      </tr>
      {open && (
        <tr className="adm-detail">
          <td colSpan={columns.length}>
            <div className="grid">
              {detail.map((d) => (
                <div className="kv" key={d.key}>
                  <b>{d.label}</b>
                  <span>{d.isDate ? fmtDate(row[d.key]) : row[d.key] || "—"}</span>
                </div>
              ))}
            </div>
            {anyNote && (
              <div className="note">
                <input
                  type="text"
                  placeholder="Optional note (kept in the audit log)"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                />
              </div>
            )}
            <div className="row-actions">
              {available.map((a) => (
                <button
                  key={a.action}
                  className={`adm-btn${a.variant === "primary" ? " primary" : a.variant === "danger" ? " danger" : ""}`}
                  disabled={busy}
                  onClick={() => act(row, a.action)}
                >
                  {a.label}
                </button>
              ))}
              {available.length === 0 && (
                <span style={{ fontSize: 12.5, color: "var(--muted)" }}>No actions for this status.</span>
              )}
            </div>
          </td>
        </tr>
      )}
    </>
  );
}
