import type { Metadata } from "next";
import LegalShell from "@/components/LegalShell";

export const metadata: Metadata = {
  title: "Cancellation & Refund Policy | Veterinary Success Network",
  robots: { index: false },
  alternates: { canonical: "/legal/cancellation-policy" },
};

export default function CancellationPolicyPage() {
  return (
    <LegalShell title="Cancellation & Refund Policy" meta="Last Updated: July 14, 2026">
      <p className="intro">
        This policy applies to memberships and to expert and partner listings on the Veterinary
        Success Network, a service offered by Ekwa Marketing Inc.
      </p>

      <h2>1. Cancel anytime</h2>
      <p>
        Memberships are month-to-month (or annual, per the plan selected) with no long-term
        contract. You can cancel anytime from your account or by emailing us. Expert and partner
        listings can be cancelled anytime with 30 days&apos; written notice.
      </p>

      <h2>2. Money-back guarantee</h2>
      <p>
        New members are covered by our 30-day money-back guarantee. If VSN is not right for you,
        contact us within 30 days of your first payment and we will refund that payment.
      </p>

      <h2>3. How billing works on cancellation</h2>
      <ul>
        <li>
          Monthly plans: cancelling stops the next renewal. You keep access through the end of the
          paid period.
        </li>
        <li>
          Annual plans: cancelling stops the next annual renewal; the current paid year is not
          pro-rated except where required by law or under the money-back guarantee.
        </li>
        <li>
          Founding pricing: if a founding membership lapses or is cancelled, founding pricing no
          longer applies if you re-join later.
        </li>
      </ul>

      <h2>4. Failed payments</h2>
      <p>
        If a payment fails, we retry and may pause access or a listing until the balance is
        resolved. Access is restored on payment. There are no pro-rated refunds for partial months.
      </p>

      <h2>5. Terminations for cause</h2>
      <p>
        Memberships or listings terminated for breach of the applicable agreement are not refunded.
      </p>

      <h2>6. Contact</h2>
      <p>
        Email: <a href="mailto:members@veterinarysuccessnetwork.com">members@veterinarysuccessnetwork.com</a>
      </p>
    </LegalShell>
  );
}
