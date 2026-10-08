"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import type { ExpertSelf, BillingSummary } from "@/lib/expert/load";

export type ExpertMe = {
  expert: ExpertSelf;
  billing: BillingSummary;
  checklist: { key: string; label: string; done: boolean; href: string }[];
  listable: boolean;
  counts: { kits: number; posts: number; inquiries: number; openInquiries: number; unread: number };
  dual: boolean;
  onboardingCallUrl: string | null;
};

type Ctx = { me: ExpertMe | null; loading: boolean; error: string | null; refresh: () => Promise<void> };

const ExpertCtx = createContext<Ctx>({ me: null, loading: true, error: null, refresh: async () => {} });

export function ExpertProvider({ children }: { children: React.ReactNode }) {
  const [me, setMe] = useState<ExpertMe | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/expert/me", { cache: "no-store" });
      const data = await res.json();
      if (res.ok && data.ok) {
        setMe(data);
        setError(null);
      } else {
        setError(data.error || "Could not load your portal.");
        if (res.status === 401) window.location.href = "/expert/login";
      }
    } catch {
      setError("Could not load your portal.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return <ExpertCtx.Provider value={{ me, loading, error, refresh }}>{children}</ExpertCtx.Provider>;
}

export function useExpert() {
  return useContext(ExpertCtx);
}

export async function api<T = Record<string, unknown>>(url: string, init?: RequestInit): Promise<{ ok: boolean; status: number; data: T & { error?: string } }> {
  const res = await fetch(url, { ...init, headers: init?.body instanceof FormData ? init?.headers : { "Content-Type": "application/json", ...(init?.headers || {}) } });
  const data = (await res.json().catch(() => ({}))) as T & { error?: string };
  return { ok: res.ok && (data as { ok?: boolean }).ok !== false, status: res.status, data };
}

export function initials(name: string | null | undefined): string {
  return (name || "?")
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() || "")
    .join("");
}

export function timeAgo(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso).getTime();
  const diff = Math.max(0, Date.now() - d);
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const days = Math.floor(h / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function fmtDate(iso: string | null | undefined): string {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
}
