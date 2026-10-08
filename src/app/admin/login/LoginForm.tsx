"use client";

import { FormEvent, useEffect, useState } from "react";
import OtpBoxes from "@/components/auth/OtpBoxes";
import { useRouter } from "next/navigation";
import "./login.css";

const MailIcon = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="3" y="5" width="18" height="14" rx="3" /><path d="M3 8l9 6 9-6" /></svg>;
const LockIcon = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="4" y="10" width="16" height="11" rx="2" /><path d="M8 10V7a4 4 0 018 0v3" /></svg>;

export default function LoginForm() {
  const router = useRouter();
  const [step, setStep] = useState<"email" | "code">("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

  async function requestCode(e?: FormEvent) {
    e?.preventDefault();
    setBusy(true); setMsg(null);
    try {
      const res = await fetch("/api/admin/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email }) });
      const data = await res.json();
      if (data.ok) { setStep("code"); setCode(""); setMsg({ kind: "ok", text: "Code sent. It expires in 10 minutes; check spam if it does not arrive." }); }
      else setMsg({ kind: "err", text: data.error || "Something went wrong." });
    } catch { setMsg({ kind: "err", text: "Something went wrong." }); }
    setBusy(false);
  }

  async function verify(e?: FormEvent) {
    e?.preventDefault();
    if (code.length !== 6) return;
    setBusy(true); setMsg(null);
    try {
      const res = await fetch("/api/admin/verify-otp", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, code }) });
      const data = await res.json();
      if (data.ok) { router.replace("/admin"); return; }
      setMsg({ kind: "err", text: data.error || "That code isn't right." });
    } catch { setMsg({ kind: "err", text: "Something went wrong." }); }
    setBusy(false);
  }

  useEffect(() => { if (step === "code" && code.length === 6 && !busy) verify(); // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code]);

  return (
    <div className="alx">
      <aside className="alx-brand">
        <div className="alx-logo">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/brand/vsn-monogram-dark.png" alt="VSN" />
          <span><strong>Veterinary Success Network</strong><small>Admin console</small></span>
        </div>
        <div className="alx-copy">
          <div className="eyebrow"><i />Network console</div>
          <h1>Run the network from one place.</h1>
          <p>Review applications, approve experts and partners, send founding invites, and keep the waitlist warm until launch.</p>
          <div className="alx-list">
            <div><span className="ic">1</span>Approvals create portal accounts and send the right email automatically.</div>
            <div><span className="ic">2</span>Every action lands in the audit log with who, what and when.</div>
            <div><span className="ic">3</span>Founding invites and launch emails only go out when you click Send.</div>
          </div>
        </div>
        <div className="alx-foot">Veterinary Success Network · a service offered by Ekwa Marketing Inc. · Powered by Veterinary Business Institute</div>
      </aside>

      <main className="alx-side">
        <div className="alx-card">
          <div className="hd">
            <span className="tag">{step === "email" ? "Admin sign in" : "Check your inbox"}</span>
            <h2>{step === "email" ? "Welcome back." : "Enter your code."}</h2>
            <p className="sub">{step === "email" ? "Use your admin email. We send a one-time code, no password to remember." : <>We emailed a 6-digit code to <b>{email}</b>.</>}</p>
          </div>
          {msg && <div className={`alx-msg ${msg.kind}`}>{msg.text}</div>}
          {step === "email" ? (
            <form onSubmit={requestCode}>
              <div className="alx-field">
                <label htmlFor="al-email">Admin email</label>
                <div className="alx-input"><MailIcon /><input id="al-email" type="email" required autoComplete="email" autoFocus value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@veterinarysuccessnetwork.com" /></div>
              </div>
              <button className="alx-btn" type="submit" disabled={busy}>{busy ? "Sending…" : "Email me a code"}</button>
            </form>
          ) : (
            <form onSubmit={verify}>
              <div className="alx-field">
                <label>One-time code</label>
                <OtpBoxes value={code} onChange={setCode} disabled={busy} className="alx-otp" />
              </div>
              <button className="alx-btn" type="submit" disabled={busy || code.length !== 6}>{busy ? "Checking…" : "Sign in"}</button>
              <div className="alx-links">
                <button type="button" disabled={busy} onClick={() => requestCode()}>Resend code</button>
                <button type="button" onClick={() => { setStep("email"); setCode(""); setMsg(null); }}>Use a different email</button>
              </div>
            </form>
          )}
          <div className="alx-secure"><LockIcon /> Codes expire in 10 minutes and work once. Admin access is allow-listed.</div>
        </div>
      </main>
    </div>
  );
}
