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
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Redirect, useLocalSearchParams, useRouter } from "expo-router";
import { setAudioModeAsync, useAudioPlayer, useAudioPlayerStatus } from "expo-audio";
import { Badge, Icon, IconButton } from "../../ds/index";
import Screen from "../../components/Screen";
import { haptics } from "../../lib/haptics";
import { byId, type CalmActivity } from "./content";
import BlindBreathScreen from "./BlindBreathScreen";
import { colors, font, leading, palette, radius, tracking, type } from "../../theme";

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

/* ---------- společné kusy ---------- */

/** Horní řádek: zpět + kicker (vzor MeasureScreen). */
function TopBar() {
  const router = useRouter();
  return (
    <View style={styles.topRow}>
      <IconButton
        icon="arrow-left"
        label="Zpět na Klid"
        accessibilityHint="Vrátí se na obrazovku Klid."
        onPress={() => {
          /* po deep linku nemusí být kam couvnout — pak na Klid napřímo */
          if (router.canGoBack()) router.back();
          else router.replace("/calm");
        }}
      />
      <Text style={styles.kicker}>Klid</Text>
    </View>
  );
}

/** Hlavička aktivity: badge(y) + titulek + podtitulek. */
function ActivityHead({ activity, extraBadge }: { activity: CalmActivity; extraBadge?: string }) {
  return (
    <View style={styles.headBlock}>
      <View style={styles.badgeRow}>
        {activity.badge ? <Badge tone={activity.badge[0]}>{activity.badge[1]}</Badge> : null}
        {extraBadge ? <Badge tone="neutral">{extraBadge}</Badge> : null}
      </View>
      <Text accessibilityRole="header" style={styles.title}>
        {activity.title}
      </Text>
      <Text style={styles.subtitle}>{activity.subtitle}</Text>
    </View>
  );
}

interface PlayButtonProps {
  label: string;
  hint?: string;
  disabled?: boolean;
  onPress?: () => void;
}

/** Hlavní play/pause tlačítko — vzhled LumiCTA, navíc accessibilityHint.
    Disabled stav: obrys + inkoustový text na zapuštěném podkladu (ne opacita). */
function PlayButton({ label, hint, disabled, onPress }: PlayButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={hint}
      accessibilityState={{ disabled: !!disabled }}
      onPress={disabled ? undefined : onPress}
      style={({ pressed }) => [
        styles.playBtn,
        disabled && styles.playBtnDisabled,
        pressed && !disabled && styles.playBtnPressed,
      ]}
    >
      <Text style={[styles.playLabel, disabled && styles.playLabelDisabled]}>{label}</Text>
    </Pressable>
  );
}

/** Progres: text nese informaci (informace nikdy jen barvou), pruh je pro čtečky dekorativní. */
function ProgressBlock({ text, fraction }: { text: string; fraction: number }) {
  return (
    <View style={styles.progressBlock}>
      <Text style={styles.progressText}>{text}</Text>
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
  }, [running, phase.label]);

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
      <TopBar />
      <ActivityHead activity={activity} />

      <View style={styles.centerBlock}>
        {finished ? (
          <>
            <Text accessibilityLiveRegion="polite" style={styles.phaseLabel}>
              Hotovo
            </Text>
            <Text style={styles.phaseHint}>Díky za chvilku klidu.</Text>
          </>
        ) : (
          <>
            <Text accessibilityLiveRegion="polite" style={styles.phaseLabel}>
              {phase.label}
            </Text>
            {/* vteřinový odpočet je pro čtečku skrytý — rytmus hlásí změna fáze výš */}
            <Text
              accessibilityElementsHidden
              importantForAccessibility="no-hide-descendants"
              style={styles.phaseCount}
            >
              {phase.remaining}
            </Text>
            <Text style={styles.phaseHint}>4 s nádech · 7 s zádrž · 8 s výdech</Text>
          </>
        )}
      </View>

      <ProgressBlock
        text={finished ? "Konec cvičení" : remainingText(total - elapsed)}
        fraction={elapsed / total}
      />
      <PlayButton
        label={ctaLabel}
        hint={ctaHint}
        onPress={() => {
          if (finished) {
            elapsedRef.current = 0;
            setElapsed(0);
            setRunning(true);
          } else {
            setRunning((r) => !r);
          }
        }}
      />
    </Screen>
  );
}

/* ---------- audio bez souboru: „připravujeme“ ---------- */

function ComingSoon({ activity }: { activity: CalmActivity }) {
  return (
    <Screen>
      <TopBar />
      <ActivityHead activity={activity} extraBadge="připravujeme" />

      <View style={styles.centerBlock}>
        <View style={styles.iconCircle}>
          <Icon name="audio-lines" size={26} color={colors.textMuted} />
        </View>
        <Text style={styles.comingText}>Audio připravujeme — brzy si ho tu pustíš.</Text>
      </View>

      <PlayButton label="Přehrát" disabled hint="Audio zatím není k dispozici." />
    </Screen>
  );
}

/* ---------- audio se souborem (až bude v repu) ---------- */

function AudioPlayer({ activity, file }: { activity: CalmActivity; file: number }) {
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
      <TopBar />
      <ActivityHead activity={activity} />

      <View style={styles.centerBlock}>
        <View style={styles.iconCircle}>
          <Icon name="audio-lines" size={26} color={colors.textMuted} />
        </View>
      </View>

      <ProgressBlock
        text={status.isLoaded ? remainingText(duration - status.currentTime) : "Načítá se…"}
        fraction={duration > 0 ? status.currentTime / duration : 0}
      />
      <PlayButton
        label={playing ? "Pozastavit" : "Přehrát"}
        hint={
          playing
            ? "Pozastaví audio, postup zůstane."
            : activity.audioMode === "mix"
              ? "Spustí audio. Hudba z jiných aplikací hraje dál."
              : "Spustí audio. Hudba z jiných aplikací se po dobu přehrávání ztiší."
        }
        onPress={toggle}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  topRow: { flexDirection: "row", alignItems: "center", gap: 8, marginHorizontal: -6 },
  kicker: {
    ...font.body(600),
    fontSize: type.xxs,
    letterSpacing: tracking.label(type.xxs),
    textTransform: "uppercase",
    color: palette.ink700,
  },

  headBlock: { alignItems: "center", gap: 10, marginTop: 10 },
  badgeRow: { flexDirection: "row", gap: 8 },
  title: {
    ...font.display(700),
    fontSize: type.xl,
    lineHeight: leading.tight(type.xl),
    letterSpacing: tracking.display(type.xl),
    color: colors.textStrong,
    textAlign: "center",
  },
  subtitle: {
    ...font.body(400),
    fontSize: type.base,
    lineHeight: leading.body(type.base),
    color: colors.textMuted,
    textAlign: "center",
  },

  /* střed obrazovky: fáze dechu / stav audia */
  centerBlock: {
    flexGrow: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    paddingVertical: 24,
  },
  phaseLabel: {
    ...font.display(700),
    fontSize: type.xxl,
    lineHeight: leading.tight(type.xxl),
    letterSpacing: tracking.display(type.xxl),
    color: colors.textStrong,
  },
  phaseCount: {
    ...font.display(600),
    fontSize: type.xxxl,
    lineHeight: leading.tight(type.xxxl),
    color: colors.textStrong,
  },
  phaseHint: {
    ...font.body(400),
    fontSize: type.sm,
    lineHeight: leading.body(type.sm),
    color: colors.textMuted,
    marginTop: 8,
    textAlign: "center",
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.surfaceSunken,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },
  comingText: {
    ...font.body(400),
    fontSize: type.base,
    lineHeight: leading.body(type.base),
    color: colors.textBody,
    textAlign: "center",
  },

  progressBlock: { gap: 6 },
  progressText: { ...font.body(600), fontSize: type.sm, color: palette.ink700 },
  progressTrack: {
    height: 6,
    borderRadius: radius.pill,
    backgroundColor: palette.cream200,
    overflow: "hidden",
  },
  progressFill: { height: 6, borderRadius: radius.pill, backgroundColor: palette.sun500 },

  /* play/pause — vzhled LumiCTA; disabled bez opacity */
  playBtn: {
    minHeight: 52,
    borderRadius: radius.pill,
    borderWidth: 1.5,
    borderColor: "transparent",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surfaceInk,
  },
  playBtnDisabled: { backgroundColor: colors.surfaceSunken, borderColor: colors.borderStrong },
  playBtnPressed: { transform: [{ scale: 0.98 }] },
  playLabel: { ...font.body(600), fontSize: type.md, color: colors.textOnInk },
  playLabelDisabled: { color: palette.ink700 },
});
