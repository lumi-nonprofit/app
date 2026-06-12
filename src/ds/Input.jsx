/* Input — textové pole (nebo textarea přes `multiline`): zapuštěná krémová plocha,
   focus = bílá + zlatý ring. */
export default function Input({ label, hint, multiline = false, rows = 4, style, ...rest }) {
  const control = multiline ? (
    <textarea className="lumi-input" rows={rows} {...rest} />
  ) : (
    <input className="lumi-input" {...rest} />
  );
  return (
    <label className="lumi-field" style={style}>
      {label ? <span className="lumi-field__label">{label}</span> : null}
      {control}
      {hint ? <span className="lumi-field__hint">{hint}</span> : null}
    </label>
  );
}
