/* Chip — pill pro štítky a odpovědi; výběr = zlatý wash + glow ring. */
export default function Chip({ children, selected = false, onClick, style }) {
  const cls = ["lumi-chip", selected ? "lumi-chip--selected" : "", onClick ? "" : "lumi-chip--static"].join(" ");
  return (
    <button type="button" className={cls} onClick={onClick} style={style} aria-pressed={selected}>
      {children}
    </button>
  );
}
