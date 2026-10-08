"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import OtpBoxes from "@/components/auth/OtpBoxes";

type Props = {
  audience: "expert" | "partner";
  title: string;
  subtitle: string;
  applyHref: string;
  applyLabel: string;
};

const SIDE = {
  expert: {
    eyebrow: "Expert portal",
    headline: "Your bench, your terms.",
    body: "One recording becomes a full kit in your branding. Members find you by fit and book straight onto your calendar.",
    points: ["Done-for-you resource kits", "Inquiries routed by fit, never pay-to-play", "6 free founding months, then $39 a month"],
    stat: ["20", "founding expert seats"],
  },
  partner: {
    eyebrow: "Partner portal",
    headline: "A buying audience, on a trusted shortlist.",
    body: "Your listing, offers and leads in one workspace, with the Verified Partner badge members look for.",
    points: ["Verified Partner badge on your listing", "Member-only offers with redemption tracking", "6 free founding months, then $39 a month"],
    stat: ["1", "business day reply keeps your fit score high"],
  },
};

/**
 * Expert and partner sign-in: a two-panel floating card. Left: the form with a
 * two-step indicator and a six-box code input. Right: an audience-tinted panel.
 * POST /api/<audience>/login {email} → POST /api/<audience>/verify-otp {email, code, next}.
 */
export default function OtpLoginForm({ audience, title, subtitle, applyHref, applyLabel }: Props) {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next") || `/${audience}`;
  const [step, setStep] = useState<"email" | "code">("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);
  const side = SIDE[audience];

  async function requestCode(e?: FormEvent) {
    e?.preventDefault();
    setBusy(true); setMsg(null);
    try {
      const res = await fetch(`/api/${audience}/login`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email }) });
      const data = await res.json();
      if (data.ok) { setStep("code"); setCode(""); setMsg({ kind: "ok", text: "Code sent. It expires in 10 minutes; check spam if it does not arrive." }); }
      else setMsg({ kind: "err", text: data.error || "Something went wrong." });
    } catch { setMsg({ kind: "err", text: "Something went wrong. Please try again." }); }
    setBusy(false);
  }

  async function verify(e?: FormEvent) {
    e?.preventDefault();
    if (code.length !== 6) return;
    setBusy(true); setMsg(null);
    try {
      const res = await fetch(`/api/${audience}/verify-otp`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, code, next }) });
      const data = await res.json();
      if (data.ok) { router.replace(data.next || `/${audience}`); router.refresh(); return; }
      setMsg({ kind: "err", text: data.error || "That code isn't right." });
    } catch { setMsg({ kind: "err", text: "Something went wrong. Please try again." }); }
    setBusy(false);
  }

  useEffect(() => { if (step === "code" && code.length === 6 && !busy) verify(); // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code]);

  return (
    <div className={`pl pl-${audience}`}>
      <Link href="/" className="pl-brand" aria-label="Veterinary Success Network home">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/brand/vsn-monogram-dark.png" alt="VSN" />
        <span><strong>Veterinary Success Network</strong><small>Powered by Veterinary Business Institute</small></span>
      </Link>

      <div className="pl-card">
        <section className="pl-form">
          <div className="pl-steps" aria-hidden="true">
            <span className={step === "email" ? "on" : "done"}>1</span><i /><span className={step === "code" ? "on" : undefined}>2</span>
            <em>{step === "email" ? "Your email" : "Your code"}</em>
          </div>
          <h1>{step === "email" ? title : "Check your inbox."}</h1>
          <p className="pl-sub">{step === "email" ? subtitle : <>We emailed a 6-digit code to <b>{email}</b>.</>}</p>
          {msg && <div className={`pl-msg ${msg.kind}`}>{msg.text}</div>}
          {step === "email" ? (
            <form onSubmit={requestCode}>
              <label className="pl-label" htmlFor="pl-email">Email address</label>
              <div className="pl-input">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="3" y="5" width="18" height="14" rx="3" /><path d="M3 8l9 6 9-6" /></svg>
                <input id="pl-email" type="email" required autoComplete="email" autoFocus value={email} onChange={(e) => setEmail(e.target.value)} placeholder={audience === "expert" ? "you@yourpractice.com" : "you@yourcompany.com"} />
              </div>
              <button className="pl-btn" type="submit" disabled={busy}>{busy ? "Sending…" : "Email me a sign-in code"}<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M5 12h14M13 6l6 6-6 6" /></svg></button>
            </form>
          ) : (
            <form onSubmit={verify}>
              <label className="pl-label">One-time code</label>
              <OtpBoxes value={code} onChange={setCode} disabled={busy} className="pl-otp" />
              <button className="pl-btn" type="submit" disabled={busy || code.length !== 6}>{busy ? "Checking…" : "Sign in"}</button>
              <div className="pl-links">
                <button type="button" disabled={busy} onClick={() => requestCode()}>Resend code</button>
                <button type="button" onClick={() => { setStep("email"); setCode(""); setMsg(null); }}>Use a different email</button>
              </div>
            </form>
          )}
          <p className="pl-foot">Not yet on the network? <Link href={applyHref}>{applyLabel}</Link></p>
        </section>

        <aside className="pl-side">
          <span className="pl-eyebrow">{side.eyebrow}</span>
          <h2>{side.headline}</h2>
          <p>{side.body}</p>
          <ul>{side.points.map((p) => <li key={p}><i>✓</i>{p}</li>)}</ul>
          <div className="pl-stat"><b>{side.stat[0]}</b><span>{side.stat[1]}</span></div>
        </aside>
      </div>

      <p className="pl-credit">Codes expire in 10 minutes and work once · <Link href="/legal/privacy-policy">Privacy</Link></p>
    </div>
  );
}
