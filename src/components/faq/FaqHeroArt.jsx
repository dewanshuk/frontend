/**
 * Decorative FAQ illustration (speech bubbles + question mark + sparkles).
 *
 * Painted with low-alpha tints only (no opaque gradients) so it dissolves into
 * the page background instead of reading as a pasted illustration — same
 * treatment as the Knowledge Hub and Gallery hero art. Palette follows the FAQ
 * indigo → violet accents used by the heading and search button.
 */
export default function FaqHeroArt({ className = "" }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 380 200"
      className={className}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Soft background blooms */}
      <circle cx="320" cy="30" r="60" fill="rgba(79,70,229,0.06)" />
      <circle cx="280" cy="140" r="40" fill="rgba(168,85,247,0.08)" />

      {/* Primary bubble with question mark */}
      <g>
        <rect x="256" y="42" width="80" height="66" rx="20" fill="rgba(79,70,229,0.14)" />
        <path d="M282 108 L306 108 L288 130 Z" fill="rgba(79,70,229,0.14)" />
        <path
          d="M284 68 C284 61 289 57 296 57 C303 57 308 61 308 67 C308 73 304 75 300 78 C297 80 296 83 296 86"
          stroke="rgba(124,58,237,0.45)"
          strokeWidth="7"
          strokeLinecap="round"
          fill="none"
        />
        <circle cx="296" cy="95" r="4" fill="rgba(124,58,237,0.5)" />
      </g>

      {/* Answer card stack */}
      <rect x="158" y="78" width="58" height="68" rx="5" fill="rgba(79,70,229,0.1)" transform="rotate(-7 187 112)" />
      <rect x="166" y="72" width="58" height="68" rx="5" fill="rgba(79,70,229,0.15)" transform="rotate(-3 195 106)" />
      <rect x="174" y="66" width="58" height="68" rx="5" fill="rgba(255,255,255,0.5)" stroke="rgba(79,70,229,0.2)" strokeWidth="1" />
      {/* Q/A lines inside the top card */}
      <rect x="184" y="80" width="36" height="3" rx="1.5" fill="rgba(168,85,247,0.5)" />
      <rect x="184" y="90" width="28" height="2" rx="1" fill="rgba(79,70,229,0.25)" />
      <rect x="184" y="97" width="33" height="2" rx="1" fill="rgba(79,70,229,0.25)" />
      <rect x="184" y="107" width="30" height="3" rx="1.5" fill="rgba(168,85,247,0.35)" />
      <rect x="184" y="117" width="22" height="2" rx="1" fill="rgba(79,70,229,0.25)" />

      {/* Small bubble with typing dots */}
      <g transform="translate(100, 108)">
        <rect x="0" y="0" width="54" height="36" rx="12" fill="rgba(236,72,153,0.1)" />
        <path d="M12 36 L30 36 L14 52 Z" fill="rgba(236,72,153,0.1)" />
        <g fill="rgba(236,72,153,0.35)">
          <circle cx="16" cy="18" r="4" />
          <circle cx="28" cy="18" r="4" />
          <circle cx="40" cy="18" r="4" />
        </g>
      </g>

      {/* Floating accents */}
      <circle cx="140" cy="52" r="6" fill="rgba(79,70,229,0.25)" />
      <circle cx="340" cy="130" r="5" fill="rgba(168,85,247,0.35)" />
      <circle cx="120" cy="172" r="4" fill="rgba(236,72,153,0.2)" />
      <circle cx="352" cy="82" r="3" fill="rgba(79,70,229,0.3)" />

      {/* Sparkles */}
      <path d="M330 162 l0 -6 l0 12 l0 -6 l-6 0 l12 0 l-6 0" stroke="rgba(168,85,247,0.5)" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M150 92 l0 -4 l0 8 l0 -4 l-4 0 l8 0 l-4 0" stroke="rgba(79,70,229,0.4)" strokeWidth="1" strokeLinecap="round" />
    </svg>
  );
}
