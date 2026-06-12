/* Button — pill tlačítko pro všechny akce Lumi; primary je plný ink (nikdy zlatá —
   zlatá jako výplň neprojde kontrastem). Crisis = plný clay.
   Doplněk nad rámec DS: `href` vyrenderuje odkaz se stejným vzhledem (tel: linky). */
export default function Button({
  children,
  variant = "primary",
  size = "md",
  fullWidth = false,
  disabled = false,
  onClick,
  href,
  type = "button",
  style,
}) {
  const cls = ["lumi-btn", `lumi-btn--${variant}`, `lumi-btn--${size}`, fullWidth ? "lumi-btn--full" : ""].join(" ");
  if (href) {
    return (
      <a className={cls} href={href} onClick={onClick} style={style}>
        {children}
      </a>
    );
  }
  return (
    <button type={type} className={cls} disabled={disabled} onClick={onClick} style={style}>
      {children}
    </button>
  );
}
