/* Přehrávač aktivit Klidu (app/calm/[id]) — tři podoby podle manifestu:

   1. „breath“ (Dech 4-7-8): funguje úplně bez audia — časované fáze
      Nádech 4 s / Zádrž 7 s / Výdech 8 s, velký label fáze + odpočet,
      celkový progres a „zbývá X min“. Bez animace (fáze textově + pruh),
      takže redukce pohybu nepotřebuje zvláštní větev.
   2. „audio“ bez souboru: stav „připravujeme“ s nefunkčním play tlačítkem
      (disabled = obrys + inkoust na zapuštěném podkladu, nikdy opacita).
   3. „audio“ se souborem (až ho Anna dodá): expo-audio přehrávač; režim
      audio session se nastavuje až těsně před přehráním — „mix“ nechá hudbu
      uživatele hrát dál, „duck“ ji po dobu přehrávání jen ztiší. */
import React from "react";
import { View } from "react-native";
import { Redirect, useLocalSearchParams } from "expo-router";
import { setAudioModeAsync, useAudioPlayer, useAudioPlayerStatus } from "expo-audio";
import { Badge, Button, Icon, Text } from "../../ds";
import Screen from "../../components/Screen";
import { announce } from "../../lib/a11y";
import { haptics } from "../../lib/haptics";
import { byId, type CalmActivity } from "./content";
import BlindBreathScreen from "./BlindBreathScreen";
import { createThemedStyles, useTheme } from "../../theme";

export default function PlayerScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const activity = byId(typeof id === "string" ? id : undefined);
  if (!activity) return <Redirect href="/calm" />;
  // key: změna parametru routy musí znamenat čistý stav přehrávače
  if (activity.kind === "blind") return <BlindBreathScreen key={activity.id} activity={activity} />;
  if (activity.kind === "breath") return <BreathPlayer key={activity.id} activity={activity} />;
  if (activity.file === null) return <ComingSoon key={activity.id} activity={activity} />;
  return <AudioPlayer key={activity.id} activity={activity} file={activity.file} />;
}

/* ---------- společné kusy (titulek „Klid“ a Zavřít nese nativní hlavička
   celoobrazovkového modalu, viz app/_layout) ---------- */

/** Hlavička aktivity: badge(y) + titulek + podtitulek. */
function ActivityHead({ activity, extraBadge }: { activity: CalmActivity; extraBadge?: string }) {
  const styles = useStyles();
  return (
    <View style={styles.headBlock}>
      <View style={styles.badgeRow}>
        {activity.badge ? <Badge tone={activity.badge[0]}>{activity.badge[1]}</Badge> : null}
        {extraBadge ? <Badge tone="neutral">{extraBadge}</Badge> : null}
      </View>
      <Text accessibilityRole="header" variant="title1" align="center">
        {activity.title}
      </Text>
      <Text variant="body" color="textMuted" align="center">
        {activity.subtitle}
      </Text>
    </View>
  );
}

/** Progres: text nese informaci (informace nikdy jen barvou), pruh je pro čtečky dekorativní. */
function ProgressBlock({ text, fraction }: { text: string; fraction: number }) {
  const styles = useStyles();
  return (
    <View style={styles.progressBlock}>
      <Text variant="footnote" weight="semibold" color="textMuted">
        {text}
      </Text>
      <View
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        style={styles.progressTrack}
      >
        <View
          style={[styles.progressFill, { width: `${Math.min(100, Math.max(0, fraction) * 100)}%` }]}
        />
      </View>
    </View>
  );
}

/** „Zbývá X min“ — zaokrouhlujeme nahoru, pod minutu držíme „1 min“. */
const remainingText = (remainingSeconds: number): string =>
  `Zbývá ${Math.max(1, Math.ceil(remainingSeconds / 60))} min`;

/* ---------- Dech 4-7-8 (bez audia) ---------- */

const PHASES = [
  { label: "Nádech", seconds: 4 },
  { label: "Zádrž", seconds: 7 },
  { label: "Výdech", seconds: 8 },
] as const;
const CYCLE_SECONDS = 19;

type PhaseLabel = (typeof PHASES)[number]["label"];

/** Fáze a zbývající vteřiny fáze pro daný odehraný čas. */
const phaseAt = (elapsed: number): { label: PhaseLabel; remaining: number } => {
  let t = elapsed % CYCLE_SECONDS;
  for (const p of PHASES) {
    if (t < p.seconds) return { label: p.label, remaining: p.seconds - t };
    t -= p.seconds;
  }
  /* nedosažitelné (t < 19) — pojistka pro TS */
  return { label: PHASES[0].label, remaining: PHASES[0].seconds };
};

function BreathPlayer({ activity }: { activity: CalmActivity }) {
  const styles = useStyles();
  const total = activity.minutes * 60;
  const [elapsed, setElapsed] = React.useState(0);
  const [running, setRunning] = React.useState(false);
  /* zrcadlo elapsed pro intervalový callback (konec se řeší tam, ne v efektu) */
  const elapsedRef = React.useRef(0);
  const finished = elapsed >= total;
  const phase = phaseAt(elapsed);

  /* vteřinový tik — fáze i celkový progres se odvozují z `elapsed`;
     konec zastaví a potvrdí haptikou — žádná výzva k opakování, žádný tlak */
  React.useEffect(() => {
    if (!running) return;
    const t = setInterval(() => {
      const next = Math.min(elapsedRef.current + 1, total);
      elapsedRef.current = next;
      setElapsed(next);
      if (next >= total) {
        setRunning(false);
        haptics.success();
      }
    }, 1000);
    return () => clearInterval(t);
  }, [running, total]);

  /* haptika na začátku nádechu (Light) a výdechu (Medium); jako u LumiBreath
     se ozve i při spuštění/pokračování — potvrdí aktuální fázi */
  React.useEffect(() => {
    if (!running) return;
    if (phase.label === "Nádech") haptics.inhale();
    else if (phase.label === "Výdech") haptics.exhale();
    announce(phase.label);
  }, [running, phase.label]);

  /* konec cvičení oznámí čtečka (iOS nemá live region) */
  React.useEffect(() => {
    if (finished) announce("Hotovo. Díky za chvilku klidu.");
  }, [finished]);

  const ctaLabel = finished
    ? "Začít znovu"
    : running
      ? "Pozastavit"
      : elapsed > 0
        ? "Pokračovat"
        : "Začít";
  const ctaHint = finished
    ? "Spustí cvičení znovu od začátku."
    : running
      ? "Pozastaví cvičení, postup zůstane."
      : "Spustí dechové cvičení: 4 vteřiny nádech, 7 zádrž, 8 výdech.";

  return (
    <Screen>
      <ActivityHead activity={activity} />

      <View style={styles.centerBlock}>
        {finished ? (
          <>
            <Text variant="title1" align="center">
              Hotovo
            </Text>
            <Text variant="footnote" color="textMuted" align="center" style={styles.phaseHint}>
              Díky za chvilku klidu.
            </Text>
          </>
        ) : (
          <>
            <Text variant="title1" align="center">
              {phase.label}
            </Text>
            {/* vteřinový odpočet je pro čtečku skrytý — rytmus hlásí změna fáze výš */}
            <Text
              accessibilityElementsHidden
              importantForAccessibility="no-hide-descendants"
              variant="display"
              tabular
              align="center"
            >
              {phase.remaining}
            </Text>
            <Text variant="footnote" color="textMuted" align="center" style={styles.phaseHint}>
              4 s nádech · 7 s zádrž · 8 s výdech
            </Text>
          </>
        )}
      </View>

      <ProgressBlock
        text={finished ? "Konec cvičení" : remainingText(total - elapsed)}
        fraction={elapsed / total}
      />
      <Button
        size="lg"
        fullWidth
        accessibilityHint={ctaHint}
        onPress={() => {
          if (finished) {
            elapsedRef.current = 0;
            setElapsed(0);
            setRunning(true);
          } else {
            setRunning((r) => !r);
          }
        }}
      >
        {ctaLabel}
      </Button>
    </Screen>
  );
}

/* ---------- audio bez souboru: „připravujeme“ ---------- */

function ComingSoon({ activity }: { activity: CalmActivity }) {
  const theme = useTheme();
  const styles = useStyles();
  return (
    <Screen>
      <ActivityHead activity={activity} extraBadge="připravujeme" />

      <View style={styles.centerBlock}>
        <View style={styles.iconCircle}>
          <Icon name="audio-lines" size={26} color={theme.colors.textOnSunken} />
        </View>
        <Text variant="body" align="center">
          Audio připravujeme — brzy si ho tu pustíš.
        </Text>
      </View>

      <Button size="lg" fullWidth disabled accessibilityHint="Audio zatím není k dispozici.">
        Přehrát
      </Button>
    </Screen>
  );
}

/* ---------- audio se souborem (až bude v repu) ---------- */

function AudioPlayer({ activity, file }: { activity: CalmActivity; file: number }) {
  const theme = useTheme();
  const styles = useStyles();
  const player = useAudioPlayer(file);
  const status = useAudioPlayerStatus(player);

  /* dokud metadata nedoběhnou, délku odhadujeme z manifestu */
  const duration = status.duration > 0 ? status.duration : activity.minutes * 60;
  const playing = status.playing;

  const toggle = async (): Promise<void> => {
    if (playing) {
      player.pause();
      return;
    }
    /* Režim audio session se nastavuje až těsně před přehráním — mimo
       přehrávání na hudbu uživatele nesaháme. „mix“ ji nechá hrát dál,
       „duck“ ji jen ztiší; nikdy doNotMix. */
    try {
      await setAudioModeAsync({
        playsInSilentMode: true,
        interruptionMode: activity.audioMode === "mix" ? "mixWithOthers" : "duckOthers",
      });
    } catch {
      /* špatně nastavený režim nesmí zablokovat přehrání */
    }
    /* po dohrání začínáme znovu od začátku */
    if (status.duration > 0 && status.currentTime >= status.duration) {
      await player.seekTo(0).catch(() => {});
    }
    player.play();
  };

  return (
    <Screen>
      <ActivityHead activity={activity} />

      <View style={styles.centerBlock}>
        <View style={styles.iconCircle}>
          <Icon name="audio-lines" size={26} color={theme.colors.textOnSunken} />
        </View>
      </View>

      <ProgressBlock
        text={status.isLoaded ? remainingText(duration - status.currentTime) : "Načítá se…"}
        fraction={duration > 0 ? status.currentTime / duration : 0}
      />
      <Button
        size="lg"
        fullWidth
        accessibilityHint={
          playing
            ? "Pozastaví audio, postup zůstane."
            : activity.audioMode === "mix"
              ? "Spustí audio. Hudba z jiných aplikací hraje dál."
              : "Spustí audio. Hudba z jiných aplikací se po dobu přehrávání ztiší."
        }
        onPress={toggle}
      >
        {playing ? "Pozastavit" : "Přehrát"}
      </Button>
    </Screen>
  );
}

const useStyles = createThemedStyles((t) => ({
  headBlock: { alignItems: "center", gap: 10, marginTop: 10 },
  badgeRow: { flexDirection: "row", flexWrap: "wrap", justifyContent: "center", gap: 8 },

  /* střed obrazovky: fáze dechu / stav audia */
  centerBlock: {
    flexGrow: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    paddingVertical: 24,
  },
  phaseHint: { marginTop: 8 },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: t.colors.surfaceSunken,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },

  progressBlock: { gap: 6 },
  progressTrack: {
    height: 6,
    borderRadius: t.radius.pill,
    backgroundColor: t.colors.borderSubtle,
    overflow: "hidden",
  },
  progressFill: { height: 6, borderRadius: t.radius.pill, backgroundColor: t.colors.accentFill },
}));
