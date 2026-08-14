// Animated signal/network icon for the header.
// Three rising bars in brand blue + a pulsing node.
export function SignalIcon({ className = "" }: { className?: string }) {
  return (
    <span
      className={`relative inline-flex h-9 w-9 items-center justify-center rounded-xl bg-brand-soft text-brand ${className}`}
      aria-hidden
    >
      <svg
        viewBox="0 0 24 24"
        width="20"
        height="20"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="text-brand"
      >
        {/* signal bars */}
        <g
          transform="translate(5 14)"
          style={{ transformOrigin: "center" }}
        >
          <rect
            x="0"
            y="3"
            width="2.4"
            height="3"
            rx="1"
            style={{
              transformBox: "fill-box",
              transformOrigin: "bottom",
              animation: "signal-bar 1.6s ease-in-out infinite",
            }}
          />
          <rect
            x="3.4"
            y="1"
            width="2.4"
            height="5"
            rx="1"
            style={{
              transformBox: "fill-box",
              transformOrigin: "bottom",
              animation: "signal-bar 1.6s ease-in-out infinite 0.2s",
            }}
          />
          <rect
            x="6.8"
            y="-1"
            width="2.4"
            height="7"
            rx="1"
            style={{
              transformBox: "fill-box",
              transformOrigin: "bottom",
              animation: "signal-bar 1.6s ease-in-out infinite 0.4s",
            }}
          />
        </g>
      </svg>
      <span
        className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full bg-signal ring-2 ring-card"
        style={{ animation: "header-glow 2s ease-in-out infinite" }}
      />
    </span>
  );
}
