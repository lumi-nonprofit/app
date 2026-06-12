/* Lokální insights — čisté funkce nad záznamy zvoleného období.
   Formulace VŽDY deskriptivní, nikdy kauzální („pojilo se“, „objevuje
   se“ — ne „protože“ ani „kvůli“). Pod prahem dat se nic nevymýšlí. */
import { MOOD_BY_ID, type Entry, type MoodId } from "../../model";

export interface Insight {
  id: string;
  text: string;
}

/** Práh: vzorec hlásíme až od 3 výskytů kombinace; celkově od 3 záznamů. */
export const INSIGHT_MIN_OCCURRENCES = 3;

export const TOO_FEW_DATA_TEXT = "Zatím je tu málo záznamů na vzorce — každý zápis pomáhá.";

/* minulé příčestí „pojil/a/o se“ podle rodu podstatného jména stavu */
const MOOD_VERB: Record<MoodId, string> = {
  energie: "pojila", // ta energie
  napeti: "pojilo", // to napětí
  klid: "pojil", // ten klid
  utlum: "pojil", // ten útlum
};

/* instrumentál vestavěných štítků („se školou“); vlastní štítky dostávají
   obecný tvar „se štítkem „X““ — skloňování neznámých slov negenerujeme */
const TAG_INSTRUMENTAL: Record<string, string> = {
  práce: "s prací",
  škola: "se školou",
  rodina: "s rodinou",
  vztahy: "se vztahy",
  spánek: "se spánkem",
  zdraví: "se zdravím",
  počasí: "s počasím",
};

const tagPhrase = (tag: string): string => TAG_INSTRUMENTAL[tag] ?? `se štítkem „${tag}“`;

const topOf = (counts: Map<string, number>): [string, number] | null => {
  let best: [string, number] | null = null;
  for (const [key, n] of counts) if (!best || n > best[1]) best = [key, n];
  return best;
};

function countBy<T>(items: T[], key: (item: T) => string | null): Map<string, number> {
  const counts = new Map<string, number>();
  for (const item of items) {
    const k = key(item);
    if (k === null) continue;
    counts.set(k, (counts.get(k) ?? 0) + 1);
  }
  return counts;
}

/** Část dne podle hodiny zápisu: ráno < 12, odpoledne 12–17, večer ≥ 18. */
export function daypartOf(time: string): "ráno" | "odpoledne" | "večer" {
  const hour = Number.parseInt(time, 10);
  if (Number.isNaN(hour) || hour < 12) return "ráno";
  if (hour < 18) return "odpoledne";
  return "večer";
}

/** (a) Nejčastější stav a slova období. */
function frequentInsight(entries: Entry[], periodLabel: string): Insight | null {
  if (entries.length < INSIGHT_MIN_OCCURRENCES) return null;
  const topMood = topOf(countBy(entries, (e) => e.mood));
  if (!topMood) return null;
  const mood = MOOD_BY_ID[topMood[0] as MoodId];
  const words = topOf(
    countBy(
      entries.filter((e) => e.mood === mood.id).flatMap((e) => e.words),
      (w) => w,
    ),
  );
  const wordsPart = words ? ` — nejčastěji se slovem „${words[0]}“` : "";
  return {
    id: "frequent",
    text: `${periodLabel} se nejčastěji objevuje ${mood.name.toLowerCase()}${wordsPart}.`,
  };
}

/** (b) Ko-výskyt štítek × stav, jen při ≥ 3 výskytech kombinace. */
function tagMoodInsight(entries: Entry[], periodLabel: string): Insight | null {
  const pairs = countBy(
    entries.flatMap((e) => e.tags.map((t) => ({ mood: e.mood, tag: t }))),
    (p) => `${p.mood} ${p.tag}`,
  );
  const top = topOf(pairs);
  if (!top || top[1] < INSIGHT_MIN_OCCURRENCES) return null;
  // štítek může obsahovat mezery — klíč se dělí jen na prvním oddělovači
  const sep = top[0].indexOf(" ");
  const moodId = top[0].slice(0, sep) as MoodId;
  const tag = top[0].slice(sep + 1);
  const mood = MOOD_BY_ID[moodId];
  return {
    id: "tag-mood",
    text: `${mood.name} se ti ${periodLabel.toLowerCase()} nejčastěji ${MOOD_VERB[moodId]} ${tagPhrase(tag)}.`,
  };
}

/** (c) Vzorec denní doby (ráno/odpoledne/večer × stav), práh ≥ 3. */
function daypartInsight(entries: Entry[]): Insight | null {
  const pairs = countBy(entries, (e) => `${daypartOf(e.time)} ${e.mood}`);
  const top = topOf(pairs);
  if (!top || top[1] < INSIGHT_MIN_OCCURRENCES) return null;
  const [daypart, moodId] = top[0].split(" ") as [string, MoodId];
  const daypartCap = daypart.charAt(0).toUpperCase() + daypart.slice(1);
  return {
    id: "daypart",
    text: `${daypartCap} se nejčastěji objevuje ${MOOD_BY_ID[moodId].name.toLowerCase()}.`,
  };
}

/** Max 3 nálezy v pořadí: nejčastější stav, štítek×stav, denní doba. */
export function computeInsights(entries: Entry[], periodLabel = "Tenhle měsíc"): Insight[] {
  const found = [
    frequentInsight(entries, periodLabel),
    tagMoodInsight(entries, periodLabel),
    daypartInsight(entries),
  ].filter((i): i is Insight => i !== null);
  return found.slice(0, 3);
}
