/* LumiBreath — dechový kruh. Vlastní verze DS BreathCircle: label „Připraven?“
   je rodově vázaný, proto neutrální „Začneme?“. Dýchá v rytmu 4 s / 4 s.
   Reduce Motion (HIG Motion): bez škálování, jen prolnutí labelu; pohyb nikdy
   není jediný nosič — fáze oznamuje haptika i čtečka obrazovky. */
import React from "react";
import { Animated, Easing, View } from "react-native";
import { Text } from "../ds";
import { announce, useReduceMotion } from "../lib/a11y";
import { haptics } from "../lib/haptics";
import { createThemedStyles, motion, palette } from "../theme";

type BreathPhase = "Nádech" | "Výdech";

interface Props {
  size?: number;
  active?: boolean;
  hint?: string;
}

export default function LumiBreath({ size = 160, active, hint }: Props) {
  const styles = useStyles();
  const [phase, setPhase] = React.useState<BreathPhase>("Nádech");
  const reduceMotion = useReduceMotion();
  /* líný useState místo useRef: stejná stabilní instance, ale žádné čtení ref během renderu */
  const [breath] = React.useState(() => new Animated.Value(0));

  React.useEffect(() => {
    if (!active) return;
    const t = setInterval(
      () => setPhase((p) => (p === "Nádech" ? "Výdech" : "Nádech")),
      motion.breath,
    );
    return () => {
      clearInterval(t);
      setPhase("Nádech"); // reset v cleanupu: příští start vždy začíná nádechem
    };
  }, [active]);

  /* decentní haptika na začátku nádechu (Light) a výdechu (Medium) + oznámení fáze */
  React.useEffect(() => {
    if (!active) return;
    if (phase === "Nádech") haptics.inhale();
    else haptics.exhale();
    announce(phase);
  }, [active, phase]);

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

  /* halo: v CSS inset -16 % — spočteno ze size, vykresleno pod kruhem */
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
          {/* pevná barva: sun300 s inkoustem (9,3:1) je stejná v obou režimech */}
          <Text variant="title3" maxFontSizeMultiplier={1.6} align="center" style={styles.label}>
            {active ? phase : "Začneme?"}
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
