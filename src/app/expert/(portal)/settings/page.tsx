"use client";

import { useRouter } from "next/navigation";
import { useExpert } from "@/components/expert/ExpertContext";

export default function ExpertSettingsPage() {
  const { me } = useExpert();
  const router = useRouter();
  if (!me) return null;
  const e = me.expert;
  const support = "mailto:support@veterinarysuccessnetwork.com";

  async function signOut() {
    await fetch("/api/expert/logout", { method: "POST" });
    router.replace("/expert/login");
    router.refresh();
  }

  return (
    <div className="xp-grid c2">
      <section className="xp-card">
        <h2>Sign-in</h2>
        <dl className="xp-kv">
          <dt>Email</dt><dd>{e.email}</dd>
          <dt>Method</dt><dd>6-digit code by email, no password</dd>
        </dl>
        <p className="lead" style={{ marginTop: 12 }}>Codes expire after 10 minutes. If a code does not arrive, check spam, then request a new one from the sign-in page.</p>
        <button className="xp-btn ghost" onClick={signOut}>Sign out of this device</button>
      </section>
      <div className="xp-grid" style={{ gap: 18, alignContent: "start" }}>
        <section className="xp-card">
          <h2>Email notifications</h2>
          <p className="lead">You receive an email for each new member inquiry, each kit review decision, and one reminder 7 days before your first charge. Team alerts never include other people&apos;s addresses.</p>
        </section>
        <section className="xp-card">
          <h2>Change your email or close your account</h2>
          <p className="lead">Email <a href={support} style={{ color: "var(--xp-deep)", fontWeight: 700 }}>support@veterinarysuccessnetwork.com</a> from your sign-in address. Closing your account removes your profile, listing and solo resources within 30 days, as the agreement describes.</p>
          <a className="xp-btn danger" href={`${support}?subject=${encodeURIComponent("Close my VSN expert account")}`}>Request account closure</a>
        </section>
      </div>
    </div>
  );
}
