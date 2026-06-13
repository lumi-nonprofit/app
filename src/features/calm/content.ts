/* Klid — manifest aktivit. Jediný zdroj pravdy pro seznam na obrazovce Klid
   i pro přehrávač (app/calm/[id]). Audio soubory zatím v repu nejsou — po
   dodání stačí doplnit `file` podle assets/audio/README.md, nic dalšího. */
import type { BadgeTone } from "../../ds/Badge";

export interface CalmActivity {
  id: string;
  title: string;
  subtitle: string;
  /** Orientační délka v minutách — zdroj pro „zbývá X min“ v přehrávači. */
  minutes: number;
  /** Audio zatím není — soubor doplní Anna:
      `file: require("../../../assets/audio/<id>.m4a")`. */
  file: number | null;
  /** mixWithOthers pro krátká cvičení (hudba uživatele hraje dál),
      duckOthers pro vedené meditace (hudbu jen ztiší, nezastaví). */
  audioMode: "mix" | "duck";
  kind: "breath" | "audio" | "blind";
  /** Stavový pill v seznamu i přehrávači: [tón, text]. */
  badge?: [BadgeTone, string];
}

export const CALM_ACTIVITIES: readonly CalmActivity[] = [
  {
    id: "dech-478",
    title: "Dech 4-7-8",
    subtitle: "Při napětí a úzkosti",
    minutes: 3,
    file: null,
    audioMode: "mix",
    kind: "breath",
    badge: ["accent", "3 min"],
  },
  {
    id: "ticha-louka",
    title: "Tichá louka",
    subtitle: "Vedená meditace · čeština",
    minutes: 10,
    file: null,
    audioMode: "duck",
    kind: "audio",
    badge: ["accent", "10 min"],
  },
  {
    /* lilac je v DS vyhrazený pro spánek/večer */
    id: "vecerka",
    title: "Večerka",
    subtitle: "Zvuky a audio na dobrou noc",
    minutes: 12,
    file: null,
    audioMode: "duck",
    kind: "audio",
    badge: ["lilac", "večer"],
  },
  {
    /* Dech naslepo — rytmus vedou vibrace, displej netřeba (telefon v kapse). */
    id: "dech-naslepo",
    title: "Dech naslepo",
    subtitle: "Telefon v kapse — vedeme tě vibracemi",
    minutes: 3,
    file: null,
    audioMode: "mix",
    kind: "blind",
    badge: ["info", "poslepu"],
  },
];

/** Aktivita podle id z routy; neznámé id → undefined (přehrávač přesměruje zpět na Klid). */
export const byId = (id: string | undefined): CalmActivity | undefined =>
  CALM_ACTIVITIES.find((a) => a.id === id);
