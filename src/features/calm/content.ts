/* Calm: the list of activities. The single source for the Calm screen and for the player
   (app/calm/[id]). The text comes from the message catalog (content.json, key
   `calmActivities.<id>`). The audio files are not in the repository yet: add `file` as
   assets/audio/README.md describes, nothing else. */
import type { BadgeTone } from "../../ds/Badge";
import { contentText } from "../../i18n/content";

export type CalmActivityId = "dech-478" | "ticha-louka" | "vecerka" | "dech-naslepo";

export interface CalmActivity {
  id: CalmActivityId;
  readonly title: string;
  readonly subtitle: string;
  /** The length in minutes, the source of "X min left" in the player. */
  minutes: number;
  /** No audio yet. Anna adds the file: `file: require("../../../assets/audio/<id>.m4a")`. */
  file: number | null;
  /** mixWithOthers for short exercises (the music of the user plays on),
      duckOthers for guided meditations (the music gets quieter, it does not stop). */
  audioMode: "mix" | "duck";
  kind: "breath" | "audio" | "blind";
  /** The status pill in the list and in the player: [tone, text]. */
  readonly badge?: [BadgeTone, string];
}

function activity(
  id: CalmActivityId,
  data: Omit<CalmActivity, "id" | "title" | "subtitle" | "badge"> & { badgeTone: BadgeTone },
): CalmActivity {
  const { badgeTone, ...rest } = data;
  return {
    id,
    ...rest,
    get title() {
      return contentText(`calmActivities.${id}.title`);
    },
    get subtitle() {
      return contentText(`calmActivities.${id}.subtitle`);
    },
    get badge(): [BadgeTone, string] {
      return [badgeTone, contentText(`calmActivities.${id}.badge`)];
    },
  };
}

export const CALM_ACTIVITIES: readonly CalmActivity[] = [
  activity("dech-478", {
    minutes: 3,
    file: null,
    audioMode: "mix",
    kind: "breath",
    badgeTone: "accent",
  }),
  activity("ticha-louka", {
    minutes: 10,
    file: null,
    audioMode: "duck",
    kind: "audio",
    badgeTone: "accent",
  }),
  /* the DS reserves lilac for sleep and evening */
  activity("vecerka", {
    minutes: 12,
    file: null,
    audioMode: "duck",
    kind: "audio",
    badgeTone: "lilac",
  }),
  /* Blind breath: vibrations give the rhythm, no display needed (the phone in a pocket). */
  activity("dech-naslepo", {
    minutes: 3,
    file: null,
    audioMode: "mix",
    kind: "blind",
    badgeTone: "info",
  }),
];

/** The activity of a route id; an unknown id gives undefined (the player goes back to Calm). */
export const byId = (id: string | undefined): CalmActivity | undefined =>
  CALM_ACTIVITIES.find((a) => a.id === id);
