/* Blind breath: the vibrations give the rhythm of the breath, so the display is not needed. The
   phone can stay in a pocket: a strong pulse starts the inhale, a double pulse starts the exhale,
   and the 4-7-8 rhythm adds a soft tick in the middle of the hold (the logic is in
   blindRhythm.ts). The screen has 4 stages (the ids are in `Stage`):

     `setup`     - the choice of the rhythm and of the length,
     `countdown` - 3, 2, 1, time to hide the phone,
     the run     - a full-screen dark surface and only vibrations; a double tap ends it,
     `done`      - a short confirmation and the offer to repeat.

   The timer runs in an interval with a mirror in a ref (the callback handles the end, not an
   effect), the same pattern as BreathPlayer in PlayerScreen. */
import React from "react";
import { Pressable, View, type GestureResponderEvent } from "react-native";
import { Stack, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useKeepAwake } from "expo-keep-awake";
import type { TFunction } from "i18next";
import { Button, RadioRow, Text } from "../../ds";
import Screen from "../../components/Screen";
import { useTranslation } from "../../i18n";
import { announce } from "../../lib/a11y";
import { haptics } from "../../lib/haptics";
import type { CalmActivity } from "./content";
import {
  BLIND_DURATIONS_MIN,
  BLIND_RHYTHM_IDS,
  blindEventAt,
  type BlindRhythmId,
} from "./blindRhythm";
import { createThemedStyles, darkTheme } from "../../theme";

type Stage = "setup" | "countdown" | "running" | "done";

/* A double tap: a second touch within 350 ms ends the exercise early. */
const DOUBLE_TAP_MS = 350;

/** The label of a rhythm in the active language. */
const rhythmLabel = (t: TFunction<"calm">, id: BlindRhythmId): string =>
  id === "4-4" ? t("blind.rhythm44") : t("blind.rhythm478");

export default function BlindBreathScreen({ activity }: { activity: CalmActivity }) {
  const router = useRouter();
  const [stage, setStage] = React.useState<Stage>("setup");
  /* The chosen rhythm and length. The activity does not carry them; the screen holds them. */
  const [rhythm, setRhythm] = React.useState<BlindRhythmId>("4-7-8");
  const [minutes, setMinutes] = React.useState<number>(3);

  /* The surface of the run is full-screen and dark; the native header does not fit on it. */
  const header = <Stack.Screen options={{ headerShown: stage !== "running" }} />;
  switch (stage) {
    case "countdown":
      return (
        <>
          {header}
          <Countdown onDone={() => setStage("running")} />
        </>
      );
    case "running":
      return (
        <>
          {header}
          <Running
            rhythm={rhythm}
            totalSeconds={minutes * 60}
            onFinish={() => setStage("done")}
            onCancel={() => setStage("setup")}
          />
        </>
      );
    case "done":
      return (
        <>
          {header}
          <Done onAgain={() => setStage("setup")} onBack={() => router.back()} />
        </>
      );
    default:
      return (
        <>
          {header}
          <Setup
            activity={activity}
            rhythm={rhythm}
            minutes={minutes}
            onRhythm={setRhythm}
            onMinutes={setMinutes}
            onStart={() => setStage("countdown")}
          />
        </>
      );
  }
}

/* ---------- setup: the choice of the rhythm and of the length ---------- */

interface SetupProps {
  activity: CalmActivity;
  rhythm: BlindRhythmId;
  minutes: number;
  onRhythm: (r: BlindRhythmId) => void;
  onMinutes: (m: number) => void;
  onStart: () => void;
}

function Setup({ activity, rhythm, minutes, onRhythm, onMinutes, onStart }: SetupProps) {
  const { t } = useTranslation(["calm", "common"]);
  const styles = useStyles();
  return (
    <Screen>
      <Text accessibilityRole="header" variant="title1">
        {activity.title}
      </Text>
      <Text variant="body">{t("blind.intro")}</Text>

      {/* The rhythm. */}
      <Text variant="kicker" style={styles.groupLabel}>
        {t("blind.rhythm.label")}
      </Text>
      <View
        accessibilityRole="radiogroup"
        accessibilityLabel={t("blind.rhythm.a11yLabel")}
        accessibilityHint={t("blind.rhythm.a11yHint")}
        style={styles.group}
      >
        {BLIND_RHYTHM_IDS.map((id) => (
          <RadioRow
            key={id}
            label={rhythmLabel(t, id)}
            selected={rhythm === id}
            onPress={() => onRhythm(id)}
          />
        ))}
      </View>

      {/* The length. */}
      <Text variant="kicker" style={styles.groupLabel}>
        {t("blind.duration.label")}
      </Text>
      <View
        accessibilityRole="radiogroup"
        accessibilityLabel={t("blind.duration.a11yLabel")}
        accessibilityHint={t("blind.duration.a11yHint")}
        style={styles.group}
      >
        {BLIND_DURATIONS_MIN.map((m) => (
          <RadioRow
            key={m}
            label={t("common:counts.minutes", { count: m })}
            selected={minutes === m}
            onPress={() => onMinutes(m)}
          />
        ))}
      </View>

      <View style={styles.setupActions}>
        <Button size="lg" fullWidth onPress={onStart}>
          {t("actions.start")}
        </Button>
      </View>
    </Screen>
  );
}

/* ---------- countdown: 3, 2, 1, time to hide the phone ---------- */

function Countdown({ onDone }: { onDone: () => void }) {
  const { t } = useTranslation("calm");
  const styles = useStyles();
  const [count, setCount] = React.useState(3);
  /* The screen reader announces the countdown; the first announcement also says to hide the phone. */
  React.useEffect(() => {
    announce(count === 3 ? t("blind.countdown.announce", { seconds: count }) : String(count));
  }, [count, t]);
  /* A mirror for the interval callback: the callback changes the state, not an effect. */
  const countRef = React.useRef(3);

  React.useEffect(() => {
    const timer = setInterval(() => {
      const next = countRef.current - 1;
      countRef.current = next;
      if (next <= 0) {
        clearInterval(timer);
        onDone();
        return;
      }
      setCount(next);
    }, 1000);
    return () => clearInterval(timer);
  }, [onDone]);

  return (
    <Screen contentStyle={styles.center}>
      <View style={styles.countBlock}>
        <Text variant="display" tabular align="center">
          {count}
        </Text>
        <Text variant="body" color="textMuted" align="center">
          {t("blind.countdown.hint")}
        </Text>
      </View>
    </Screen>
  );
}

/* ---------- the run stage: a full-screen dark surface, only vibrations ---------- */

/** Keeps the screen awake only while the run lasts (the run stage view mounts it). */
function KeepAwake() {
  useKeepAwake();
  return null;
}

interface RunningProps {
  rhythm: BlindRhythmId;
  totalSeconds: number;
  onFinish: () => void;
  onCancel: () => void;
}

function Running({ rhythm, totalSeconds, onFinish, onCancel }: RunningProps) {
  const { t } = useTranslation("calm");
  const styles = useStyles();
  /* The elapsed time (a mirror for the interval callback) and the time of the last touch. */
  const elapsedRef = React.useRef(0);
  const lastTapRef = React.useRef(0);
  /* The latest onFinish in a ref: the interval must not restart on a re-render. */
  const onFinishRef = React.useRef(onFinish);
  React.useEffect(() => {
    onFinishRef.current = onFinish;
  }, [onFinish]);

  React.useEffect(() => {
    const timer = setInterval(() => {
      const second = elapsedRef.current;
      const ev = blindEventAt(rhythm, second);
      if (ev === "inhale") haptics.strongPulse();
      else if (ev === "exhale-double") haptics.doublePulse();
      else if (ev === "hold-tick") haptics.tick();

      const next = second + 1;
      elapsedRef.current = next;
      if (next >= totalSeconds) {
        clearInterval(timer);
        haptics.success();
        onFinishRef.current();
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [rhythm, totalSeconds]);

  const onPress = (e: GestureResponderEvent) => {
    const ts = e.nativeEvent?.timestamp ?? 0;
    if (ts - lastTapRef.current < DOUBLE_TAP_MS) {
      /* An early end is not a completion: no success haptics. */
      onCancel();
      return;
    }
    lastTapRef.current = ts;
  };

  return (
    <View style={styles.surface}>
      <StatusBar style="light" />
      <KeepAwake />
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t("blind.running.a11yLabel")}
        accessibilityHint={t("blind.running.a11yHint")}
        /* VoiceOver and TalkBack: escape (the 2-finger Z) and the magic tap replace the
           double tap. */
        accessibilityActions={[
          { name: "escape", label: t("blind.running.stopAction") },
          { name: "magicTap", label: t("blind.running.stopAction") },
        ]}
        onAccessibilityAction={(e) => {
          if (e.nativeEvent.actionName === "escape" || e.nativeEvent.actionName === "magicTap") {
            onCancel();
          }
        }}
        onPress={onPress}
        style={styles.surfacePress}
      >
        {/* The surface is always dark (the phone in a pocket): the colours come from the dark scheme. */}
        <Text variant="footnote" align="center" style={styles.surfaceHint}>
          {t("blind.running.tapHint")}
        </Text>
      </Pressable>
      {/* A visible alternative without a gesture (HIG Gestures: a button for every gesture). */}
      <View style={styles.surfaceActions}>
        <Button variant="secondary" size="lg" fullWidth onPress={onCancel}>
          {t("actions.stop")}
        </Button>
      </View>
    </View>
  );
}

/* ---------- done: the confirmation and the offer to repeat ---------- */

function Done({ onAgain, onBack }: { onAgain: () => void; onBack: () => void }) {
  const { t } = useTranslation(["calm", "common"]);
  const styles = useStyles();
  React.useEffect(() => {
    announce(t("blind.done.title"));
  }, [t]);
  return (
    <Screen contentStyle={styles.center}>
      <View style={styles.doneBlock}>
        <Text accessibilityRole="header" variant="title1" align="center">
          {t("blind.done.title")}
        </Text>
      </View>
      <View style={styles.setupActions}>
        <Button size="lg" fullWidth onPress={onAgain}>
          {t("actions.again")}
        </Button>
        <Button variant="secondary" size="lg" fullWidth onPress={onBack}>
          {t("common:actions.back")}
        </Button>
      </View>
    </Screen>
  );
}

const useStyles = createThemedStyles((t) => ({
  center: { justifyContent: "center" },

  /* The setup. */
  groupLabel: { marginTop: 8 },
  group: { gap: 10 },
  setupActions: { marginTop: 24, gap: 10 },

  /* The countdown. */
  countBlock: { alignItems: "center", gap: 12 },

  /* The run: a full-screen dark surface, from the dark scheme in both modes. */
  surface: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: darkTheme.colors.surfaceSunken,
  },
  surfacePress: { flex: 1, alignItems: "center", justifyContent: "flex-end", paddingBottom: 24 },
  surfaceHint: { color: darkTheme.colors.textOnSunken },
  surfaceActions: { paddingHorizontal: 24, paddingBottom: 48 },

  /* The done stage. */
  doneBlock: { alignItems: "center", gap: 12 },
}));
