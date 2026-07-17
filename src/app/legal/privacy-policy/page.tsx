import type { Metadata } from "next";
import LegalShell from "@/components/LegalShell";

export const metadata: Metadata = {
  title: "Privacy Policy | Veterinary Success Network",
  robots: { index: false },
  alternates: { canonical: "/legal/privacy-policy" },
};

export default function PrivacyPolicyPage() {
  return (
    <LegalShell title="Privacy Policy" meta="Last Updated: July 14, 2026">
      <p className="intro">
        This policy explains how the Veterinary Success Network (&quot;VSN&quot;), a service offered by
        Ekwa Marketing Inc., handles your information.
      </p>
      <p>
        VSN is a business training and education platform for practice owners. We do not ask for,
        or store, patient or client medical records.
      </p>

      <h2>1. Information we collect</h2>
      <ul>
        <li>
          Details you provide: name, practice name, email, phone, role, and (for experts and
          partners) your company, category and member offer.
        </li>
        <li>The content of the questions you leave on the Expert Hotline.</li>
        <li>Usage data: pages viewed, resources downloaded, and basic device and analytics data.</li>
        <li>
          Payment details are collected and processed by our payment processor (Stripe); we do not
          store full card numbers.
        </li>
      </ul>

      <h2>2. How we use it</h2>
      <ul>
        <li>
          To provide the membership: route hotline questions to suitable experts, deliver
          resources, and manage your account.
        </li>
        <li>To operate billing and send service messages and network updates.</li>
        <li>To improve our content and services.</li>
      </ul>

      <h2>3. How we share it</h2>
      <ul>
        <li>
          When we match you to experts through the hotline, we share the relevant details of your
          question with those experts so they can help you.
        </li>
        <li>
          With service providers who help us run the platform (for example payment processing,
          email, and hosting), under confidentiality.
        </li>
        <li>We do not sell your personal information.</li>
      </ul>

      <h2>4. Your choices</h2>
      <p>
        You can access, correct, or request deletion of your information, and unsubscribe from
        marketing emails at any time, by emailing us. Service and billing messages continue while
        your account is active.
      </p>

      <h2>5. Data retention and security</h2>
      <p>
        We keep your information for as long as your account is active and as needed to meet legal
        and accounting obligations, then delete or anonymize it. We use reasonable safeguards to
        protect it; no method of transmission or storage is completely secure.
      </p>

      <h2>6. Governing law and contact</h2>
      <p>
        This policy is governed by the laws of the Province of Ontario, Canada. Questions or
        requests:{" "}
        <a href="mailto:members@veterinarysuccessnetwork.com">members@veterinarysuccessnetwork.com</a>.
      </p>
    </LegalShell>
  );
}
