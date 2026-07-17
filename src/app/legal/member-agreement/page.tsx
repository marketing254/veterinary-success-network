import type { Metadata } from "next";
import LegalShell from "@/components/LegalShell";

export const metadata: Metadata = {
  title: "Member Agreement | Veterinary Success Network",
  robots: { index: false },
  alternates: { canonical: "/legal/member-agreement" },
};

export default function MemberAgreementPage() {
  return (
    <LegalShell title="Member Agreement" meta="Effective Date: July 14, 2026 | Last Updated: July 14, 2026">
      <p className="intro">
        This Member Agreement is entered into between the Veterinary Success Network
        (&quot;VSN&quot;, &quot;we&quot;, &quot;us&quot;), a service offered by Ekwa Marketing Inc., and you
        (&quot;Member&quot;) upon registration.
      </p>

      <h2>1. Membership Benefits</h2>
      <p>As a member you receive:</p>
      <ul>
        <li>
          Expert Hotline: call our toll-free number and leave a voicemail; you receive a reply by
          text and email within 2 to 3 business days with a recommended solution plus 3 to 4
          experts to contact. The hotline is AI-assisted (not a live human and not 24/7).
        </li>
        <li>Exclusive partner discounts negotiated with partner companies.</li>
        <li>An exclusive content library with recorded expert panels and training resources.</li>
        <li>Proven systems with templates, checklists and SOPs.</li>
        <li>Monthly live AMAs with specialists.</li>
      </ul>
      <p>Content and features may be modified at our discretion with reasonable notice.</p>

      <h2>2. Account Access and Sharing</h2>
      <p>
        Your membership is registered to you and your practice. You may share credentials with
        staff within your registered practice. Credentials may not be shared outside your practice.
        We may monitor usage patterns and contact you about inappropriate sharing.
      </p>

      <h2>3. Pricing and Auto-Renewal</h2>
      <p>Membership pricing:</p>
      <ul>
        <li>Founding members (first 100): $49/month, locked for life while continuously active.</li>
        <li>Members 101 to 500: $99/month.</li>
        <li>Standard: $199/month.</li>
        <li>Annual: $490/year (equivalent to 2 months free).</li>
      </ul>
      <p>
        Memberships auto-renew (monthly or annually, per the plan selected) unless cancelled before
        renewal. If a founding membership lapses, founding pricing is no longer available. VSN
        offers a 30-day money-back guarantee.
      </p>

      <h2>4. Hotline Usage</h2>
      <p>
        The hotline provides business guidance, not legal, financial or clinical advice. To use it,
        call our toll-free number and leave a voicemail describing your question. You receive a
        reply by text and email within 2 to 3 business days with a recommended solution plus 3 to 4
        experts to contact. The hotline is AI-assisted; it is not a live human and not available
        24/7. Hotline interactions are confidential.
      </p>

      <h2>5. Content Usage Rights</h2>
      <p>You may:</p>
      <ul>
        <li>Stream content for professional development.</li>
        <li>Download and use templates within your practice.</li>
        <li>Share insights with your team.</li>
      </ul>
      <p>You may not:</p>
      <ul>
        <li>Record or screen-capture content.</li>
        <li>Redistribute or resell content.</li>
        <li>Use content to create competing products.</li>
        <li>Upload content to other platforms.</li>
      </ul>

      <h2>6. Partner Deals and Savings</h2>
      <p>
        Partner deals are negotiated on behalf of the member network. Partner relationships and
        terms may change. VSN is not a party to transactions between members and partners.
      </p>

      <h2>7. Member Conduct</h2>
      <p>
        Use the platform professionally. Do not engage in harassment, post misleading content, use
        the platform for unrelated purposes, or attempt to circumvent security. Violations may
        result in termination without refund.
      </p>

      <h2>8. Disclaimer</h2>
      <p>
        VSN provides business education and services. Content does not constitute legal, financial,
        tax, clinical, or insurance advice. You are responsible for how you apply information.
        Results are not guaranteed.
      </p>

      <h2>9. Termination</h2>
      <p>
        We may terminate for violations of these terms, unauthorized content sharing, or payment
        failure. No refund for violation terminations. Access is restored upon payment resolution.
      </p>

      <h2>10. Changes to Services</h2>
      <p>
        VSN reserves the right to modify, update, or discontinue any aspect of its services,
        features, content, or pricing for new members at any time with reasonable notice. Your
        continued use of the platform constitutes acceptance of any changes.
      </p>

      <h2>11. Governing Law</h2>
      <p>
        This Agreement shall be governed by the laws of the Province of Ontario, Canada. Any
        dispute will be resolved through confidential binding arbitration in Ontario, Canada,
        rather than in court.
      </p>

      <h2>12. Contact Information</h2>
      <p>
        Email: <a href="mailto:members@veterinarysuccessnetwork.com">members@veterinarysuccessnetwork.com</a>
        <br />
        Veterinary Success Network, a service offered by Ekwa Marketing Inc.
      </p>
    </LegalShell>
  );
}
