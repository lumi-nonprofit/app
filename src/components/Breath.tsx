/* LumiBreath: the breath circle. It is a custom version of the DS BreathCircle: the label
   "Připraven?" has a grammatical gender, so the circle says the neutral "Začneme?". The circle
   breathes in a 4 s / 4 s rhythm. With Reduce Motion (HIG Motion) the circle does not scale and
   only the label changes. Motion is never the only signal: haptics and the screen reader announce
   each phase. */
import React from "react";
import { Animated, Easing, View } from "react-native";
import type { TFunction } from "i18next";
import { Text } from "../ds";
import { useTranslation } from "../i18n";
import { announce, useReduceMotion } from "../lib/a11y";
import { haptics } from "../lib/haptics";
import { createThemedStyles, motion, palette } from "../theme";

/** The phases of a breath cycle. The text of each phase comes from the `calm` catalog. */
export type BreathPhase = "inhale" | "hold" | "exhale";

/** The text of a phase in the active language, for the label and for the screen reader. */
export function breathPhaseLabel(t: TFunction<"calm">, phase: BreathPhase): string {
  switch (phase) {
    case "inhale":
      return t("phaseInhale");
    case "hold":
      return t("phaseHold");
    default:
      return t("phaseExhale");
  }
}

interface Props {
  size?: number;
  active?: boolean;
  hint?: string;
}

export default function LumiBreath({ size = 160, active, hint }: Props) {
  const { t } = useTranslation("calm");
  const styles = useStyles();
  const [phase, setPhase] = React.useState<BreathPhase>("inhale");
  const reduceMotion = useReduceMotion();
  /* A lazy useState instead of useRef: the same stable instance, but no read of a ref in render. */
  const [breath] = React.useState(() => new Animated.Value(0));

  React.useEffect(() => {
    if (!active) return;
    const timer = setInterval(
      () => setPhase((p) => (p === "inhale" ? "exhale" : "inhale")),
      motion.breath,
    );
    return () => {
      clearInterval(timer);
      setPhase("inhale"); // The cleanup resets the phase: the next start begins with an inhale.
    };
  }, [active]);

  /* Soft haptics at the start of the inhale (Light) and of the exhale (Medium); the screen reader
     announces the phase. */
  React.useEffect(() => {
    if (!active) return;
    if (phase === "inhale") haptics.inhale();
    else haptics.exhale();
    announce(breathPhaseLabel(t, phase));
  }, [active, phase, t]);

  const animating = active && !reduceMotion;

  React.useEffect(() => {
    if (!animating) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(breath, {
          toValue: 1,
          duration: motion.breath,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(breath, {
          toValue: 0,
          duration: motion.breath,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => {
      loop.stop();
      breath.setValue(0);
    };
  }, [animating, breath]);

  const circleScale = breath.interpolate({ inputRange: [0, 1], outputRange: [0.72, 1] });
  const haloScale = breath.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1] });
  const haloOpacity = breath.interpolate({ inputRange: [0, 1], outputRange: [0.25, 0.5] });

  /* The halo has an inset of -16 % in CSS. The code computes it from `size` and draws it under
     the circle. */
  const haloInset = -size * 0.16;

  return (
    <View style={styles.wrap}>
      <View style={[styles.stage, { width: size, height: size }]}>
        <Animated.View
          style={[
            styles.halo,
            { top: haloInset, left: haloInset, right: haloInset, bottom: haloInset },
            animating ? { opacity: haloOpacity, transform: [{ scale: haloScale }] } : null,
          ]}
        />
        <Animated.View
          style={[
            styles.circle,
            { width: size, height: size, borderRadius: size / 2 },
            animating ? { transform: [{ scale: circleScale }] } : null,
          ]}
        >
          {/* A fixed colour: sun300 with ink (9.3:1) is the same in both schemes. */}
          <Text variant="title3" maxFontSizeMultiplier={1.6} align="center" style={styles.label}>
            {active ? breathPhaseLabel(t, phase) : t("circle.idle")}
          </Text>
        </Animated.View>
      </View>
      {hint ? (
        <Text variant="footnote" color="textMuted" align="center">
          {hint}
        </Text>
      ) : null}
    </View>
  );
}

const useStyles = createThemedStyles(() => ({
  wrap: { alignItems: "center", gap: 18 },
  stage: { alignItems: "center", justifyContent: "center" },
  halo: {
    position: "absolute",
    borderRadius: 999,
    backgroundColor: palette.sun200,
    opacity: 0.5,
  },
  circle: {
    backgroundColor: palette.sun300,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 12,
  },
  label: { color: palette.ink900 },
}));
