/* LumiTabBar — spodní navigace: Dnes · Klid · Check-in (+) · Přehledy · Pomoc.
   Check-in je zvýrazněná prostřední akce. Blur z webu vynecháváme — pozadí
   kompenzujeme vyšší neprůhledností (0.96). */
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Icon } from "../ds/index";
import type { IconName } from "../ds/Icon";
import { palette, colors, font, shadow, type } from "../theme";

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
  return (
    <View
      style={[styles.bar, { paddingBottom: Math.max(24, insets.bottom) }]}
      accessibilityLabel="Hlavní navigace"
      accessibilityHint="Přepíná mezi částmi aplikace."
    >
      {LUMI_TABS.map((t) => {
        const is = active === t.id;
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
                  {/* glow nelze sčítat s raised na jednom View — glow nese wrapper */}
                  <View style={is ? [styles.plusGlow, shadow.glow] : null}>
                    <View style={[styles.plus, pressed && styles.plusPressed]}>
                      <Icon name="plus" size={26} strokeWidth={2.2} color={colors.textOnInk} />
                    </View>
                  </View>
                  <Text style={[styles.label, is ? styles.labelActive : styles.labelIdle]}>
                    {t.label}
                  </Text>
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
              strokeWidth={is ? 2.2 : 1.75}
              color={is ? palette.sun700 : palette.ink700}
            />
            <Text style={[styles.label, is ? styles.labelActive : styles.labelIdle]}>
              {t.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
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
    backgroundColor: "rgba(251, 247, 239, 0.96)",
    borderTopWidth: 1,
    borderTopColor: colors.borderSubtle,
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
  itemPressed: { transform: [{ scale: 0.96 }] },
  center: {
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 6,
    paddingBottom: 4,
    borderRadius: 16,
  },
  plusGlow: { borderRadius: 27 },
  plus: {
    width: 54,
    height: 54,
    borderRadius: 27,
    marginTop: -30,
    backgroundColor: colors.surfaceInk,
    alignItems: "center",
    justifyContent: "center",
    ...shadow.raised,
  },
  plusPressed: { transform: [{ scale: 0.95 }] },
  label: { fontSize: type.xxs },
  labelActive: { ...font.body(700), color: palette.sun700 },
  labelIdle: { ...font.body(500), color: palette.ink700 },
});
