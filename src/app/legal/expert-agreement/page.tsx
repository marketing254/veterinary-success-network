import type { Metadata } from "next";
import LegalShell from "@/components/LegalShell";

export const metadata: Metadata = {
  title: "Expert Agreement | Veterinary Success Network",
  robots: { index: false },
  alternates: { canonical: "/legal/expert-agreement" },
};

export default function ExpertAgreementPage() {
  return (
    <LegalShell title="Expert Agreement" meta="Version 1 | Last Updated: July 14, 2026">
      <p className="intro">
        Between the Veterinary Success Network (&quot;VSN&quot;, &quot;we&quot;, &quot;us&quot;), a service
        offered by Ekwa Marketing Inc., and you (&quot;you&quot;), upon registration as an expert. If
        anything here is unclear, ask us before you accept.
      </p>

      <h2>1. What you&apos;re joining</h2>
      <p>
        The Veterinary Success Network is a membership for veterinary practices. As an expert, your
        knowledge is featured to our members. This agreement covers how that works, what it costs,
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
        <li>Month 13 onward: $199/month (standard)</li>
        <li>Annual pre-pay = 2 months free.</li>
      </ul>
      <p>You&apos;ll see this pricing on the sign-up page before you pay. Nothing is a surprise.</p>

      <h2>4. Using your content and name</h2>
      <ul>
        <li>You keep ownership of everything you create and share.</li>
        <li>
          You give us permission, while this agreement is active, to repurpose it into member
          resources (guides, videos, posts) and to use your name, photo, and company to do that and
          to market the network.
        </li>
        <li>
          If you leave, we take down your profile, your listing, and any resources that feature
          only you, within 30 days. Content where you appear alongside others (panels, group
          sessions, podcasts) remains in the network. Copies members already downloaded cannot be
          recalled.
        </li>
      </ul>

      <h2>5. What you get (Expert)</h2>
      <ul>
        <li>
          We build you a done-for-you resource library from your content, plus a featured profile
          in the member portal.
        </li>
        <li>
          Members find you by category and contact you through your profile. We route member
          questions to you, but do not guarantee a number of leads.
        </li>
        <li>
          You can list your own paid courses to members and keep 70% (we keep 30% to run the
          platform, payments, and promotion).
        </li>
        <li>
          We do not offer category exclusivity for our experts; members choose who they want to
          work with.
        </li>
      </ul>

      <h2>6. Conduct and honesty</h2>
      <ul>
        <li>Be truthful in what you claim and what you offer members.</li>
        <li>
          You may promote your own services to members who reach out to you. Our &quot;no
          upsells&quot; promise is about VSN never pushing members, not about limiting you.
        </li>
        <li>Use the Veterinary Business Institute and VSN brands only as we agree.</li>
      </ul>

      <h2>7. The basics</h2>
      <ul>
        <li>You&apos;re an independent expert, not our employee or agent.</li>
        <li>
          VSN connects members with experts; we&apos;re not responsible for the advice you give,
          and you&apos;ll cover us for claims arising from your content.
        </li>
        <li>Keep member information confidential and don&apos;t misuse it.</li>
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
          In the resources we build from your content, the substance stays yours; our branding,
          design, and templates stay ours.
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
        emailed to you. The details you provide at sign-up (your name, company, role) form part of
        this agreement.
      </p>
    </LegalShell>
  );
}
