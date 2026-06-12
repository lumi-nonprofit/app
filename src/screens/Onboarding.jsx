/* Onboarding — 3 obrazovky (jméno, věk, soukromí), bez tab baru. */
import { Icon, IconButton, Input } from "../ds/index.js";
import LumiCTA from "../components/CTA.jsx";
import markUrl from "../assets/lumi-mark.svg";

function ObShell({ step, onBack, children }) {
  return (
    <div className="ob-screen">
      <div className="ob-top">
        {onBack ? <IconButton icon="arrow-left" label="Zpět" onClick={onBack} /> : <span style={{ width: 44 }} />}
        <div style={{ display: "flex", gap: 6 }} aria-label={`Krok ${step} ze 3`}>
          {[1, 2, 3].map((i) => (
            <span
              key={i}
              style={{
                width: i === step ? 22 : 8,
                height: 8,
                borderRadius: 999,
                background: i === step ? "var(--sun-500)" : "var(--cream-200)",
                transition: "width var(--dur-base, 240ms) ease",
              }}
            />
          ))}
        </div>
        <span style={{ width: 44 }} />
      </div>
      <div className="ob-body">{children}</div>
    </div>
  );
}

function ObTitle({ title, body }) {
  return (
    <div style={{ marginBottom: 24 }}>
      <h1
        style={{
          margin: "0 0 10px",
          fontFamily: "var(--font-display)",
          fontSize: 30,
          fontWeight: 700,
          letterSpacing: "var(--tracking-display)",
          color: "var(--text-strong)",
          lineHeight: 1.15,
        }}
      >
        {title}
      </h1>
      {body ? <p style={{ margin: 0, fontSize: 16, lineHeight: 1.55, color: "var(--text-body)" }}>{body}</p> : null}
    </div>
  );
}

/* 1 — přivítání + jméno */
export function OnboardingName({ name, onName, onNext }) {
  return (
    <ObShell step={1}>
      <img src={markUrl} alt="" width="52" height="52" style={{ marginBottom: 18 }} />
      <ObTitle
        title="Ahoj, tady Lumi."
        body="Pomůžu ti všímat si, jak se máš, a hledat, co ti dělá dobře. Všechno zůstává u tebe."
      />
      <Input
        label="Jak ti máme říkat?"
        placeholder="Třeba Alex"
        hint="Jen pro oslovení — nikam se neposílá."
        value={name}
        onChange={(e) => onName(e.target.value)}
      />
      <div style={{ flex: 1 }} />
      <LumiCTA disabled={!name.trim()} onClick={onNext} hint="Stačí napsat, jak ti máme říkat.">
        Pokračovat
      </LumiCTA>
    </ObShell>
  );
}

/* 2 — věk (určuje primární krizovou linku) */
export function OnboardingAge({ age, onAge, onNext, onBack }) {
  const options = [
    { id: "u26", label: "do 26 let", meta: "Primární linka: Linka bezpečí 116 111" },
    { id: "plus27", label: "27 a více", meta: "Primární linka: Linka první psychické pomoci 116 123" },
  ];
  return (
    <ObShell step={2} onBack={onBack}>
      <ObTitle title="Kolik ti je?" body="Podle věku ti nabídneme správnou krizovou linku." />
      <div role="radiogroup" aria-label="Věkové pásmo" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {options.map((o) => {
          const is = age === o.id;
          return (
            <button
              key={o.id}
              type="button"
              role="radio"
              aria-checked={is}
              className={`lumi-opt ${is ? "lumi-opt--selected" : ""}`}
              onClick={() => onAge(o.id)}
            >
              <span className="lumi-opt__radio" aria-hidden="true">
                {is ? <span className="lumi-opt__dot" /> : null}
              </span>
              <span style={{ flex: 1, textAlign: "left" }}>
                <span style={{ display: "block", fontSize: 17, fontWeight: 600, color: "var(--text-strong)" }}>{o.label}</span>
                <span style={{ display: "block", fontSize: 13, color: "var(--ink-700)", marginTop: 2 }}>{o.meta}</span>
              </span>
            </button>
          );
        })}
      </div>
      <div style={{ flex: 1 }} />
      <LumiCTA disabled={!age} onClick={onNext} hint="Vyber jedno z pásem — jde jen o krizovou linku.">
        Pokračovat
      </LumiCTA>
    </ObShell>
  );
}

/* 3 — soukromí: bez právničiny, sdílení default vypnuté */
export function OnboardingPrivacy({ onDone, onBack }) {
  const rows = [
    { icon: "smartphone", text: "Tvoje záznamy zůstávají jen v tomhle telefonu." },
    { icon: "flask-conical", text: "Pokud někdy budeš chtít, můžeš je anonymně sdílet pro výzkum — ale jen pokud to v nastavení zapneš." },
    { icon: "toggle-left", text: "Teď je sdílení vypnuté." },
  ];
  return (
    <ObShell step={3} onBack={onBack}>
      <span
        style={{
          width: 52,
          height: 52,
          borderRadius: "var(--radius-md)",
          background: "var(--info-soft)",
          color: "var(--lake-700)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          marginBottom: 18,
        }}
      >
        <Icon name="shield" size={26} />
      </span>
      <ObTitle title="Tvoje data zůstávají u tebe" />
      <div style={{ background: "var(--surface-sunken)", borderRadius: "var(--radius-lg)", padding: "8px 16px", display: "flex", flexDirection: "column" }}>
        {rows.map((r, i) => (
          <div
            key={r.icon}
            style={{ display: "flex", gap: 14, alignItems: "flex-start", padding: "14px 0", borderTop: i ? "1px solid var(--border-subtle)" : "none" }}
          >
            <span style={{ color: "var(--ink-700)", marginTop: 2 }}>
              <Icon name={r.icon} size={20} />
            </span>
            <span style={{ fontSize: 15, lineHeight: 1.5, color: "var(--text-body)" }}>{r.text}</span>
          </div>
        ))}
      </div>
      <div style={{ flex: 1 }} />
      <LumiCTA onClick={onDone}>Rozumím, jdeme na to</LumiCTA>
    </ObShell>
  );
}
