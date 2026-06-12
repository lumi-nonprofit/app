/* ListItem — klepnutelný řádek: tónovaná dlaždice s ikonou + titulek/podtitulek + šipka.
   Doplněk nad rámec DS: `href` vyrenderuje odkaz (tel: na krizové linky). */
import Icon from "./Icon.jsx";

export default function ListItem({
  icon,
  iconTint = "var(--accent-soft)",
  iconColor = "var(--sun-700)",
  title,
  subtitle,
  trailing,
  chevron = true,
  onClick,
  href,
  style,
}) {
  const body = (
    <>
      {icon ? (
        <span className="lumi-li__leading" style={{ background: iconTint, color: iconColor }}>
          <Icon name={icon} size={20} />
        </span>
      ) : null}
      <span className="lumi-li__body">
        <span className="lumi-li__title">{title}</span>
        {subtitle ? (
          <span className="lumi-li__sub" style={{ display: "block" }}>
            {subtitle}
          </span>
        ) : null}
      </span>
      <span className="lumi-li__trailing">
        {trailing}
        {chevron ? <Icon name="chevron-right" size={18} /> : null}
      </span>
    </>
  );
  if (href) {
    return (
      <a className="lumi-li" href={href} onClick={onClick} style={style}>
        {body}
      </a>
    );
  }
  return (
    <button type="button" className="lumi-li" onClick={onClick} style={style}>
      {body}
    </button>
  );
}
