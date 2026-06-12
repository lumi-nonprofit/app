/* LumiCTA — hlavní akce obrazovky s přístupným disabled stavem:
   obrys + inkoustový text na zapuštěném podkladu (kontrast ≥ 4,5:1),
   ne jen světle šedý text. Disabled stav vysvětluje hint pod tlačítkem. */
export default function LumiCTA({ children, disabled, onClick, variant = "primary", hint }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <button
        type="button"
        className={`lumi-cta ${variant === "secondary" ? "lumi-cta--secondary" : ""}`}
        aria-disabled={disabled ? "true" : "false"}
        onClick={disabled ? undefined : onClick}
      >
        {children}
      </button>
      {disabled && hint ? (
        <div style={{ fontSize: 13, color: "var(--ink-700)", textAlign: "center" }}>{hint}</div>
      ) : null}
    </div>
  );
}
