/* Lumi — datový model a doménové helpery.
   Pozn.: barvy stavů jsou ZÁMĚRNĚ přemapované oproti DS MoodPickeru
   (DS: tense→clay, low→lake = vizuální podpis Mood Meteru).
   Zde: Napětí→lake (studené sevření), Útlum→clay (tlumené, těžké světlo).
   Každý stav má navíc vlastní tvar — informace nikdy jen barvou. */
import { palette } from "./theme.js";

export const MOODS = [
  { id: "energie", name: "Energie", axis: "vysoká energie · příjemné",
    color: palette.sun400, soft: palette.sun100, strong: palette.sun700, shape: "circle" },
  { id: "napeti", name: "Napětí", axis: "vysoká energie · nepříjemné",
    color: palette.lake500, soft: palette.lake100, strong: palette.lake700, shape: "diamond" },
  { id: "klid", name: "Klid", axis: "nízká energie · příjemné",
    color: palette.sage500, soft: palette.sage100, strong: palette.sage700, shape: "square" },
  { id: "utlum", name: "Útlum", axis: "nízká energie · nepříjemné",
    color: palette.clay500, soft: palette.clay100, strong: palette.clay700, shape: "half" },
];
export const MOOD_BY_ID = Object.fromEntries(MOODS.map((m) => [m.id, m]));

export const MOOD_WORDS = {
  energie: ["nadšení", "radost", "hravost", "odhodlání", "zvědavost", "vděčnost", "hrdost"],
  napeti: ["stres", "nervozita", "zahlcení", "podráždění", "vztek", "obavy", "neklid"],
  klid: ["pohoda", "spokojenost", "uvolnění", "vyrovnanost", "bezpečí", "soustředění", "něha"],
  utlum: ["únava", "smutek", "osamělost", "prázdnota", "zklamání", "stesk", "apatie"],
};
export const CONTEXT_TAGS = ["práce", "škola", "rodina", "vztahy", "spánek", "zdraví", "počasí"];
export const INTENSITY_LABELS = ["jen lehce", "lehce", "středně", "silně", "hodně silně"];

export const HELP_LINES = {
  u26: { name: "Linka bezpečí", phone: "116 111", meta: "zdarma · nonstop · děti a studenti do 26 let" },
  plus27: { name: "Linka první psychické pomoci", phone: "116 123", meta: "zdarma · nonstop · dospělí" },
};

export const WHO5_CADENCE_DAYS = 14;

/* ---------- datum / čas ---------- */
export const DAY_LETTERS = ["Po", "Út", "St", "Čt", "Pá", "So", "Ne"];
export const DAY_NAMES = ["pondělí", "úterý", "středa", "čtvrtek", "pátek", "sobota", "neděle"];

const pad2 = (n) => String(n).padStart(2, "0");

/** Lokální datum jako "YYYY-MM-DD" (záznamy se vážou na den v telefonu, ne na UTC). */
export function toISODate(d = new Date()) {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

export function nowTime(d = new Date()) {
  return `${d.getHours()}:${pad2(d.getMinutes())}`;
}

export function czToday(d = new Date()) {
  const days = ["Neděle", "Pondělí", "Úterý", "Středa", "Čtvrtek", "Pátek", "Sobota"];
  const months = ["ledna", "února", "března", "dubna", "května", "června",
    "července", "srpna", "září", "října", "listopadu", "prosince"];
  return `${days[d.getDay()]} ${d.getDate()}. ${months[d.getMonth()]}`;
}

export function czGreeting(name, d = new Date()) {
  const h = d.getHours();
  const word = h < 10 ? "Dobré ráno" : h < 18 ? "Dobré odpoledne" : "Dobrý večer";
  return name ? `${word}, ${name}` : word;
}

/** Počet dní mezi dvěma ISO daty (b − a); počítá se přes poledne kvůli změnám času. */
export function daysBetween(aISO, bISO) {
  const at = new Date(`${aISO}T12:00:00`).getTime();
  const bt = new Date(`${bISO}T12:00:00`).getTime();
  return Math.round((bt - at) / 86400000);
}

/** Český plurál: czPlural(3, ["den", "dny", "dní"]) → "dny". */
export function czPlural(n, [one, few, many]) {
  return n === 1 ? one : n >= 2 && n <= 4 ? few : many;
}

/* ---------- agregace záznamů ---------- */

/** Záznamy daného dne → { mood, intensity } | null.
    Převažující stav = nejčastější (remíza → pozdější zápis), intenzita = průměr. */
export function aggregateDay(dayEntries) {
  if (!dayEntries.length) return null;
  const counts = {};
  for (const e of dayEntries) counts[e.mood] = (counts[e.mood] || 0) + 1;
  const max = Math.max(...Object.values(counts));
  let mood = null;
  for (const e of dayEntries) if (counts[e.mood] === max) mood = e.mood; // poslední s max počtem vyhrává
  const avg = dayEntries.reduce((s, e) => s + e.intensity, 0) / dayEntries.length;
  const intensity = Math.min(5, Math.max(1, Math.round(avg)));
  return { mood, intensity };
}

function mondayOf(d) {
  const m = new Date(d);
  m.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return m;
}

/** Aktuální týden (Po–Ne) s agregovanými záznamy. */
export function buildWeek(entries, today = new Date()) {
  const todayIdx = (today.getDay() + 6) % 7;
  const monday = mondayOf(today);
  return DAY_LETTERS.map((label, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    const iso = toISODate(d);
    const entry = aggregateDay(entries.filter((e) => e.date === iso));
    return { label, dayName: DAY_NAMES[i], iso, entry, today: i === todayIdx, future: i > todayIdx };
  });
}

/** Poslední 4 kalendářní týdny (nejstarší nahoře), pro měsíční pohled. */
export function buildMonth(entries, today = new Date()) {
  const monday = mondayOf(today);
  const todayISO = toISODate(today);
  return [3, 2, 1, 0].map((w) =>
    DAY_LETTERS.map((label, i) => {
      const d = new Date(monday);
      d.setDate(monday.getDate() - 7 * w + i);
      const iso = toISODate(d);
      return {
        label,
        iso,
        entry: aggregateDay(entries.filter((e) => e.date === iso)),
        future: iso > todayISO,
      };
    })
  );
}

/** Poslední dnešní záznam (pro kartu na Dnes a potvrzení). */
export function lastEntryForDate(entries, iso) {
  for (let i = entries.length - 1; i >= 0; i--) if (entries[i].date === iso) return entries[i];
  return null;
}

/** Počet záznamů v aktuálním týdnu — „prázdný týden“ = 0–1 záznam. */
export function weekEntryCount(entries, today = new Date()) {
  const week = buildWeek(entries, today);
  const days = new Set(week.map((d) => d.iso));
  return entries.filter((e) => days.has(e.date)).length;
}

/* ---------- WHO-5 wellbeing index ---------- */

export function latestWho5(who5) {
  return who5 && who5.length ? who5[who5.length - 1] : null;
}

/** Interpretace na Dnes — vždy jen vůči vlastnímu průměru, nikdy vůči ostatním. */
export function who5HomeText(who5) {
  const cur = latestWho5(who5);
  if (!cur) return null;
  const prev = who5.slice(0, -1);
  if (!prev.length) return "WHO-5 za posledních 14 dní. Tvůj výchozí bod.";
  const avg = prev.reduce((s, m) => s + m.score, 0) / prev.length;
  return cur.score >= avg
    ? "WHO-5 za posledních 14 dní. Drží se nad tvým průměrem."
    : "WHO-5 za posledních 14 dní. Je teď kousek pod tvým průměrem.";
}

/** Texty do Přehledů: kdy proběhlo poslední měření a kdy bude další (kadence 14 dní). */
export function who5StatsText(who5, today = new Date()) {
  const cur = latestWho5(who5);
  if (!cur) return null;
  const since = Math.max(0, daysBetween(cur.date, toISODate(today)));
  const filled =
    since === 0 ? "Vyplněno dnes." : `Vyplněno před ${since} ${czPlural(since, ["dnem", "dny", "dny"])}.`;
  const left = Math.max(0, WHO5_CADENCE_DAYS - since);
  const next =
    left === 0
      ? "Další dotazník tě čeká dnes."
      : `Další dotazník tě čeká za ${left} ${czPlural(left, ["den", "dny", "dní"])}.`;
  return `${filled} ${next}`;
}
