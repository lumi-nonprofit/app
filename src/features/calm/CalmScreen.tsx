/* Klid — dechový launcher a seznam aktivit z manifestu (content.ts).
   Statická sekce Večerka je pryč: vecerka je teď řádek aktivity s vlastním
   přehrávačem — stejná informace dvakrát (jednou klepnutelná, jednou ne)
   by jen mátla. */
import React from "react";
import { Pressable, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { Badge, Card, ListItem } from "../../ds/index";
import type { IconName } from "../../ds/Icon";
import { LumiHeader } from "../../components/Header";
import LumiBreath from "../../components/Breath";
import Screen from "../../components/Screen";
import { colors, palette } from "../../theme";
import { CALM_ACTIVITIES } from "./content";

/* mapování id aktivity → ikona řádku; lilac je v DS vyhrazený pro spánek/večer */
const ACTIVITY_ICONS: Record<string, { icon: IconName; iconTint?: string; iconColor?: string }> = {
  "dech-478": { icon: "wind" },
  "ticha-louka": { icon: "audio-lines" },
  vecerka: { icon: "moon", iconTint: palette.lilac100, iconColor: palette.lilac700 },
};

export default function CalmScreen() {
  const router = useRouter();
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
        {CALM_ACTIVITIES.map((a) => {
          /* pojistka pro aktivitu bez mapování — neutrální výchozí ikona */
          const visual = ACTIVITY_ICONS[a.id] ?? { icon: "wind" };
          return (
            <ListItem
              key={a.id}
              icon={visual.icon}
              iconTint={visual.iconTint}
              iconColor={visual.iconColor}
              title={a.title}
              subtitle={a.subtitle}
              trailing={a.badge ? <Badge tone={a.badge[0]}>{a.badge[1]}</Badge> : undefined}
              onPress={() => router.push({ pathname: "/calm/[id]", params: { id: a.id } })}
            />
          );
        })}
        {/* procházka nemá přehrávač — zůstává bez navigace */}
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
    </Screen>
  );
}

const styles = StyleSheet.create({
  /* dechový launcher */
  breathCard: { alignItems: "center", paddingTop: 28, paddingHorizontal: 20, paddingBottom: 22 },
  breathBtn: { alignItems: "center" },
  pressed: { transform: [{ scale: 0.98 }] },

  listCard: { paddingVertical: 8, paddingHorizontal: 12 },
});
