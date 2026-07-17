"use client";

import { useCallback, useEffect, useState } from "react";

export type Row = Record<string, any>;

export type Col = { key: string; label: string; render?: (row: Row) => React.ReactNode };
export type ActionResult = { ok: boolean; error?: string; row?: Row };
export type RowAction = {
  action: string;
  label: string;
  variant?: "primary" | "danger" | "default";
  when: (status: string) => boolean;
  withNote?: boolean;
  /** Short label rendered as a quick button directly on the row (approval discoverability). */
  quickLabel?: string;
  /** Custom handler (e.g. POST to another endpoint). Defaults to PATCH {id, action, note} on the page endpoint. */
  run?: (row: Row, note: string) => Promise<ActionResult>;
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
  /** Extra content rendered above the table card (e.g. a manual-add form). */
  header?: React.ReactNode;
  /** Bumped by the parent to force a reload (e.g. after a header form submits). */
  reloadKey?: number;
};

export default function RecordsPage({
  title,
  subtitle,
  endpoint,
  statusOptions,
  columns,
  detail,
  actions,
  searchPlaceholder,
  header,
  reloadKey,
}: Props) {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState("all");
  const [q, setQ] = useState("");
  const [open, setOpen] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(
    async (s: string, query: string) => {
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
    },
    [endpoint]
  );

  useEffect(() => {
    load(status, q);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, reloadKey]);

  async function act(row: Row, action: RowAction) {
    setBusy(true);
    setMsg(null);
    try {
      let result: ActionResult;
      if (action.run) {
        result = await action.run(row, note);
      } else {
        const res = await fetch(endpoint, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: row.id, action: action.action, note }),
        });
        result = await res.json();
      }
      if (result.ok) {
        if (result.row) {
          setRows((rs) => rs.map((r) => (r.id === row.id ? result.row! : r)));
        } else {
          await load(status, q);
        }
        setNote("");
        setMsg({ kind: "ok", text: `Done: ${action.label}.` });
      } else {
        setMsg({ kind: "err", text: result.error || "Action failed." });
      }
    } catch {
      setMsg({ kind: "err", text: "Action failed." });
    }
    setBusy(false);
  }

  const exportParams = new URLSearchParams({ format: "csv" });
  if (status !== "all") exportParams.set("status", status);
  if (q) exportParams.set("q", q);

  const hasQuick = actions.some((a) => a.quickLabel);

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
      {header}
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
                {hasQuick && <th></th>}
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && !loading && (
                <tr>
                  <td colSpan={columns.length + (hasQuick ? 1 : 0)}>
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
                  hasQuick={hasQuick}
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
  hasQuick,
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
  hasQuick: boolean;
  open: boolean;
  onToggle: () => void;
  note: string;
  setNote: (v: string) => void;
  busy: boolean;
  act: (row: Row, action: RowAction) => void;
}) {
  const available = actions.filter((a) => a.when(row.status));
  const quick = available.filter((a) => a.quickLabel);
  const anyNote = available.some((a) => a.withNote);
  const span = columns.length + (hasQuick ? 1 : 0);
  return (
    <>
      <tr onClick={onToggle}>
        {columns.map((c) => (
          <td key={c.key}>{c.render ? c.render(row) : row[c.key]}</td>
        ))}
        {hasQuick && (
          <td onClick={(e) => e.stopPropagation()} style={{ whiteSpace: "nowrap", textAlign: "right" }}>
            {quick.map((a) => (
              <button
                key={a.action}
                className={`adm-btn sm${a.variant === "primary" ? " primary" : a.variant === "danger" ? " danger" : ""}`}
                disabled={busy}
                title={a.label}
                onClick={() => act(row, a)}
              >
                {a.quickLabel}
              </button>
            ))}
          </td>
        )}
      </tr>
      {open && (
        <tr className="adm-detail">
          <td colSpan={span}>
            <div className="grid">
              {detail.map((d) => (
                <div className="kv" key={d.key}>
                  <b>{d.label}</b>
                  <span>
                    {d.isDate
                      ? fmtDate(row[d.key])
                      : typeof row[d.key] === "boolean"
                      ? row[d.key]
                        ? "Yes"
                        : "No"
                      : row[d.key] || "—"}
                  </span>
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
                  onClick={() => act(row, a)}
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
