/* Check-in — dvoukrokový flow + potvrzení.
   Krok 1: stav (podstatná jména, barva + tvar) a intenzita.
   Krok 2: upřesňující slova (1–2), kontextové štítky, nepovinná poznámka.
   Potvrzení: rodově neutrální, s kontextovým tipem podle stavu. */
import { Badge, Button, Card, Chip, Icon, IconButton, Input, ListItem } from "../ds/index.js";
import { LumiHeader, SectionLabel } from "../components/Header.jsx";
import LumiCTA from "../components/CTA.jsx";
import MoodShape from "../components/MoodShape.jsx";
import { CONTEXT_TAGS, INTENSITY_LABELS, MOODS, MOOD_BY_ID, MOOD_WORDS } from "../model.js";

/* ---------- krok 1 ---------- */
export function CheckinStep1({ draft, setDraft, onNext }) {
  const pct = ((draft.intensity - 1) / 4) * 100;
  return (
    <main className="app-scroll">
      <LumiHeader kicker="Check-in · krok 1 ze 2" title="Jak se právě teď cítíš?" />

      <div role="radiogroup" aria-label="Jak se právě teď cítíš?" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        {MOODS.map((m) => {
          const is = draft.mood === m.id;
          return (
            <button
              key={m.id}
              type="button"
              role="radio"
              aria-checked={is}
              className={`lumi-quad ${is ? "lumi-quad--selected" : ""}`}
              style={{ background: m.soft }}
              onClick={() => setDraft({ mood: m.id, words: [] })}
            >
              <MoodShape mood={m} size={22} />
              <span>
                <span style={{ display: "block", fontFamily: "var(--font-display)", fontWeight: 600, fontSize: 16, color: "var(--text-strong)" }}>
                  {m.name}
                </span>
                <span style={{ display: "block", fontSize: 12, color: "var(--ink-700)", marginTop: 1 }}>{m.axis}</span>
              </span>
            </button>
          );
        })}
      </div>

      {/* intenzita */}
      <Card style={{ padding: "16px 20px 12px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 2 }}>
          <span style={{ fontSize: 14.5, fontWeight: 600, color: "var(--text-body)" }}>Jak silné to je?</span>
          <span style={{ fontSize: 13.5, fontWeight: 600, color: "var(--sun-700)" }}>{INTENSITY_LABELS[draft.intensity - 1]}</span>
        </div>
        <input
          type="range"
          min="1"
          max="5"
          step="1"
          className="lumi-range"
          value={draft.intensity}
          aria-label="Intenzita"
          aria-valuetext={INTENSITY_LABELS[draft.intensity - 1]}
          style={{ "--range-fill": `${pct}%` }}
          onChange={(e) => setDraft({ intensity: Number(e.target.value) })}
        />
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5, color: "var(--ink-700)" }}>
          <span>jen lehce</span>
          <span>hodně silně</span>
        </div>
      </Card>

      <LumiCTA disabled={!draft.mood} onClick={onNext} hint="Nejdřív klepni na stav, který je teď nejblíž.">
        Pokračovat
      </LumiCTA>
    </main>
  );
}

/* ---------- krok 2 ---------- */
export function CheckinStep2({ draft, setDraft, onBack, onSave }) {
  const mood = MOOD_BY_ID[draft.mood] || MOOD_BY_ID.napeti;
  const words = MOOD_WORDS[mood.id];
  const toggleWord = (w) => {
    const has = draft.words.includes(w);
    if (has) setDraft({ words: draft.words.filter((x) => x !== w) });
    else if (draft.words.length < 2) setDraft({ words: [...draft.words, w] });
  };
  const toggleTag = (t) => {
    const has = draft.tags.includes(t);
    setDraft({ tags: has ? draft.tags.filter((x) => x !== t) : [...draft.tags, t] });
  };
  return (
    <main className="app-scroll">
      <div style={{ display: "flex", alignItems: "center", gap: 8, margin: "0 -6px" }}>
        <IconButton icon="arrow-left" label="Zpět na krok 1" onClick={onBack} />
        <span className="lumi-kicker" style={{ marginBottom: 0 }}>Check-in · krok 2 ze 2</span>
      </div>
      <LumiHeader title="Které slovo to vystihuje nejlíp?" />

      {/* shrnutí zvoleného stavu */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, background: mood.soft, borderRadius: "var(--radius-md)", padding: "10px 14px" }}>
        <MoodShape mood={mood} size={18} />
        <span style={{ fontSize: 14.5, fontWeight: 600, color: "var(--text-strong)" }}>{mood.name}</span>
        <span style={{ fontSize: 13, color: "var(--ink-700)" }}>· {INTENSITY_LABELS[draft.intensity - 1]}</span>
      </div>

      <div>
        <div style={{ fontSize: 13.5, color: "var(--ink-700)", margin: "0 0 8px" }}>Vyber jedno nebo dvě.</div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {words.map((w) => (
            <Chip key={w} selected={draft.words.includes(w)} onClick={() => toggleWord(w)}>
              {w}
            </Chip>
          ))}
        </div>
      </div>

      <div>
        <div style={{ fontSize: 14.5, fontWeight: 600, color: "var(--text-body)", margin: "4px 0 8px" }}>Co s tím souvisí?</div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {CONTEXT_TAGS.map((t) => (
            <Chip key={t} selected={draft.tags.includes(t)} onClick={() => toggleTag(t)}>
              {t}
            </Chip>
          ))}
        </div>
      </div>

      <Input
        label="Poznámka"
        placeholder="Co máš na srdci? (nepovinné)"
        multiline
        rows={3}
        value={draft.note}
        onChange={(e) => setDraft({ note: e.target.value })}
      />

      <LumiCTA disabled={draft.words.length === 0} onClick={onSave} hint="Vyber aspoň jedno slovo — pomáhá v Přehledech.">
        Uložit zápis
      </LumiCTA>
    </main>
  );
}

/* ---------- potvrzení ---------- */
const CONFIRM_TIPS = {
  napeti: { icon: "wind", tint: "var(--accent-soft)", color: "var(--sun-700)", title: "Dech 4-7-8", subtitle: "Pomáhá při napětí", badge: ["accent", "3 min"] },
  utlum: { icon: "moon", tint: "var(--lilac-100)", color: "var(--lilac-700)", title: "Klidné usínání", subtitle: "Zvuky a audio na dobrou noc", badge: ["lilac", "večer"] },
  energie: { icon: "notebook-pen", tint: "var(--positive-soft)", color: "var(--sage-700)", title: "Zápis do deníku", subtitle: "Zachyť, co se dnes povedlo", badge: null },
  klid: { icon: "footprints", tint: "var(--positive-soft)", color: "var(--sage-700)", title: "Všímavá procházka", subtitle: "Meditace v pohybu · venku", badge: ["positive", "venku"] },
};

export function CheckinConfirm({ moodId, onHome, onOpenCalm }) {
  const tip = CONFIRM_TIPS[moodId] || CONFIRM_TIPS.napeti;
  return (
    <main className="app-scroll" style={{ justifyContent: "center", textAlign: "center" }}>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
        <span
          style={{
            width: 76,
            height: 76,
            borderRadius: "50%",
            background: "var(--accent-soft)",
            color: "var(--sun-700)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: "var(--shadow-glow)",
          }}
        >
          <Icon name="check" size={36} strokeWidth={2.2} />
        </span>
        <div>
          <h1
            style={{
              margin: "0 0 8px",
              fontFamily: "var(--font-display)",
              fontSize: 28,
              fontWeight: 700,
              letterSpacing: "var(--tracking-display)",
              color: "var(--text-strong)",
            }}
          >
            Uloženo.
          </h1>
          <p style={{ margin: 0, fontSize: 16, color: "var(--text-body)", lineHeight: 1.55 }}>
            Tohle byla chvilka pro tebe.
            <br />
            Záznam zůstává v telefonu.
          </p>
        </div>
      </div>

      <div style={{ marginTop: 28, textAlign: "left" }}>
        <SectionLabel>Mohlo by teď sednout</SectionLabel>
        <Card style={{ padding: "8px 12px", marginTop: 6 }}>
          <ListItem
            icon={tip.icon}
            iconTint={tip.tint}
            iconColor={tip.color}
            title={tip.title}
            subtitle={tip.subtitle}
            trailing={tip.badge ? <Badge tone={tip.badge[0]}>{tip.badge[1]}</Badge> : null}
            onClick={onOpenCalm}
          />
        </Card>
      </div>

      <div style={{ marginTop: 16 }}>
        <Button variant="secondary" size="lg" fullWidth onClick={onHome}>
          Zpět na Dnes
        </Button>
      </div>
    </main>
  );
}
