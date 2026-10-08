import type { Metadata } from "next";
import { Suspense } from "react";
import OtpLoginForm from "@/components/portal/OtpLoginForm";
import "@/app/portal.css";

export const metadata: Metadata = {
  title: "Expert sign in | Veterinary Success Network",
  robots: { index: false },
};

export default function ExpertLoginPage() {
  return (
    <Suspense fallback={null}>
      <OtpLoginForm
        audience="expert"
        title="Welcome back to the bench."
        subtitle="Sign in with the email you applied with. We will send a one-time code, no password needed."
        applyHref="/apply-expert"
        applyLabel="Apply to become an expert"
      />
    </Suspense>
  );
}
