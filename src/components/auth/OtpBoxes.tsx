"use client";

import { useEffect, useRef } from "react";

/** Six-box one-time-code input: paste, auto-advance, backspace back, arrow keys. Styled by the parent via `className`. */
export default function OtpBoxes({ value, onChange, disabled, className = "otp-boxes" }: { value: string; onChange: (v: string) => void; disabled?: boolean; className?: string }) {
  const refs = useRef<(HTMLInputElement | null)[]>([]);
  const digits = Array.from({ length: 6 }, (_, i) => value[i] || "");
  useEffect(() => { refs.current[0]?.focus(); }, []);
  function setAt(i: number, ch: string) {
    const next = digits.slice();
    next[i] = ch;
    onChange(next.join("").slice(0, 6));
  }
  return (
    <div className={className} onPaste={(e) => { const t = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6); if (t) { e.preventDefault(); onChange(t); refs.current[Math.min(5, t.length)]?.focus(); } }}>
      {digits.map((d, i) => (
        <input
          key={i}
          ref={(el) => { refs.current[i] = el; }}
          className={d ? "filled" : undefined}
          inputMode="numeric"
          autoComplete={i === 0 ? "one-time-code" : "off"}
          maxLength={1}
          value={d}
          disabled={disabled}
          aria-label={`Digit ${i + 1}`}
          onChange={(e) => {
            const ch = e.target.value.replace(/\D/g, "").slice(-1);
            setAt(i, ch);
            if (ch && i < 5) refs.current[i + 1]?.focus();
          }}
          onKeyDown={(e) => {
            if (e.key === "Backspace" && !d && i > 0) { refs.current[i - 1]?.focus(); setAt(i - 1, ""); }
            if (e.key === "ArrowLeft" && i > 0) refs.current[i - 1]?.focus();
            if (e.key === "ArrowRight" && i < 5) refs.current[i + 1]?.focus();
          }}
        />
      ))}
    </div>
  );
}
