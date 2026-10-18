/* Klid — dechový launcher a seznam aktivit z manifestu (content.ts).
   Statická sekce Večerka je pryč: vecerka je teď řádek aktivity s vlastním
   přehrávačem — stejná informace dvakrát (jednou klepnutelná, jednou ne)
   by jen mátla. */
import React from "react";
import { Pressable } from "react-native";
import { useRouter } from "expo-router";
import { Badge, Card, ListItem } from "../../ds";
import type { IconName } from "../../ds/Icon";
import type { Tone } from "../../ds";
import { pressedStyle } from "../../ds/press";
import { LumiHeader } from "../../components/Header";
import LumiBreath from "../../components/Breath";
import Screen from "../../components/Screen";
import { createThemedStyles, useTheme } from "../../theme";
import { CALM_ACTIVITIES } from "./content";

/* mapování id aktivity → ikona řádku; lilac je v DS vyhrazený pro spánek/večer */
const ACTIVITY_ICONS: Record<string, { icon: IconName; tone?: Tone }> = {
  "dech-478": { icon: "wind" },
  "ticha-louka": { icon: "audio-lines" },
  vecerka: { icon: "moon", tone: "lilac" },
  "dech-naslepo": { icon: "waves" },
};

export default function CalmScreen() {
  const router = useRouter();
  const theme = useTheme();
  const styles = useStyles();
  const [breathing, setBreathing] = React.useState(false);
  return (
    <Screen>
      <LumiHeader title="Na chvilku se zastav" />

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
          style={({ pressed }) => [styles.breathBtn, pressedStyle(theme, pressed)]}
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
              tone={visual.tone}
              title={a.title}
              subtitle={a.subtitle}
              trailing={a.badge ? <Badge tone={a.badge[0]}>{a.badge[1]}</Badge> : undefined}
              onPress={() => router.push({ pathname: "/calm/[id]", params: { id: a.id } })}
            />
          );
        })}
        {/* procházka zatím nemá obsah — stejný vzor „připravujeme“ jako audio bez souboru */}
        <ListItem
          icon="footprints"
          tone="positive"
          title="Všímavá procházka"
          subtitle="Meditace v pohybu · venku"
          trailing={<Badge tone="neutral">připravujeme</Badge>}
          disabled
        />
      </Card>
    </Screen>
  );
}

const useStyles = createThemedStyles(() => ({
  /* dechový launcher */
  breathCard: { alignItems: "center", paddingTop: 28, paddingHorizontal: 20, paddingBottom: 22 },
  breathBtn: { alignItems: "center" },

  listCard: { paddingVertical: 8, paddingHorizontal: 12 },
}));
