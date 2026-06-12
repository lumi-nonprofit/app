/* LumiHeader — hlavička obrazovky (kicker + display titulek), SectionLabel — mikropopisek sekce. */
export function LumiHeader({ kicker, title, trailing }) {
  return (
    <header style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", padding: "6px 4px 2px" }}>
      <div>
        {kicker ? <div className="lumi-kicker">{kicker}</div> : null}
        <h1
          style={{
            margin: 0,
            fontFamily: "var(--font-display)",
            fontSize: 27,
            fontWeight: 700,
            letterSpacing: "var(--tracking-display)",
            color: "var(--text-strong)",
            lineHeight: 1.15,
          }}
        >
          {title}
        </h1>
      </div>
      {trailing || null}
    </header>
  );
}

export function SectionLabel({ children }) {
  return (
    <div className="lumi-kicker" style={{ padding: "4px 4px 0" }}>
      {children}
    </div>
  );
}
