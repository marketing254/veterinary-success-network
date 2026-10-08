"use client";

import { useCallback, useEffect, useState } from "react";

/** Tiny fetch helper for admin pages: { ok, data } with JSON bodies. */
export async function adminApi<T = Record<string, unknown>>(url: string, init?: RequestInit): Promise<{ ok: boolean; data: T & { error?: string } }> {
  const res = await fetch(url, { ...init, headers: { "Content-Type": "application/json", ...(init?.headers || {}) } });
  const data = (await res.json().catch(() => ({}))) as T & { error?: string };
  return { ok: res.ok && (data as { ok?: boolean }).ok !== false, data };
}

export function useAdminList<T>(url: string, deps: unknown[] = []) {
  const [rows, setRows] = useState<T[]>([]);
  const [extra, setExtra] = useState<Record<string, unknown>>({});
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const load = useCallback(async () => {
    setLoading(true);
    const r = await adminApi<{ rows: T[] }>(url);
    if (r.ok) {
      setRows(r.data.rows || []);
      const { rows: _r, ...rest } = r.data as { rows: T[] } & Record<string, unknown>;
      void _r;
      setExtra(rest);
      setErr(null);
    } else setErr(r.data.error || "Could not load.");
    setLoading(false);
  }, [url]);
  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [load, ...deps]);
  return { rows, extra, loading, err, reload: load, setRows };
}

export function useFlash() {
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);
  const flash = (kind: "ok" | "err", text: string) => {
    setMsg({ kind, text });
    if (kind === "ok") setTimeout(() => setMsg(null), 4000);
  };
  const Msg = msg ? <div className={`adm-msg show ${msg.kind}`}>{msg.text}</div> : null;
  return { msg, flash, Msg };
}

export function Head({ title, sub, children }: { title: string; sub?: string; children?: React.ReactNode }) {
  return (
    <div className="adm-head">
      <div>
        <h1>{title}</h1>
        {sub && <p>{sub}</p>}
      </div>
      {children && <div className="adm-actions">{children}</div>}
    </div>
  );
}
