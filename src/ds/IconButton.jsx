/* IconButton — kulaté tlačítko jen s ikonou; vždy s českým `label`. */
import Icon from "./Icon.jsx";

export default function IconButton({
  icon,
  label,
  variant = "ghost",
  size = 44,
  iconSize = 22,
  onClick,
  style,
}) {
  const cls = ["lumi-iconbtn", variant !== "ghost" ? `lumi-iconbtn--${variant}` : ""].join(" ");
  return (
    <button
      type="button"
      className={cls}
      aria-label={label}
      title={label}
      onClick={onClick}
      style={{ width: size, height: size, ...style }}
    >
      <Icon name={icon} size={iconSize} />
    </button>
  );
}
