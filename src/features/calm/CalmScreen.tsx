/* Calm: the breath launcher and the list of activities from the manifest (content.ts). The static
   "Večerka" section is gone: "vecerka" is now an activity row with its own player. The same
   information twice (once tappable, once not) would only confuse. */
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
import { useTranslation } from "../../i18n";
import { contentText } from "../../i18n/content";
import { createThemedStyles, useTheme } from "../../theme";
import { CALM_ACTIVITIES } from "./content";

/* The icon of each activity row. The DS reserves lilac for sleep and evening. */
const ACTIVITY_ICONS: Record<string, { icon: IconName; tone?: Tone }> = {
  "dech-478": { icon: "wind" },
  "ticha-louka": { icon: "audio-lines" },
  vecerka: { icon: "moon", tone: "lilac" },
  "dech-naslepo": { icon: "waves" },
};

export default function CalmScreen() {
  const { t } = useTranslation("calm");
  const router = useRouter();
  const theme = useTheme();
  const styles = useStyles();
  const [breathing, setBreathing] = React.useState(false);
  return (
    <Screen>
      <LumiHeader title={t("screen.title")} />

      {/* The breath launcher. */}
      <Card style={styles.breathCard}>
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ selected: breathing }}
          accessibilityLabel={
            breathing ? t("launcher.stop.a11yLabel") : t("launcher.start.a11yLabel")
          }
          accessibilityHint={breathing ? t("launcher.stop.a11yHint") : t("launcher.start.a11yHint")}
          onPress={() => setBreathing((b) => !b)}
          style={({ pressed }) => [styles.breathBtn, pressedStyle(theme, pressed)]}
        >
          <LumiBreath
            size={150}
            active={breathing}
            hint={breathing ? t("launcher.activeHint") : t("launcher.idleHint")}
          />
        </Pressable>
      </Card>

      <Card style={styles.listCard}>
        {CALM_ACTIVITIES.map((a) => {
          /* An activity without a mapping gets the neutral default icon. */
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
        {/* The walk has no content yet. The row shows the text of the recommendation "prochazka"
            and the same badge as an audio activity without a file. */}
        <ListItem
          icon="footprints"
          tone="positive"
          title={contentText("recommendations.prochazka.title")}
          subtitle={contentText("recommendations.prochazka.subtitle")}
          trailing={<Badge tone="neutral">{t("comingSoon.badge")}</Badge>}
          disabled
        />
      </Card>
    </Screen>
  );
}

const useStyles = createThemedStyles(() => ({
  /* The breath launcher. */
  breathCard: { alignItems: "center", paddingTop: 28, paddingHorizontal: 20, paddingBottom: 22 },
  breathBtn: { alignItems: "center" },

  listCard: { paddingVertical: 8, paddingHorizontal: 12 },
}));
