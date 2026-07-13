"use client";

import { useRef } from "react";

/** Hero parallax stage: animal artwork + glass cards orbiting the hotline core. */
export default function Stage() {
  const ref = useRef<HTMLDivElement>(null);

  function onMove(e: React.MouseEvent<HTMLDivElement>) {
    const stage = ref.current;
    if (!stage) return;
    const r = stage.getBoundingClientRect();
    const x = (e.clientX - r.left - r.width / 2) / r.width;
    const y = (e.clientY - r.top - r.height / 2) / r.height;
    stage.querySelectorAll<HTMLElement>("[data-depth]").forEach((l) => {
      const d = +(l.dataset.depth || 0);
      const base = l.classList.contains("core") ? "translate(-50%,-50%)" : "";
      l.style.transform = `${base} translate(${-x * d}px,${-y * d}px)`;
    });
  }

  function onLeave() {
    ref.current?.querySelectorAll<HTMLElement>("[data-depth]").forEach((l) => {
      l.style.transform = l.classList.contains("core") ? "translate(-50%,-50%)" : "";
    });
  }

  return (
    <div className="stage" ref={ref} onMouseMove={onMove} onMouseLeave={onLeave}>
      <div className="ring r1"></div>
      <div className="ring r2"></div>
      <div className="core" data-depth="6">
        <svg width="70" height="70" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2">
          <path d="M3 5a2 2 0 0 1 2-2h3l2 4-2 1a12 12 0 0 0 6 6l1-2 4 2v3a2 2 0 0 1-2 2A16 16 0 0 1 3 5z" />
        </svg>
      </div>
      <svg className="layer l-dog" data-depth="26" viewBox="0 0 200 200">
        <g fill="#fff" stroke="#1c3310" strokeWidth="3.2" strokeLinejoin="round">
          <path d="M62 70c-10-6-18-2-20 8-2 9 4 14 4 14l-6 40c-1 8 4 12 12 12h96c8 0 13-4 12-12l-6-40s6-5 4-14c-2-10-10-14-20-8" />
          <ellipse cx="100" cy="96" rx="52" ry="46" />
          <path d="M58 64c-14-4-22 6-20 20 1 10 8 16 8 16M142 64c14-4 22 6 20 20-1 10-8 16-8 16" />
        </g>
        <circle cx="84" cy="92" r="6" fill="#1c3310" />
        <circle cx="116" cy="92" r="6" fill="#1c3310" />
        <ellipse cx="100" cy="108" rx="8" ry="6" fill="#1c3310" />
      </svg>
      <svg className="layer l-cat" data-depth="40" viewBox="0 0 160 170">
        <g fill="#fff" stroke="#1c3310" strokeWidth="3.4" strokeLinejoin="round">
          <path d="M40 56 30 18l34 22c10-4 22-4 32 0l34-22-10 38c10 12 12 28 6 44-8 22-34 30-46 30s-38-8-46-30c-6-16-4-32 6-44z" />
        </g>
        <circle cx="64" cy="92" r="5.5" fill="#1c3310" />
        <circle cx="96" cy="92" r="5.5" fill="#1c3310" />
        <path d="M80 104l-5 6h10z" fill="#3BAB00" />
      </svg>
      <svg className="layer l-rabbit" data-depth="34" viewBox="0 0 120 150">
        <g fill="#fff" stroke="#1c3310" strokeWidth="3.2" strokeLinejoin="round">
          <ellipse cx="44" cy="40" rx="11" ry="30" />
          <ellipse cx="76" cy="40" rx="11" ry="30" />
          <circle cx="60" cy="98" r="40" />
        </g>
        <circle cx="48" cy="92" r="5" fill="#1c3310" />
        <circle cx="72" cy="92" r="5" fill="#1c3310" />
        <path d="M60 104v6" stroke="#1c3310" strokeWidth="3" strokeLinecap="round" />
      </svg>
      <svg className="layer l-bird" data-depth="48" viewBox="0 0 100 100">
        <g fill="#fff" stroke="#1c3310" strokeWidth="3.2" strokeLinejoin="round">
          <path d="M30 52c0-16 12-28 28-28 14 0 24 8 28 18 6-2 10 0 10 0s-4 8-12 8c0 16-12 28-28 28-18 0-26-12-26-12z" />
        </g>
        <circle cx="62" cy="44" r="4" fill="#1c3310" />
        <path d="M30 56l-16 6 14 6" fill="#77CC00" stroke="#1c3310" strokeWidth="3" />
      </svg>
      <div className="gcard gc1" data-depth="18">
        <span className="tk">
          <svg viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3">
            <path d="M20 6L9 17l-5-5" />
          </svg>
        </span>{" "}
        Written action plan
      </div>
      <div className="gcard gc2" data-depth="22">
        <span className="tk">
          <svg viewBox="0 0 100 100" fill="#fff">
            <ellipse cx="34" cy="40" rx="8" ry="11" />
            <ellipse cx="52" cy="33" rx="8" ry="12" />
            <ellipse cx="70" cy="42" rx="7.5" ry="10.5" />
            <path d="M52 50c-12 0-19 9-16 19 2 8 12 11 16 11s14-3 16-11c3-10-4-19-16-19z" />
          </svg>
        </span>{" "}
        3–4 experts matched
      </div>
    </div>
  );
}
