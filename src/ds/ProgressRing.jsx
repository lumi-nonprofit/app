/* ProgressRing — kruhový ukazatel se zaobleným koncem; kanonické zobrazení WHO-5 indexu. */
export default function ProgressRing({
  value = 0,
  size = 72,
  stroke = 8,
  color = "var(--sun-500)",
  track = "var(--cream-100)",
  label,
  sublabel,
  labelColor = "var(--text-strong)",
  sublabelColor = "var(--text-muted)",
}) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const off = c * (1 - Math.max(0, Math.min(1, value)));
  return (
    <div style={{ position: "relative", width: size, height: size, fontFamily: "var(--font-body)" }}>
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={track} strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={off}
          style={{ transition: "stroke-dashoffset var(--dur-slow) var(--ease-out)" }}
        />
      </svg>
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          textAlign: "center",
        }}
      >
        {label ? (
          <span
            style={{
              fontFamily: "var(--font-display)",
              fontWeight: 700,
              color: labelColor,
              fontSize: size / 4.2,
              fontVariantNumeric: "tabular-nums",
              letterSpacing: "-0.02em",
            }}
          >
            {label}
          </span>
        ) : null}
        {sublabel ? (
          <span style={{ fontSize: Math.max(10, size / 7.5), color: sublabelColor }}>{sublabel}</span>
        ) : null}
      </div>
    </div>
  );
}
