/* The player of the Calm activities (app/calm/[id]). The manifest gives 3 forms:

   1. "breath" ("Dech 4-7-8") works without audio: timed phases of 4 s inhale, 7 s hold and
      8 s exhale, a large phase label with a countdown, the total progress and "X min left".
      There is no animation (the phase is text and a bar), so Reduce Motion needs no extra branch.
   2. "audio" without a file: the state with the badge "připravujeme" and a disabled play button
      (disabled is an outline and ink on a sunken surface, never opacity).
   3. "audio" with a file (when Anna adds it): the expo-audio player. The player sets the audio
      session mode just before playback: "mix" lets the music of the user play on, "duck" only
      makes it quieter while the audio plays. */
import React from "react";
import { View } from "react-native";
import { Redirect, useLocalSearchParams } from "expo-router";
import { setAudioModeAsync, useAudioPlayer, useAudioPlayerStatus } from "expo-audio";
import type { TFunction } from "i18next";
import { Badge, Button, Icon, Text } from "../../ds";
import { breathPhaseLabel, type BreathPhase } from "../../components/Breath";
import Screen from "../../components/Screen";
import { useTranslation } from "../../i18n";
import { announce } from "../../lib/a11y";
import { haptics } from "../../lib/haptics";
import { byId, type CalmActivity } from "./content";
import BlindBreathScreen from "./BlindBreathScreen";
import { createThemedStyles, useTheme } from "../../theme";

export default function PlayerScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const activity = byId(typeof id === "string" ? id : undefined);
  if (!activity) return <Redirect href="/calm" />;
  // The key: a change of the route parameter must give the player a clean state.
  if (activity.kind === "blind") return <BlindBreathScreen key={activity.id} activity={activity} />;
  if (activity.kind === "breath") return <BreathPlayer key={activity.id} activity={activity} />;
  if (activity.file === null) return <ComingSoon key={activity.id} activity={activity} />;
  return <AudioPlayer key={activity.id} activity={activity} file={activity.file} />;
}

/* ---------- shared pieces (the native header of the full-screen modal carries the title "Klid"
   and the Close item, see app/_layout) ---------- */

/** The head of an activity: the badges, the title and the subtitle. */
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

/** The progress. The text carries the information (never colour alone); the bar is decorative
    for screen readers. */
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

/** "X min left": the minutes round up, and under one minute the text stays at "1 min". */
const remainingText = (t: TFunction<"calm">, remainingSeconds: number): string =>
  t("player.remaining", { count: Math.max(1, Math.ceil(remainingSeconds / 60)) });

/* ---------- "Dech 4-7-8" (without audio) ---------- */

const PHASES: readonly { id: BreathPhase; seconds: number }[] = [
  { id: "inhale", seconds: 4 },
  { id: "hold", seconds: 7 },
  { id: "exhale", seconds: 8 },
];
const CYCLE_SECONDS = 19;

/** The phase and the seconds that remain in it, for the elapsed time. */
const phaseAt = (elapsed: number): { id: BreathPhase; remaining: number } => {
  let t = elapsed % CYCLE_SECONDS;
  for (const p of PHASES) {
    if (t < p.seconds) return { id: p.id, remaining: p.seconds - t };
    t -= p.seconds;
  }
  /* Not reachable (t is less than 19). The return satisfies TypeScript. */
  return { id: PHASES[0].id, remaining: PHASES[0].seconds };
};

function BreathPlayer({ activity }: { activity: CalmActivity }) {
  const { t } = useTranslation(["calm", "common"]);
  const styles = useStyles();
  const total = activity.minutes * 60;
  const [elapsed, setElapsed] = React.useState(0);
  const [running, setRunning] = React.useState(false);
  /* A mirror of `elapsed` for the interval callback: the callback handles the end, not an effect. */
  const elapsedRef = React.useRef(0);
  const finished = elapsed >= total;
  const phase = phaseAt(elapsed);
  const phaseLabel = breathPhaseLabel(t, phase.id);

  /* The tick of one second: the phase and the total progress derive from `elapsed`. The end stops
     the timer and confirms with haptics: no call to repeat, no pressure. */
  React.useEffect(() => {
    if (!running) return;
    const timer = setInterval(() => {
      const next = Math.min(elapsedRef.current + 1, total);
      elapsedRef.current = next;
      setElapsed(next);
      if (next >= total) {
        setRunning(false);
        haptics.success();
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [running, total]);

  /* Haptics at the start of the inhale (Light) and of the exhale (Medium). As in LumiBreath, they
     also fire at a start or a resume, which confirms the current phase. */
  React.useEffect(() => {
    if (!running) return;
    if (phase.id === "inhale") haptics.inhale();
    else if (phase.id === "exhale") haptics.exhale();
    announce(phaseLabel);
  }, [running, phase.id, phaseLabel]);

  /* The screen reader announces the end of the exercise (iOS has no live region). */
  React.useEffect(() => {
    if (finished) announce(t("player.done.announce"));
  }, [finished, t]);

  const ctaLabel = finished
    ? t("actions.restart")
    : running
      ? t("actions.pause")
      : elapsed > 0
        ? t("common:actions.continue")
        : t("actions.start");
  const ctaHint = finished
    ? t("breath478.restart.a11yHint")
    : running
      ? t("breath478.pause.a11yHint")
      : t("breath478.start.a11yHint");

  return (
    <Screen>
      <ActivityHead activity={activity} />

      <View style={styles.centerBlock}>
        {finished ? (
          <>
            <Text variant="title1" align="center">
              {t("player.done.title")}
            </Text>
            <Text variant="footnote" color="textMuted" align="center" style={styles.phaseHint}>
              {t("player.done.text")}
            </Text>
          </>
        ) : (
          <>
            <Text variant="title1" align="center">
              {phaseLabel}
            </Text>
            {/* The screen reader does not get the countdown in seconds; the change of phase above
                gives the rhythm. */}
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
              {t("breath478.hint")}
            </Text>
          </>
        )}
      </View>

      <ProgressBlock
        text={finished ? t("player.finished") : remainingText(t, total - elapsed)}
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

/* ---------- audio without a file: the badge "připravujeme" ---------- */

function ComingSoon({ activity }: { activity: CalmActivity }) {
  const { t } = useTranslation("calm");
  const theme = useTheme();
  const styles = useStyles();
  return (
    <Screen>
      <ActivityHead activity={activity} extraBadge={t("comingSoon.badge")} />

      <View style={styles.centerBlock}>
        <View style={styles.iconCircle}>
          <Icon name="audio-lines" size={26} color={theme.colors.textOnSunken} />
        </View>
        <Text variant="body" align="center">
          {t("comingSoon.text")}
        </Text>
      </View>

      <Button size="lg" fullWidth disabled accessibilityHint={t("comingSoon.play.a11yHint")}>
        {t("actions.play")}
      </Button>
    </Screen>
  );
}

/* ---------- audio with a file (when the repository has one) ---------- */

function AudioPlayer({ activity, file }: { activity: CalmActivity; file: number }) {
  const { t } = useTranslation("calm");
  const theme = useTheme();
  const styles = useStyles();
  const player = useAudioPlayer(file);
  const status = useAudioPlayerStatus(player);

  /* Until the metadata arrives, the manifest gives the estimate of the length. */
  const duration = status.duration > 0 ? status.duration : activity.minutes * 60;
  const playing = status.playing;

  const toggle = async (): Promise<void> => {
    if (playing) {
      player.pause();
      return;
    }
    /* The player sets the audio session mode just before playback; outside playback it does not
       touch the music of the user. "mix" lets the music play on, "duck" only makes it quieter;
       never `doNotMix`. */
    try {
      await setAudioModeAsync({
        playsInSilentMode: true,
        interruptionMode: activity.audioMode === "mix" ? "mixWithOthers" : "duckOthers",
      });
    } catch {
      /* A wrong mode must not block playback. */
    }
    /* After the end, playback starts again from the start. */
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
        text={
          status.isLoaded ? remainingText(t, duration - status.currentTime) : t("player.loading")
        }
        fraction={duration > 0 ? status.currentTime / duration : 0}
      />
      <Button
        size="lg"
        fullWidth
        accessibilityHint={
          playing
            ? t("audio.pause.a11yHint")
            : activity.audioMode === "mix"
              ? t("audio.playMix.a11yHint")
              : t("audio.playDuck.a11yHint")
        }
        onPress={toggle}
      >
        {playing ? t("actions.pause") : t("actions.play")}
      </Button>
    </Screen>
  );
}

const useStyles = createThemedStyles((t) => ({
  headBlock: { alignItems: "center", gap: 10, marginTop: 10 },
  badgeRow: { flexDirection: "row", flexWrap: "wrap", justifyContent: "center", gap: 8 },

  /* The centre of the screen: the breath phase or the audio state. */
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
