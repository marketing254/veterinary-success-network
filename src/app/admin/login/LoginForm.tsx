"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginForm() {
  const router = useRouter();
  const [step, setStep] = useState<"email" | "code">("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

  async function requestCode(e?: FormEvent) {
    e?.preventDefault();
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (data.ok) {
        setStep("code");
        setMsg({ kind: "ok", text: "A 6-digit code is on its way to your inbox." });
      } else {
        setMsg({ kind: "err", text: data.error || "Something went wrong." });
      }
    } catch {
      setMsg({ kind: "err", text: "Something went wrong." });
    }
    setBusy(false);
  }

  async function verify(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch("/api/admin/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, code }),
      });
      const data = await res.json();
      if (data.ok) {
        router.replace("/admin");
        return;
      }
      setMsg({ kind: "err", text: data.error || "That code isn't right." });
    } catch {
      setMsg({ kind: "err", text: "Something went wrong." });
    }
    setBusy(false);
  }

  return (
    <div className="adm-login">
      <div className="formcard">
        <div style={{ width: 52, height: 52, margin: "0 auto 14px" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/brand/vsn-appicon.png" alt="VSN" width={52} height={52} style={{ borderRadius: 12 }} />
        </div>
        <h1>VSN Admin</h1>
        <p className="sub">
          {step === "email"
            ? "Sign in with your admin email. We'll send a one-time code."
            : `Enter the 6-digit code we emailed to ${email}.`}
        </p>
        {msg && <div className={`adm-msg show ${msg.kind}`} style={{ margin: "0 0 16px" }}>{msg.text}</div>}
        {step === "email" ? (
          <form onSubmit={requestCode}>
            <div className="frow">
              <label className="flab" htmlFor="al-email">Admin email</label>
              <input
                type="email"
                id="al-email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <button className="btn solid" type="submit" disabled={busy} style={{ width: "100%", justifyContent: "center" }}>
              {busy ? "Sending…" : "Email me a code →"}
            </button>
          </form>
        ) : (
          <form onSubmit={verify}>
            <div className="frow">
              <label className="flab" htmlFor="al-code">One-time code</label>
              <input
                type="text"
                id="al-code"
                className="otp"
                required
                autoComplete="one-time-code"
                inputMode="numeric"
                pattern="\d{6}"
                maxLength={6}
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
              />
            </div>
            <button className="btn solid" type="submit" disabled={busy} style={{ width: "100%", justifyContent: "center" }}>
              {busy ? "Checking…" : "Sign in →"}
            </button>
            <p className="fnote" style={{ textAlign: "center", display: "flex", gap: 18, justifyContent: "center" }}>
              <button
                type="button"
                disabled={busy}
                onClick={() => requestCode()}
                style={{ background: "none", border: "none", color: "var(--deep)", fontWeight: 700, cursor: "pointer", font: "inherit" }}
              >
                Resend code
              </button>
              <button
                type="button"
                onClick={() => { setStep("email"); setCode(""); setMsg(null); }}
                style={{ background: "none", border: "none", color: "var(--deep)", fontWeight: 700, cursor: "pointer", font: "inherit" }}
              >
                Use a different email
              </button>
            </p>
          </form>
        )}
      </div>
    </div>
  );
}
