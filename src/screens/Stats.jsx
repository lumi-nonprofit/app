/* Přehledy — týden jako tečky (barva + tvar = stav, velikost = intenzita,
   prázdný den = obrysový kruh), wellbeing index, data pro výzkum.
   Varianty jsou datové: prázdný týden = 0–1 záznam, empatická varianta
   při WHO-5 pod 50 % — žádné alarmy, žádná vina. */
import React from "react";
import { Badge, Button, Card, Icon, ProgressRing, Switch } from "../ds/index.js";
import { LumiHeader } from "../components/Header.jsx";
import MoodShape from "../components/MoodShape.jsx";
import {
  INTENSITY_LABELS,
  MOODS,
  MOOD_BY_ID,
  buildMonth,
  buildWeek,
  latestWho5,
  weekEntryCount,
  who5StatsText,
} from "../model.js";

/* den jako tečka: barva + tvar = stav, velikost = intenzita, prázdný = obrysový kruh */
function DayDot({ day }) {
  const mood = day.entry ? MOOD_BY_ID[day.entry.mood] : null;
  const size = day.entry ? 13 + day.entry.intensity * 3.4 : 14;
  const label = day.entry
    ? `${day.dayName} — ${mood.name}, ${INTENSITY_LABELS[day.entry.intensity - 1]}`
    : `${day.dayName} — bez záznamu`;
  return (
    <div
      role="img"
      aria-label={label}
      style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 7, opacity: day.future ? 0.45 : 1 }}
    >
      <div style={{ height: 32, display: "flex", alignItems: "center", justifyContent: "center" }}>
        {mood ? <MoodShape mood={mood} size={size} /> : <MoodShape size={14} outline dashed={day.future} />}
      </div>
      <span style={{ fontSize: 11.5, fontWeight: day.today ? 700 : 500, color: day.today ? "var(--sun-700)" : "var(--ink-700)" }}>
        {day.today ? "dnes" : day.label}
      </span>
    </div>
  );
}

function MoodLegend() {
  return (
    <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 14 }}>
      {MOODS.map((m) => (
        <span key={m.id} style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 12, color: "var(--ink-700)" }}>
          <MoodShape mood={m} size={11} />
          {m.name.toLowerCase()}
        </span>
      ))}
      <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 12, color: "var(--ink-700)" }}>
        <MoodShape size={11} outline />
        bez záznamu
      </span>
    </div>
  );
}

export default function StatsScreen({ entries, who5, share, onShare, onStartCheckin, onOpenHelp }) {
  const [period, setPeriod] = React.useState("týden");
  const week = buildWeek(entries);
  const empty = weekEntryCount(entries) <= 1;
  const measurement = latestWho5(who5);
  const low = measurement ? measurement.score < 50 : false;

  return (
    <main className="app-scroll">
      <LumiHeader
        kicker="Přehledy"
        title="Tvůj týden"
        trailing={
          <div className="lumi-seg" role="tablist" aria-label="Období">
            {["týden", "měsíc"].map((p) => (
              <button
                key={p}
                type="button"
                role="tab"
                aria-selected={period === p}
                className={`lumi-seg__btn ${period === p ? "lumi-seg__btn--on" : ""}`}
                onClick={() => setPeriod(p)}
              >
                {p}
              </button>
            ))}
          </div>
        }
      />

      {/* kalendář nálad */}
      <Card>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 12 }}>
          <span style={{ fontWeight: 600, color: "var(--text-strong)", fontSize: 15 }}>Nálada podle dní</span>
          <Badge>{period === "týden" ? "tento týden" : "posledních 28 dní"}</Badge>
        </div>

        {empty ? (
          <div>
            <div style={{ display: "flex", gap: 4 }}>
              {week.map((d) => (
                <DayDot key={d.label} day={d} />
              ))}
            </div>
            <p style={{ margin: "16px 0 12px", fontSize: 14.5, color: "var(--text-body)", lineHeight: 1.55 }}>
              Zatím tu toho moc není — každý zápis se počítá.
            </p>
            <Button variant="secondary" size="sm" onClick={onStartCheckin}>Začít check-in</Button>
          </div>
        ) : period === "týden" ? (
          <div style={{ display: "flex", gap: 4 }}>
            {week.map((d) => (
              <DayDot key={d.label} day={d} />
            ))}
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {buildMonth(entries).map((row, w) => (
              <div key={w} style={{ display: "flex", gap: 4 }}>
                {row.map((d) => {
                  const m = d.entry ? MOOD_BY_ID[d.entry.mood] : null;
                  return (
                    <span key={d.iso} style={{ flex: 1, display: "flex", justifyContent: "center", opacity: d.future ? 0.45 : 1 }}>
                      {m ? <MoodShape mood={m} size={8 + d.entry.intensity * 1.6} /> : <MoodShape size={10} outline />}
                    </span>
                  );
                })}
              </div>
            ))}
          </div>
        )}
        {!empty ? <MoodLegend /> : null}
      </Card>

      {/* wellbeing index */}
      <Card>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <ProgressRing
            value={measurement ? measurement.score / 100 : 0}
            size={84}
            color={low ? "var(--lake-500)" : "var(--sun-500)"}
            label={measurement ? `${measurement.score} %` : "—"}
            sublabel="WHO-5"
          />
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 600, color: "var(--text-strong)", fontSize: 15 }}>Wellbeing index</div>
            {!measurement ? (
              <div style={{ fontSize: 13.5, color: "var(--ink-700)", lineHeight: 1.5, marginTop: 2 }}>
                Krátký dotazník (5 otázek) ti nastaví výchozí bod. Bez známek, bez porovnávání.
              </div>
            ) : low ? (
              <div>
                <div style={{ fontSize: 13.5, color: "var(--ink-700)", lineHeight: 1.5, margin: "2px 0 10px" }}>
                  Poslední dva týdny vypadají náročně. Je v pořádku říct si o podporu.
                </div>
                <Button variant="secondary" size="sm" onClick={onOpenHelp}>Otevřít Pomoc</Button>
              </div>
            ) : (
              <div style={{ fontSize: 13.5, color: "var(--ink-700)", lineHeight: 1.5, marginTop: 2 }}>{who5StatsText(who5)}</div>
            )}
          </div>
        </div>
      </Card>

      {/* data pro výzkum — toggle, výchozí stav vypnuto, žádné dark patterns */}
      <Card variant="sunken">
        <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
          <span style={{ color: "var(--lake-700)", marginTop: 2 }}>
            <Icon name="shield" size={20} />
          </span>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 600, fontSize: 14.5, color: "var(--text-strong)", marginBottom: 2 }}>Data pro výzkum</div>
            <p style={{ margin: "0 0 12px", fontSize: 13.5, color: "var(--ink-700)", lineHeight: 1.5 }}>
              Tvoje záznamy zůstávají v telefonu. Pro výzkum je sdílíme jen anonymně a jen pokud to dovolíš.
            </p>
            <Switch checked={share} onChange={onShare} label={share ? "Sdílení zapnuto" : "Sdílení vypnuto"} />
          </div>
        </div>
      </Card>
    </main>
  );
}
