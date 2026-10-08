import type { Metadata } from "next";
import { Suspense } from "react";
import OtpLoginForm from "@/components/portal/OtpLoginForm";
import "@/app/portal.css";

export const metadata: Metadata = {
  title: "Partner sign in | Veterinary Success Network",
  robots: { index: false },
};

export default function PartnerLoginPage() {
  return (
    <Suspense fallback={null}>
      <OtpLoginForm
        audience="partner"
        title="Your partner workspace."
        subtitle="Sign in with your company contact email. We will send a one-time code, no password needed."
        applyHref="/apply-partner"
        applyLabel="Apply to become a partner"
      />
    </Suspense>
  );
}
