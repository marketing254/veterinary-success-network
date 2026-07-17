"use client";

import { useState } from "react";

export type FormStatus = "idle" | "sending" | "success" | "error";

export function useVsnSubmit(endpoint: string) {
  const [status, setStatus] = useState<FormStatus>("idle");
  const [serverMessage, setServerMessage] = useState<string>("");

  async function submit(payload: Record<string, unknown>) {
    setStatus("sending");
    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.ok) {
        setServerMessage(data.message || "");
        setStatus("success");
      } else {
        setServerMessage(data.error || "");
        setStatus("error");
      }
    } catch {
      setServerMessage("");
      setStatus("error");
    }
  }

  return { status, serverMessage, submit };
}

export function mailtoFallback(formName: string, fields: Record<string, string>): string {
  const lines = Object.entries(fields)
    .filter(([, v]) => v)
    .map(([k, v]) => `${k}: ${v}`);
  return `mailto:hello@veterinarysuccessnetwork.com?subject=${encodeURIComponent(
    `[VSN] ${formName}`
  )}&body=${encodeURIComponent(lines.join("\n"))}`;
}

export function SuccessPanel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="fsuccess show">
      <div className="tkbig">
        <svg viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3">
          <path d="M20 6L9 17l-5-5" />
        </svg>
      </div>
      <h3>{title}</h3>
      <p>{children}</p>
    </div>
  );
}

export function ErrorPanel({
  message,
  mailto,
  mailtoLabel,
}: {
  message?: string;
  mailto: string;
  mailtoLabel: string;
}) {
  return (
    <div className="ferror show">
      {message || "The form couldn't reach the server. Please try again in a moment."}{" "}
      <a href={mailto}>{mailtoLabel}</a>
    </div>
  );
}

export function AgreementCheck({
  id,
  checked,
  onChange,
  invalid,
  href,
  label,
}: {
  id: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  invalid?: boolean;
  href: string;
  label: string;
}) {
  return (
    <>
      <div className={`agreerow${invalid ? " invalid" : ""}`}>
        <input type="checkbox" id={id} checked={checked} onChange={(e) => onChange(e.target.checked)} />
        <label htmlFor={id}>
          I have read and agree to the{" "}
          <a href={href} target="_blank" rel="noopener">
            {label}
          </a>
          . My acceptance is recorded with this submission.
        </label>
      </div>
      {invalid && (
        <span className="nsel-err" style={{ marginTop: -10, marginBottom: 14 }}>
          Please read and accept the agreement to continue.
        </span>
      )}
    </>
  );
}

export function Honeypot({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <p className="bt-field">
      <label>
        Don&apos;t fill this out: <input name="bt-field" value={value} onChange={(e) => onChange(e.target.value)} />
      </label>
    </p>
  );
}
