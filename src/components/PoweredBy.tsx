export default function PoweredBy({ cap = "Powered by", community = false }: { cap?: string; community?: boolean }) {
  return (
    <div className="pby">
      {cap && <div className="cap">{cap}</div>}
      <div className="logos">
        <span className="lg">
          <span className="pw">
            <svg viewBox="0 0 100 100" fill="#fff">
              <ellipse cx="34" cy="40" rx="8" ry="11" />
              <ellipse cx="52" cy="33" rx="8" ry="12" />
              <ellipse cx="70" cy="42" rx="7.5" ry="10.5" />
              <path d="M52 50c-12 0-19 9-16 19 2 8 12 11 16 11s14-3 16-11c3-10-4-19-16-19z" />
            </svg>
          </span>{" "}
          Veterinary Business Institute
        </span>
        <span className="lg">
          <span className="pw">
            <svg viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.4">
              <rect x="9" y="3" width="6" height="11" rx="3" />
              <path d="M5 11a7 7 0 0 0 14 0M12 18v3" />
            </svg>
          </span>{" "}
          The VBI Podcast
        </span>
        <span className="lg">
          <span className="pw">
            <svg viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.4">
              <rect x="3" y="4" width="18" height="17" rx="2" />
              <path d="M3 9h18M8 2v4M16 2v4" />
            </svg>
          </span>{" "}
          VBI Events &amp; Webinars
        </span>
        {community && (
          <span className="lg">
            <span className="pw">
              <svg viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.4">
                <path d="M4 20s0-9 6-13 10-3 10-3-1 7-5 11-11 5-11 5z" />
                <path d="M4 20c3-5 8-9 12-11" />
              </svg>
            </span>{" "}
            The VSN Member Community
          </span>
        )}
      </div>
    </div>
  );
}
