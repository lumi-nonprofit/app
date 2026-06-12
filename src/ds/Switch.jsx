/* Switch — přepínač nastavení; krémová dráha se zapnutím zbarví do zlata.
   Kanonický prvek pro volby kolem soukromí. */
export default function Switch({ checked = false, onChange, label, style }) {
  return (
    <label className={`lumi-switch ${checked ? "lumi-switch--on" : ""}`} style={style}>
      <input type="checkbox" checked={checked} onChange={(e) => onChange && onChange(e.target.checked)} />
      <span className="lumi-switch__track">
        <span className="lumi-switch__thumb" />
      </span>
      {label ? <span className="lumi-switch__label">{label}</span> : null}
    </label>
  );
}
