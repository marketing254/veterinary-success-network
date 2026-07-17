import type { Metadata } from "next";
import LegalShell from "@/components/LegalShell";

export const metadata: Metadata = {
  title: "Partner Agreement | Veterinary Success Network",
  robots: { index: false },
  alternates: { canonical: "/legal/partner-agreement" },
};

export default function PartnerAgreementPage() {
  return (
    <LegalShell title="Partner Agreement" meta="Version 1 | Last Updated: July 14, 2026">
      <p className="intro">
        Between the Veterinary Success Network (&quot;VSN&quot;, &quot;we&quot;, &quot;us&quot;), a service
        offered by Ekwa Marketing Inc., and your company (&quot;you&quot;), upon registration as a
        partner. If anything here is unclear, ask us before you accept.
      </p>

      <h2>1. What you&apos;re joining</h2>
      <p>
        The Veterinary Success Network is a membership for veterinary practices. As a partner, your
        company is featured to our members. This agreement covers how that works, what it costs,
        and how either of us can end it.
      </p>

      <h2>2. Term and cancellation</h2>
      <ul>
        <li>Month-to-month, with no long-term contract.</li>
        <li>You can cancel anytime with 30 days&apos; written notice. So can we.</li>
        <li>We can end it immediately if you break these terms.</li>
        <li>If you cancel and re-join later, any founding rate you had no longer applies.</li>
      </ul>

      <h2>3. What it costs</h2>
      <p>Billed monthly through Stripe, on this ramp:</p>
      <ul>
        <li>Months 1 to 6: $0</li>
        <li>Months 7 to 12: $49/month</li>
        <li>Month 13 onward: $199/month (Featured Partner)</li>
        <li>Annual pre-pay = 2 months free.</li>
      </ul>
      <p>You&apos;ll see this pricing on the sign-up page before you pay. Nothing is a surprise.</p>

      <h2>4. What you get (Partner)</h2>
      <ul>
        <li>Your company is listed in the partner directory, in your category.</li>
        <li>
          Founding partners get priority directory placement and first-mover advantage. We do not
          offer category exclusivity; multiple companies may be listed in any category.
        </li>
        <li>
          Member inquiries are routed to you with a dashboard, but we do not guarantee a number of
          leads.
        </li>
      </ul>

      <h2>5. What you offer members</h2>
      <ul>
        <li>
          You give our members an offer they can only get through VSN (you decide what it is; it
          must be exclusive to members and better than your standard pricing).
        </li>
        <li>
          You keep a booking link or contact live and respond to members within one business day.
        </li>
        <li>Any change to your member offer comes with 30 days&apos; notice.</li>
        <li>Refer a member: once they make their first payment to us, you earn $50.</li>
      </ul>

      <h2>6. Conduct and honesty</h2>
      <ul>
        <li>Be truthful in what you claim and what you offer members.</li>
        <li>Use the Veterinary Business Institute and VSN brands only as we agree.</li>
      </ul>

      <h2>7. The basics</h2>
      <ul>
        <li>You&apos;re an independent company, not our employee or agent.</li>
        <li>
          VSN connects members with partners; we&apos;re not responsible for the products or
          services you sell, and you&apos;ll cover us for claims arising from your offerings.
        </li>
        <li>
          Keep member information confidential and don&apos;t misuse it. VSN is not a party to
          transactions between members and partners.
        </li>
      </ul>

      <h2>8. The fine print, kept short</h2>
      <ul>
        <li>All prices are in US dollars; applicable taxes are added on top.</li>
        <li>
          If a payment fails, we&apos;ll retry and pause your listing until it&apos;s resolved. No
          pro-rated refunds for partial months.
        </li>
        <li>
          We don&apos;t guarantee results, leads, or revenue, and the platform is provided as-is.
          We are not responsible for losses you may incur from this partnership. Our total
          liability to you is capped at the fees you&apos;ve paid us in the previous 12 months, and
          neither of us is liable to the other for indirect or consequential losses.
        </li>
        <li>
          We can update these terms at any time. Written notice means email, using the addresses on
          this agreement.
        </li>
        <li>
          This agreement is governed by the laws of the Province of Ontario, Canada. Any dispute
          will be resolved through confidential binding arbitration in Ontario rather than in
          court.
        </li>
        <li>This is our entire agreement. If one part can&apos;t be enforced, the rest still applies.</li>
      </ul>

      <h2>9. Accepting this agreement</h2>
      <p>
        No signature needed; this works like any online subscription. You accept by ticking &quot;I
        agree&quot; at sign-up and entering your payment details. Your acceptance is recorded
        electronically (who accepted, which version, and when), and a copy of this agreement is
        emailed to you. The details you provide at sign-up (your company, category, and member
        offer) form part of this agreement.
      </p>
    </LegalShell>
  );
}
