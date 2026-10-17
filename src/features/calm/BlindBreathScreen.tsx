/* Dech naslepo — rytmus dechu vedou vibrace, displej netřeba.
   Telefon může zůstat v kapse: výrazný impulz na začátku nádechu, dvojitý
   na začátku výdechu, u 4-7-8 navíc jemný tik uprostřed zádrže (logika
   v blindRhythm.ts). Obrazovka má čtyři stavy:

     setup     — výběr rytmu a délky,
     countdown — 3·2·1, čas schovat telefon,
     running   — celoplošná tmavá plocha, jen vibrace; poklepání ukončí,
     done      — krátké potvrzení a nabídka opakování.

   Časování běží v intervalu se zrcadlem v refu (konec se řeší v callbacku,
   ne v efektu) — stejný vzor jako BreathPlayer v PlayerScreen. */
import React from "react";
import { Pressable, View, type GestureResponderEvent } from "react-native";
import { Stack, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useKeepAwake } from "expo-keep-awake";
import { Text } from "../../ds";
import { pressFeedback, pressedStyle } from "../../ds/press";
import LumiCTA from "../../components/CTA";
import Screen from "../../components/Screen";
import { haptics } from "../../lib/haptics";
import type { CalmActivity } from "./content";
import {
  BLIND_DURATIONS_MIN,
  BLIND_RHYTHM_LABELS,
  blindEventAt,
  type BlindRhythmId,
} from "./blindRhythm";
import { createThemedStyles, darkTheme, useTheme } from "../../theme";

type Stage = "setup" | "countdown" | "running" | "done";

/* dvojí poklepání: druhý dotek do 350 ms = předčasné ukončení */
const DOUBLE_TAP_MS = 350;
const RHYTHM_IDS = Object.keys(BLIND_RHYTHM_LABELS) as BlindRhythmId[];

export default function BlindBreathScreen({ activity }: { activity: CalmActivity }) {
  const router = useRouter();
  const [stage, setStage] = React.useState<Stage>("setup");
  /* zvolený rytmus a délka — aktivita je nenese, drží je obrazovka */
  const [rhythm, setRhythm] = React.useState<BlindRhythmId>("4-7-8");
  const [minutes, setMinutes] = React.useState<number>(3);

  /* běžící plocha je celoobrazovková a tmavá — nativní hlavička se na ni nehodí */
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

/* ---------- setup: výběr rytmu a délky ---------- */

interface SetupProps {
  activity: CalmActivity;
  rhythm: BlindRhythmId;
  minutes: number;
  onRhythm: (r: BlindRhythmId) => void;
  onMinutes: (m: number) => void;
  onStart: () => void;
}

function Setup({ activity, rhythm, minutes, onRhythm, onMinutes, onStart }: SetupProps) {
  const styles = useStyles();
  return (
    <Screen>
      <Text accessibilityRole="header" variant="title1">
        {activity.title}
      </Text>
      <Text variant="body">
        Telefon můžeš nechat v kapse — rytmus dechu vedou vibrace. Funguje i bez koukání na displej.
      </Text>

      {/* rytmus */}
      <Text variant="kicker" style={styles.groupLabel}>
        Rytmus
      </Text>
      <View
        accessibilityRole="radiogroup"
        accessibilityLabel="Rytmus dechu"
        accessibilityHint="Vyber rytmus, ve kterém tě vibrace povedou."
        style={styles.group}
      >
        {RHYTHM_IDS.map((id) => (
          <RadioRow
            key={id}
            label={BLIND_RHYTHM_LABELS[id]}
            selected={rhythm === id}
            onPress={() => onRhythm(id)}
          />
        ))}
      </View>

      {/* délka */}
      <Text variant="kicker" style={styles.groupLabel}>
        Jak dlouho
      </Text>
      <View
        accessibilityRole="radiogroup"
        accessibilityLabel="Délka cvičení"
        accessibilityHint="Vyber, jak dlouho chceš dýchat."
        style={styles.group}
      >
        {BLIND_DURATIONS_MIN.map((m) => (
          <RadioRow
            key={m}
            label={`${m} min`}
            selected={minutes === m}
            onPress={() => onMinutes(m)}
          />
        ))}
      </View>

      <View style={styles.setupActions}>
        <LumiCTA onPress={onStart}>Začít</LumiCTA>
      </View>
    </Screen>
  );
}

/** Jedna volba radioskupiny — vybraný stav = obrys (≥ 3:1) + vyplněný terčík, ne jen barva. */
function RadioRow({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  const theme = useTheme();
  const styles = useStyles();
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ checked: selected }}
      /* jméno čte čtečka z textu volby níž — žádný duplicitní label */
      onPress={() => {
        haptics.select();
        onPress();
      }}
      {...pressFeedback(theme)}
      style={({ pressed }) => [
        styles.radio,
        selected && styles.radioSelected,
        pressedStyle(theme, pressed),
      ]}
    >
      {/* vybranou volbu nese i tvar (vyplněný terčík), ne jen barva/obrys */}
      <View style={[styles.dot, selected && styles.dotSelected]}>
        {selected ? <View style={styles.dotInner} /> : null}
      </View>
      <Text variant="body" weight="semibold" color="textStrong" style={styles.radioLabel}>
        {label}
      </Text>
    </Pressable>
  );
}

/* ---------- countdown: 3·2·1, čas schovat telefon ---------- */

function Countdown({ onDone }: { onDone: () => void }) {
  const styles = useStyles();
  const [count, setCount] = React.useState(3);
  /* zrcadlo pro intervalový callback — stav se mění tam, ne v efektu */
  const countRef = React.useRef(3);

  React.useEffect(() => {
    const t = setInterval(() => {
      const next = countRef.current - 1;
      countRef.current = next;
      if (next <= 0) {
        clearInterval(t);
        onDone();
        return;
      }
      setCount(next);
    }, 1000);
    return () => clearInterval(t);
  }, [onDone]);

  return (
    <Screen contentStyle={styles.center}>
      <View style={styles.countBlock}>
        <Text accessibilityLiveRegion="polite" variant="display" tabular align="center">
          {count}
        </Text>
        <Text variant="body" color="textMuted" align="center">
          Schovej telefon do kapsy
        </Text>
      </View>
    </Screen>
  );
}

/* ---------- running: celoplošná tmavá plocha, jen vibrace ---------- */

/** Drží obrazovku probuzenou jen po dobu běhu (mountuje se uvnitř Running). */
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
  const styles = useStyles();
  /* odehraný čas (zrcadlo pro intervalový callback) a čas posledního dotyku */
  const elapsedRef = React.useRef(0);
  const lastTapRef = React.useRef(0);
  /* poslední onFinish v refu — interval se nesmí restartovat při re-renderu */
  const onFinishRef = React.useRef(onFinish);
  React.useEffect(() => {
    onFinishRef.current = onFinish;
  }, [onFinish]);

  React.useEffect(() => {
    const t = setInterval(() => {
      const second = elapsedRef.current;
      const ev = blindEventAt(rhythm, second);
      if (ev === "inhale") haptics.strongPulse();
      else if (ev === "exhale-double") haptics.doublePulse();
      else if (ev === "hold-tick") haptics.tick();

      const next = second + 1;
      elapsedRef.current = next;
      if (next >= totalSeconds) {
        clearInterval(t);
        haptics.success();
        onFinishRef.current();
      }
    }, 1000);
    return () => clearInterval(t);
  }, [rhythm, totalSeconds]);

  const onPress = (e: GestureResponderEvent) => {
    const ts = e.nativeEvent?.timestamp ?? 0;
    if (ts - lastTapRef.current < DOUBLE_TAP_MS) {
      /* předčasné ukončení není dokončení — žádná haptika success */
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
        accessibilityLabel="Probíhá dech naslepo"
        accessibilityHint="Poklepáním cvičení ukončíš."
        onPress={onPress}
        style={styles.surfacePress}
      >
        {/* plocha je vždy tmavá (telefon v kapse) — barvy z tmavého schématu */}
        <Text variant="footnote" align="center" style={styles.surfaceHint}>
          Klepni dvakrát pro konec
        </Text>
      </Pressable>
    </View>
  );
}

/* ---------- done: potvrzení a nabídka opakování ---------- */

function Done({ onAgain, onBack }: { onAgain: () => void; onBack: () => void }) {
  const styles = useStyles();
  return (
    <Screen contentStyle={styles.center}>
      <View style={styles.doneBlock}>
        <Text accessibilityRole="header" variant="title1" align="center">
          Hotovo. Díky za chvilku.
        </Text>
      </View>
      <View style={styles.setupActions}>
        <LumiCTA onPress={onAgain}>Ještě jednou</LumiCTA>
        <LumiCTA variant="secondary" onPress={onBack}>
          Zpět
        </LumiCTA>
      </View>
    </Screen>
  );
}

const useStyles = createThemedStyles((t) => ({
  center: { justifyContent: "center" },

  /* setup */
  groupLabel: { marginTop: 8 },
  group: { gap: 10 },
  radio: {
    minHeight: t.platform.listRowMinHeight,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 18,
    backgroundColor: t.colors.surfaceCard,
    borderRadius: t.radius.md,
    borderWidth: 1.5,
    borderColor: t.scheme === "dark" ? t.colors.borderSubtle : "transparent",
    overflow: "hidden",
    ...t.elevation.card,
  },
  /* vybraná volba: zlatý obrys ≥ 3:1 (ne jen barva textu) */
  radioSelected: { borderColor: t.colors.selectionBorder },
  dot: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: t.colors.borderStrong,
    alignItems: "center",
    justifyContent: "center",
  },
  dotSelected: { borderColor: t.colors.accentFill },
  dotInner: { width: 10, height: 10, borderRadius: 5, backgroundColor: t.colors.accentFill },
  radioLabel: { flex: 1 },
  setupActions: { marginTop: 24, gap: 10 },

  /* countdown */
  countBlock: { alignItems: "center", gap: 12 },

  /* running: celoplošná tmavá plocha — v obou režimech z tmavého schématu */
  surface: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: darkTheme.colors.surfaceSunken,
  },
  surfacePress: { flex: 1, alignItems: "center", justifyContent: "flex-end", paddingBottom: 56 },
  surfaceHint: { color: darkTheme.colors.textOnSunken },

  /* done */
  doneBlock: { alignItems: "center", gap: 12 },
}));
