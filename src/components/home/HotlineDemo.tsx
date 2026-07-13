"use client";

import { useEffect, useRef, useState } from "react";

type Scenario = { me: string; them: string; ex: [string, string][] };

const SCENARIOS: Record<string, Scenario> = {
  hiring: {
    me: "I keep losing associate vets within a year.",
    them: "Got it: this is usually retention + comp structure. Your written plan: a stay-interview script, a growth-ladder template, and the hiring kit.",
    ex: [["RV", "Retention Vet"], ["TP", "Team & People"], ["CC", "Culture Coach"]],
  },
  pricing: {
    me: "My fees feel too low but raising them scares me.",
    them: "Classic under-pricing. Your written plan: the fee-audit worksheet plus a phased increase schedule that keeps clients.",
    ex: [["PM", "Pricing Mentor"], ["FA", "Fee Analyst"], ["PB", "Profit Builder"]],
  },
  noshow: {
    me: "No-shows keep wrecking the schedule.",
    them: "Your written plan: reminder + deposit policy, a fast gap-fill list, and the no-show playbook from the library.",
    ex: [["SO", "Schedule Op"], ["FD", "Front Desk Pro"], ["OP", "Ops Coach"]],
  },
  marketing: {
    me: "New-client growth has gone flat.",
    them: "Your written plan: a local-visibility audit and a reactivation campaign, plus your member deal with our marketing partner.",
    ex: [["MK", "Marketing Lead"], ["LS", "Local SEO"], ["EK", "Ekwa Partner"]],
  },
};

const CHIPS: [string, string][] = [
  ["hiring", "Can't keep associates"],
  ["pricing", "Fees feel too low"],
  ["noshow", "Too many no-shows"],
  ["marketing", "Slow new-client growth"],
];

export default function HotlineDemo() {
  const [active, setActive] = useState("hiring");
  const [phase, setPhase] = useState(0); // 0 me, 1 typing, 2 reply, 3 experts
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
    setPhase(0);
    timers.current.push(setTimeout(() => setPhase(1), 500));
    timers.current.push(setTimeout(() => setPhase(2), 1700));
    timers.current.push(setTimeout(() => setPhase(3), 2000));
    return () => timers.current.forEach(clearTimeout);
  }, [active]);

  const s = SCENARIOS[active];

  return (
    <div className="demo">
      <div>
        <p className="dlab">Try it: what&apos;s on your mind?</p>
        <div className="chips">
          {CHIPS.map(([k, label]) => (
            <span key={k} className={`chip${active === k ? " on" : ""}`} onClick={() => setActive(k)}>
              {label}
            </span>
          ))}
        </div>
        <p className="dnote">
          Routed by fit, never pay-to-play. Not a live call line, and not 24/7. A real, considered
          reply.
        </p>
      </div>
      <div className="reply">
        <div className="top">
          <svg className="gi" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M3 5a2 2 0 0 1 2-2h3l2 4-2 1a12 12 0 0 0 6 6l1-2 4 2v3a2 2 0 0 1-2 2A16 16 0 0 1 3 5z" />
          </svg>{" "}
          VSN Expert Hotline · your written reply
        </div>
        <div className="bubble me show">{s.me}</div>
        {phase >= 1 && (
          <div className="bubble them show">
            {phase === 1 ? (
              <span className="typing">
                <span></span>
                <span></span>
                <span></span>
              </span>
            ) : (
              s.them
            )}
          </div>
        )}
        {phase >= 3 && (
          <div className="bubble them show">
            <b>Your 3 matched experts:</b>
            <div className="expertrow">
              {s.ex.map(([initials, name]) => (
                <span className="epill" key={name}>
                  <span className="av">{initials}</span>
                  {name}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
