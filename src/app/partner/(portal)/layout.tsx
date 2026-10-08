import type { Metadata } from "next";
import PartnerShell from "@/components/partner/PartnerShell";
import "@/app/partner/partner.css";

export const metadata: Metadata = {
  title: "Partner portal | Veterinary Success Network",
  robots: { index: false },
};

export const dynamic = "force-dynamic";

export default function PartnerPortalLayout({ children }: { children: React.ReactNode }) {
  return <PartnerShell>{children}</PartnerShell>;
}
