import Link from "next/link";

export function PawMark() {
  return (
    <svg viewBox="0 0 100 100">
      <defs>
        <linearGradient id="g3" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#77CC00" />
          <stop offset="1" stopColor="#3BAB00" />
        </linearGradient>
      </defs>
      <circle cx="50" cy="50" r="48" fill="url(#g3)" />
      <g fill="#fff">
        <ellipse cx="34" cy="40" rx="8" ry="11" />
        <ellipse cx="52" cy="33" rx="8" ry="12" />
        <ellipse cx="70" cy="42" rx="7.5" ry="10.5" />
        <path d="M52 50c-12 0-19 9-16 19 2 8 12 11 16 11s14-3 16-11c3-10-4-19-16-19z" />
      </g>
    </svg>
  );
}

export function PawGlyph({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 100 100" fill="currentColor">
      <ellipse cx="34" cy="40" rx="8" ry="11" />
      <ellipse cx="52" cy="33" rx="8" ry="12" />
      <ellipse cx="70" cy="42" rx="7.5" ry="10.5" />
      <path d="M52 50c-12 0-19 9-16 19 2 8 12 11 16 11s14-3 16-11c3-10-4-19-16-19z" />
    </svg>
  );
}

export default function Brand({ href = "/" }: { href?: string }) {
  return (
    <Link className="brand" href={href}>
      <span className="mark">
        <PawMark />
      </span>
      <span>
        <strong>Veterinary Success Network</strong>
        <small>Powered by Veterinary Business Institute</small>
      </span>
    </Link>
  );
}
