export function Cat({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 160 170">
      <g fill="#fff" stroke="#1c3310" strokeWidth="3.4" strokeLinejoin="round">
        <path d="M40 56 30 18l34 22c10-4 22-4 32 0l34-22-10 38c10 12 12 28 6 44-8 22-34 30-46 30s-38-8-46-30c-6-16-4-32 6-44z" />
      </g>
      <circle cx="64" cy="92" r="5.5" fill="#1c3310" />
      <circle cx="96" cy="92" r="5.5" fill="#1c3310" />
      <path d="M80 104l-5 6h10z" fill="#3BAB00" />
    </svg>
  );
}

export function Dog({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 200 200">
      <g fill="#fff" stroke="#1c3310" strokeWidth="3.2" strokeLinejoin="round">
        <path d="M62 70c-10-6-18-2-20 8-2 9 4 14 4 14l-6 40c-1 8 4 12 12 12h96c8 0 13-4 12-12l-6-40s6-5 4-14c-2-10-10-14-20-8" />
        <ellipse cx="100" cy="96" rx="52" ry="46" />
        <path d="M58 64c-14-4-22 6-20 20 1 10 8 16 8 16M142 64c14-4 22 6 20 20-1 10-8 16-8 16" />
      </g>
      <circle cx="84" cy="92" r="6" fill="#1c3310" />
      <circle cx="116" cy="92" r="6" fill="#1c3310" />
      <ellipse cx="100" cy="108" rx="8" ry="6" fill="#1c3310" />
    </svg>
  );
}

export function Rabbit({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 120 150">
      <g fill="#fff" stroke="#1c3310" strokeWidth="3.2" strokeLinejoin="round">
        <ellipse cx="44" cy="40" rx="11" ry="30" />
        <ellipse cx="76" cy="40" rx="11" ry="30" />
        <circle cx="60" cy="98" r="40" />
      </g>
      <circle cx="48" cy="92" r="5" fill="#1c3310" />
      <circle cx="72" cy="92" r="5" fill="#1c3310" />
      <path d="M60 104v6" stroke="#1c3310" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

export function Bird({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 100 100">
      <g fill="#fff" stroke="#1c3310" strokeWidth="3.2" strokeLinejoin="round">
        <path d="M30 52c0-16 12-28 28-28 14 0 24 8 28 18 6-2 10 0 10 0s-4 8-12 8c0 16-12 28-28 28-18 0-26-12-26-12z" />
      </g>
      <circle cx="62" cy="44" r="4" fill="#1c3310" />
      <path d="M30 56l-16 6 14 6" fill="#77CC00" stroke="#1c3310" strokeWidth="3" />
    </svg>
  );
}
