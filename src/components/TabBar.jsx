/* LumiTabBar — spodní navigace: Dnes · Klid · Check-in (+) · Přehledy · Pomoc.
   Check-in je zvýrazněná prostřední akce. */
import { Icon } from "../ds/index.js";

const LUMI_TABS = [
  { id: "home", icon: "sun", label: "Dnes" },
  { id: "calm", icon: "wind", label: "Klid" },
  { id: "checkin", icon: "plus", label: "Check-in", center: true },
  { id: "stats", icon: "chart-line", label: "Přehledy" },
  { id: "help", icon: "heart-handshake", label: "Pomoc" },
];

export default function LumiTabBar({ active, onSelect }) {
  return (
    <nav className="ltab" aria-label="Hlavní navigace">
      {LUMI_TABS.map((t) => {
        const is = active === t.id;
        if (t.center) {
          return (
            <button
              key={t.id}
              type="button"
              className={`ltab-center ${is ? "ltab-center--active" : ""}`}
              aria-label="Check-in"
              aria-current={is ? "page" : undefined}
              onClick={() => onSelect(t.id)}
            >
              <span className="ltab-plus">
                <Icon name="plus" size={26} strokeWidth={2.2} />
              </span>
              <span className="ltab-label" style={{ color: is ? "var(--sun-700)" : "var(--ink-700)", fontWeight: is ? 700 : 500 }}>
                {t.label}
              </span>
            </button>
          );
        }
        return (
          <button
            key={t.id}
            type="button"
            className="ltab-item"
            aria-current={is ? "page" : undefined}
            style={{ color: is ? "var(--sun-700)" : "var(--ink-700)" }}
            onClick={() => onSelect(t.id)}
          >
            <Icon name={t.icon} size={23} strokeWidth={is ? 2.2 : 1.75} />
            <span className="ltab-label" style={{ fontWeight: is ? 700 : 500 }}>{t.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
