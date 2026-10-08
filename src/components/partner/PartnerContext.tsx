"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import type { PartnerSelf, PartnerBilling } from "@/lib/partner/load";

export { api, initials, timeAgo, fmtDate } from "@/components/expert/ExpertContext";

export type PartnerMe = {
  partner: PartnerSelf;
  parent: { id: string; company_name: string } | null;
  covered: { id: string; company_name: string; category: string | null; logo_url: string | null; status: string; description: string | null }[];
  billing: PartnerBilling;
  checklist: { key: string; label: string; done: boolean; href: string }[];
  listable: boolean;
  counts: { catalog: number; offers: number; inquiries: number; openInquiries: number; redemptions: number; views30: number; unread: number };
  dual: boolean;
};

type Ctx = { me: PartnerMe | null; loading: boolean; error: string | null; refresh: () => Promise<void> };
const PartnerCtx = createContext<Ctx>({ me: null, loading: true, error: null, refresh: async () => {} });

export function PartnerProvider({ children }: { children: React.ReactNode }) {
  const [me, setMe] = useState<PartnerMe | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/partner/me", { cache: "no-store" });
      const data = await res.json();
      if (res.ok && data.ok) {
        setMe(data);
        setError(null);
      } else {
        setError(data.error || "Could not load your workspace.");
        if (res.status === 401) window.location.href = "/partner/login";
      }
    } catch {
      setError("Could not load your workspace.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return <PartnerCtx.Provider value={{ me, loading, error, refresh }}>{children}</PartnerCtx.Provider>;
}

export function usePartner() {
  return useContext(PartnerCtx);
}
