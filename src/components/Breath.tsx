/* LumiBreath — dechový kruh. Vlastní verze DS BreathCircle: label „Připraven?“
   je rodově vázaný, proto neutrální „Začneme?“. Dýchá v rytmu 4 s / 4 s;
   redukci pohybu řeší AccessibilityInfo.isReduceMotionEnabled() — bez animace
   se jen přepíná label. */
import React from "react";
import { AccessibilityInfo, Animated, Easing, StyleSheet, Text, View } from "react-native";
import { haptics } from "../lib/haptics";
import { palette, font, type } from "../theme";

type BreathPhase = "Nádech" | "Výdech";

interface Props {
  size?: number;
  active?: boolean;
  hint?: string;
}

export default function LumiBreath({ size = 160, active, hint }: Props) {
  const [phase, setPhase] = React.useState<BreathPhase>("Nádech");
  const [reduceMotion, setReduceMotion] = React.useState(false);
  /* líný useState místo useRef: stejná stabilní instance, ale žádné čtení ref během renderu */
  const [breath] = React.useState(() => new Animated.Value(0));

  React.useEffect(() => {
    if (!active) return;
    const t = setInterval(() => setPhase((p) => (p === "Nádech" ? "Výdech" : "Nádech")), 4000);
    return () => {
      clearInterval(t);
      setPhase("Nádech"); // reset v cleanupu: příští start vždy začíná nádechem
    };
  }, [active]);

  /* decentní haptika na začátku nádechu (Light) a výdechu (Medium) */
  React.useEffect(() => {
    if (!active) return;
    if (phase === "Nádech") haptics.inhale();
    else haptics.exhale();
  }, [active, phase]);

  /* redukce pohybu: async dotaz, default false; pozor na unmount */
  React.useEffect(() => {
    let mounted = true;
    AccessibilityInfo.isReduceMotionEnabled()
      .then((enabled) => {
        if (mounted) setReduceMotion(!!enabled);
      })
      .catch(() => {});
    return () => {
      mounted = false;
    };
  }, []);

  const animating = active && !reduceMotion;

  React.useEffect(() => {
    if (!animating) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(breath, {
          toValue: 1,
          duration: 4000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(breath, {
          toValue: 0,
          duration: 4000,
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
          <Text style={styles.label}>{active ? phase : "Začneme?"}</Text>
        </Animated.View>
      </View>
      {hint ? <Text style={styles.hint}>{hint}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
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
  },
  label: { ...font.display(600), fontSize: type.md, color: palette.ink900 },
  hint: { ...font.body(400), fontSize: type.sm, color: palette.ink700 },
});
