import type { Metadata } from "next";
import AdminShell from "@/components/admin/AdminShell";
import "@/app/admin/admin.css";

export const metadata: Metadata = {
  title: "Admin | Veterinary Success Network",
  robots: { index: false },
};

export default function ConsoleLayout({ children }: { children: React.ReactNode }) {
  return <AdminShell>{children}</AdminShell>;
}
