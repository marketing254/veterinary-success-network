"use client";

import { useEffect, useState } from "react";

const LAUNCH_AT = process.env.NEXT_PUBLIC_LAUNCH_AT || "2026-09-01T09:00:00-04:00";

function remaining(target: number) {
  const diff = target - Date.now();
  if (diff <= 0) return null;
  return {
    d: Math.floor(diff / 86400000),
    h: Math.floor((diff % 86400000) / 3600000),
    m: Math.floor((diff % 3600000) / 60000),
    s: Math.floor((diff % 60000) / 1000),
  };
}

export default function Countdown({ compact = false }: { compact?: boolean }) {
  const target = new Date(LAUNCH_AT).getTime();
  // Render nothing until mounted so the server and client markup never disagree.
  const [now, setNow] = useState<ReturnType<typeof remaining> | "loading">("loading");

  useEffect(() => {
    setNow(remaining(target));
    const t = setInterval(() => setNow(remaining(target)), 1000);
    return () => clearInterval(t);
  }, [target]);

  if (now === "loading") {
    return <div className={`count${compact ? " compact" : ""}`} aria-hidden style={{ minHeight: compact ? 64 : 92 }} />;
  }

  if (now === null) {
    return (
      <div style={{ textAlign: "center" }}>
        <span className="count-open">
          <span className="dot" style={{ width: 8, height: 8, borderRadius: "50%", background: "#fff" }} />
          Founding doors are open — the first 100 spots are live
        </span>
      </div>
    );
  }

  const cells: Array<[number, string]> = [
    [now.d, "Days"],
    [now.h, "Hours"],
    [now.m, "Minutes"],
    [now.s, "Seconds"],
  ];

  return (
    <>
      <div className={`count${compact ? " compact" : ""}`}>
        {cells.map(([v, l]) => (
          <div className="cell" key={l}>
            <div className="num">{String(v).padStart(2, "0")}</div>
            <div className="lbl">{l}</div>
          </div>
        ))}
      </div>
      <div className="count-cap">
        Founding doors open{" "}
        <b>
          {new Date(LAUNCH_AT).toLocaleDateString("en-US", {
            month: "long",
            day: "numeric",
            year: "numeric",
          })}
        </b>{" "}
        — reserve now, spots are assigned in arrival order.
      </div>
    </>
  );
}
