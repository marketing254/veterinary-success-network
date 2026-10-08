import type { Metadata } from "next";
import FoundingAccept from "@/components/founding/FoundingAccept";
import "@/app/portal.css";

export const metadata: Metadata = {
  title: "Your founding agreement | Veterinary Success Network",
  robots: { index: false, follow: false },
};
export const dynamic = "force-dynamic";

export default function FoundingPage({ params }: { params: { code: string } }) {
  return <FoundingAccept code={params.code} />;
}
