/* Badge — malý stavový pill pro metadata (5 MIN, VEČER); jemné tóny, nikdy syté výplně. */
export default function Badge({ children, tone = "neutral", style }) {
  return (
    <span className={`lumi-badge lumi-badge--${tone}`} style={style}>
      {children}
    </span>
  );
}
