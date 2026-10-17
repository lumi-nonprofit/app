/* LumiTabBar — spodní navigace: Dnes · Klid · Check-in (+) · Přehledy · Pomoc.
   Check-in je zvýrazněná prostřední akce. Přechodná komponenta: fáze 5 ji
   nahradí nativním tab barem (4 taby, check-in z Dnes). */
import { Pressable, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Icon, Text } from "../ds";
import type { IconName } from "../ds/Icon";
import { createThemedStyles, useTheme } from "../theme";

export type TabId = "home" | "calm" | "checkin" | "stats" | "help";

interface Tab {
  id: TabId;
  icon: IconName;
  label: string;
  center?: boolean;
}

const LUMI_TABS: Tab[] = [
  { id: "home", icon: "sun", label: "Dnes" },
  { id: "calm", icon: "wind", label: "Klid" },
  { id: "checkin", icon: "plus", label: "Check-in", center: true },
  { id: "stats", icon: "chart-line", label: "Přehledy" },
  { id: "help", icon: "heart-handshake", label: "Pomoc" },
];

interface Props {
  active: TabId;
  onSelect: (id: TabId) => void;
}

export default function LumiTabBar({ active, onSelect }: Props) {
  const insets = useSafeAreaInsets();
  const theme = useTheme();
  const styles = useStyles();
  return (
    <View
      style={[styles.bar, { paddingBottom: Math.max(24, insets.bottom) }]}
      accessibilityLabel="Hlavní navigace"
      accessibilityHint="Přepíná mezi částmi aplikace."
    >
      {LUMI_TABS.map((t) => {
        const is = active === t.id;
        const label = (
          <Text
            variant="caption2"
            weight={is ? "bold" : "medium"}
            color={is ? "textAccent" : "textMuted"}
            maxFontSizeMultiplier={1.6}
          >
            {t.label}
          </Text>
        );
        if (t.center) {
          return (
            <Pressable
              key={t.id}
              style={styles.center}
              accessibilityRole="button"
              accessibilityLabel="Check-in"
              accessibilityHint="Otevře nový zápis pocitů."
              accessibilityState={{ selected: is }}
              onPress={() => onSelect(t.id)}
            >
              {({ pressed }) => (
                <>
                  <View
                    style={[styles.plus, is && styles.plusActive, pressed && styles.plusPressed]}
                  >
                    <Icon
                      name="plus"
                      size={26}
                      weight="semibold"
                      color={theme.colors.textOnPrimary}
                    />
                  </View>
                  {label}
                </>
              )}
            </Pressable>
          );
        }
        return (
          <Pressable
            key={t.id}
            style={({ pressed }) => [styles.item, pressed && styles.itemPressed]}
            accessibilityRole="button"
            accessibilityState={{ selected: is }}
            onPress={() => onSelect(t.id)}
          >
            <Icon
              name={t.icon}
              size={23}
              weight={is ? "semibold" : "regular"}
              color={is ? theme.colors.textAccent : theme.colors.textMuted}
            />
            {label}
          </Pressable>
        );
      })}
    </View>
  );
}

const useStyles = createThemedStyles((t) => ({
  bar: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 30,
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-around",
    paddingTop: 10,
    paddingHorizontal: 8,
    backgroundColor: t.colors.surfacePage,
    borderTopWidth: 1,
    borderTopColor: t.colors.borderSubtle,
  },
  item: {
    alignItems: "center",
    justifyContent: "flex-end",
    gap: 3,
    minWidth: 56,
    minHeight: 48,
    padding: 4,
    borderRadius: 12,
  },
  itemPressed: { opacity: t.pressedOpacity },
  center: {
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 6,
    paddingBottom: 4,
    borderRadius: 16,
  },
  plus: {
    width: 54,
    height: 54,
    borderRadius: 27,
    marginTop: -30,
    backgroundColor: t.colors.surfacePrimary,
    borderWidth: 2,
    borderColor: "transparent",
    alignItems: "center",
    justifyContent: "center",
    ...t.elevation.raised,
  },
  plusActive: { borderColor: t.colors.selectionBorder },
  plusPressed: { opacity: t.pressedOpacity },
}));
