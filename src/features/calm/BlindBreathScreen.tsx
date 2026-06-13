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
import { Pressable, StyleSheet, Text, View, type GestureResponderEvent } from "react-native";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useKeepAwake } from "expo-keep-awake";
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
import { colors, font, leading, palette, radius, shadow, tracking, type } from "../../theme";

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

  switch (stage) {
    case "countdown":
      return <Countdown onDone={() => setStage("running")} />;
    case "running":
      return (
        <Running
          rhythm={rhythm}
          totalSeconds={minutes * 60}
          onFinish={() => setStage("done")}
          onCancel={() => setStage("setup")}
        />
      );
    case "done":
      return <Done onAgain={() => setStage("setup")} onBack={() => router.back()} />;
    default:
      return (
        <Setup
          activity={activity}
          rhythm={rhythm}
          minutes={minutes}
          onRhythm={setRhythm}
          onMinutes={setMinutes}
          onStart={() => setStage("countdown")}
        />
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
  return (
    <Screen>
      <Text accessibilityRole="header" style={styles.setupTitle}>
        {activity.title}
      </Text>
      <Text style={styles.intro}>
        Telefon můžeš nechat v kapse — rytmus dechu vedou vibrace. Funguje i bez koukání na displej.
      </Text>

      {/* rytmus */}
      <Text style={styles.groupLabel}>Rytmus</Text>
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
      <Text style={styles.groupLabel}>Jak dlouho</Text>
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

/** Jedna volba radioskupiny — vybraný stav = obrys + glow, ne jen barva. */
function RadioRow({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ checked: selected }}
      /* jméno čte čtečka z textu volby níž — žádný duplicitní label */
      onPress={() => {
        haptics.select();
        onPress();
      }}
      style={({ pressed }) => [
        styles.radio,
        selected && styles.radioSelected,
        pressed && styles.radioPressed,
      ]}
    >
      {/* vybranou volbu nese i tvar (vyplněný terčík), ne jen barva/obrys */}
      <View style={[styles.dot, selected && styles.dotSelected]}>
        {selected ? <View style={styles.dotInner} /> : null}
      </View>
      <Text style={[styles.radioLabel, selected && styles.radioLabelSelected]}>{label}</Text>
    </Pressable>
  );
}

/* ---------- countdown: 3·2·1, čas schovat telefon ---------- */

function Countdown({ onDone }: { onDone: () => void }) {
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
        <Text accessibilityLiveRegion="polite" style={styles.countNumber}>
          {count}
        </Text>
        <Text style={styles.countHint}>Schovej telefon do kapsy</Text>
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
        <Text style={styles.surfaceHint}>Klepni dvakrát pro konec</Text>
      </Pressable>
    </View>
  );
}

/* ---------- done: potvrzení a nabídka opakování ---------- */

function Done({ onAgain, onBack }: { onAgain: () => void; onBack: () => void }) {
  return (
    <Screen contentStyle={styles.center}>
      <View style={styles.doneBlock}>
        <Text accessibilityRole="header" style={styles.doneTitle}>
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

const styles = StyleSheet.create({
  center: { justifyContent: "center" },

  /* setup */
  setupTitle: {
    ...font.display(700),
    fontSize: type.xl,
    lineHeight: leading.tight(type.xl),
    letterSpacing: tracking.display(type.xl),
    color: colors.textStrong,
  },
  intro: {
    ...font.body(400),
    fontSize: type.base,
    lineHeight: leading.body(type.base),
    color: colors.textBody,
  },
  groupLabel: {
    ...font.body(600),
    fontSize: type.xxs,
    letterSpacing: tracking.label(type.xxs),
    textTransform: "uppercase",
    color: palette.ink700,
    marginTop: 8,
  },
  group: { gap: 10 },
  radio: {
    minHeight: 56,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 18,
    backgroundColor: colors.surfaceCard,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: "transparent",
    ...shadow.card,
  },
  /* vybraná volba: zlatý obrys + glow (ne jen barva textu) */
  radioSelected: { borderColor: palette.sun400, ...shadow.glow },
  radioPressed: { transform: [{ scale: 0.99 }] },
  dot: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: colors.borderStrong,
    alignItems: "center",
    justifyContent: "center",
  },
  dotSelected: { borderColor: palette.sun500 },
  dotInner: { width: 10, height: 10, borderRadius: 5, backgroundColor: palette.sun500 },
  radioLabel: { ...font.body(600), fontSize: type.base, color: colors.textStrong },
  radioLabelSelected: { color: colors.textStrong },
  setupActions: { marginTop: 24, gap: 10 },

  /* countdown */
  countBlock: { alignItems: "center", gap: 12 },
  countNumber: {
    ...font.display(700),
    fontSize: type.xxxl,
    lineHeight: leading.tight(type.xxxl),
    letterSpacing: tracking.display(type.xxxl),
    color: colors.textStrong,
  },
  countHint: {
    ...font.body(400),
    fontSize: type.base,
    lineHeight: leading.body(type.base),
    color: colors.textMuted,
    textAlign: "center",
  },

  /* running: celoplošná tmavá plocha */
  surface: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "#0E0C0A",
  },
  surfacePress: { flex: 1, alignItems: "center", justifyContent: "flex-end", paddingBottom: 56 },
  surfaceHint: {
    ...font.body(400),
    fontSize: type.sm,
    lineHeight: leading.body(type.sm),
    color: "#998E7C",
    textAlign: "center",
  },

  /* done */
  doneBlock: { alignItems: "center", gap: 12 },
  doneTitle: {
    ...font.display(700),
    fontSize: type.xl,
    lineHeight: leading.tight(type.xl),
    letterSpacing: tracking.display(type.xl),
    color: colors.textStrong,
    textAlign: "center",
  },
});
