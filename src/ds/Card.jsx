/* Card — základní plocha Lumi: bílá, rádius 22 px, měkký teplý stín, bez borderu.
   Doplněk nad rámec DS: klikatelná karta je dosažitelná i z klávesnice (WCAG). */
export default function Card({ children, variant = "default", onClick, style }) {
  const interactive = Boolean(onClick);
  const cls = [
    "lumi-card",
    variant !== "default" ? `lumi-card--${variant}` : "",
    interactive ? "lumi-card--interactive" : "",
  ].join(" ");
  return (
    <div
      className={cls}
      onClick={onClick}
      role={interactive ? "button" : undefined}
      tabIndex={interactive ? 0 : undefined}
      onKeyDown={
        interactive
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onClick(e);
              }
            }
          : undefined
      }
      style={style}
    >
      {children}
    </div>
  );
}
