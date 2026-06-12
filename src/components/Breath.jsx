/* LumiBreath — dechový kruh. Vlastní verze DS BreathCircle: label „Připraven?“
   je rodově vázaný, proto neutrální „Začneme?“. Dýchá v rytmu 4 s / 4 s;
   animace respektuje prefers-reduced-motion (řeší CSS). */
import React from "react";

export default function LumiBreath({ size = 160, active, hint }) {
  const [phase, setPhase] = React.useState("Nádech");
  React.useEffect(() => {
    if (!active) return;
    setPhase("Nádech");
    const t = setInterval(() => setPhase((p) => (p === "Nádech" ? "Výdech" : "Nádech")), 4000);
    return () => clearInterval(t);
  }, [active]);
  return (
    <div className={`lumi-breath ${active ? "lumi-breath--active" : ""}`}>
      <div className="lumi-breath__circle" style={{ width: size, height: size }}>
        <div className="lumi-breath__halo" />
        <span className="lumi-breath__label">{active ? phase : "Začneme?"}</span>
      </div>
      {hint ? <span style={{ fontSize: 14, color: "var(--ink-700)" }}>{hint}</span> : null}
    </div>
  );
}
