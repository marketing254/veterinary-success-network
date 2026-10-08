import type { Metadata } from "next";
import ExpertShell from "@/components/expert/ExpertShell";
import "@/app/expert/expert.css";

export const metadata: Metadata = {
  title: "Expert portal | Veterinary Success Network",
  robots: { index: false },
};

export const dynamic = "force-dynamic";

export default function ExpertPortalLayout({ children }: { children: React.ReactNode }) {
  return <ExpertShell>{children}</ExpertShell>;
}
