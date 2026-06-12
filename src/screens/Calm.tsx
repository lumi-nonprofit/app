/* Klid — dechový launcher, seznam aktivit, Večerka. */
import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Badge, Card, ListItem } from "../ds/index";
import { LumiHeader } from "../components/Header";
import LumiBreath from "../components/Breath";
import Screen from "../components/Screen";
import { colors, font, leading, palette, radius } from "../theme";

export default function CalmScreen() {
  const [breathing, setBreathing] = React.useState(false);
  return (
    <Screen>
      <LumiHeader kicker="Klid" title="Na chvilku se zastav" />

      {/* dechový launcher */}
      <Card style={styles.breathCard}>
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ selected: breathing }}
          accessibilityLabel={breathing ? "Zastavit dýchání" : "Začít dýchat"}
          accessibilityHint={
            breathing
              ? "Zastaví dechové cvičení."
              : "Spustí společné dýchání: 4 s nádech, 4 s výdech."
          }
          onPress={() => setBreathing((b) => !b)}
          style={({ pressed }) => [styles.breathBtn, pressed && styles.pressed]}
        >
          <LumiBreath
            size={150}
            active={breathing}
            hint={breathing ? "4 s nádech · 4 s výdech" : "Klepni a dýchej se mnou"}
          />
        </Pressable>
      </Card>

      <Card style={styles.listCard}>
        <ListItem
          icon="wind"
          title="Dech 4-7-8"
          subtitle="Při napětí a úzkosti"
          trailing={<Badge tone="accent">3 min</Badge>}
          onPress={() => {}}
        />
        <ListItem
          icon="audio-lines"
          title="Tichá louka"
          subtitle="Vedená meditace · čeština"
          trailing={<Badge tone="accent">10 min</Badge>}
          onPress={() => {}}
        />
        <ListItem
          icon="footprints"
          iconTint={colors.positiveSoft}
          iconColor={palette.sage700}
          title="Všímavá procházka"
          subtitle="Meditace v pohybu"
          trailing={<Badge tone="positive">venku</Badge>}
          onPress={() => {}}
        />
      </Card>

      {/* Večerka — lilac je v DS vyhrazený pro spánek/večer */}
      <View style={styles.eveningSection}>
        <View style={styles.eveningHeader}>
          <Text style={styles.eveningTitle}>Večerka</Text>
          <Badge tone="lilac">od 21:00</Badge>
        </View>
        <Text style={styles.eveningText}>
          Klidné usínání — zvuky deště, pomalé dýchání a audio na dobrou noc.
        </Text>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  /* dechový launcher */
  breathCard: { alignItems: "center", paddingTop: 28, paddingHorizontal: 20, paddingBottom: 22 },
  breathBtn: { alignItems: "center" },
  pressed: { transform: [{ scale: 0.98 }] },

  listCard: { paddingVertical: 8, paddingHorizontal: 12 },

  /* Večerka */
  eveningSection: { backgroundColor: palette.lilac100, borderRadius: radius.lg, padding: 20 },
  eveningHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  eveningTitle: { ...font.display(700), fontSize: 17, color: palette.lilac700 },
  eveningText: {
    ...font.body(400),
    fontSize: 14.5,
    lineHeight: leading.body(14.5),
    color: colors.textBody,
  },
});
