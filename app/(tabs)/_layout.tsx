/* Nativní taby: Dnes · Klid · Přehledy · Pomoc (HIG Tab bars: navigace, ne
   akce — check-in se spouští z Dnes). iOS: systémový tab bar s Liquid Glass
   a vyplněnými symboly aktivního tabu; Android: Material navigation bar
   s indikátorem, ripple a vždy viditelnými popisky. Každý tab má vlastní
   stack, takže tab bar zůstává viditelný i na vnořených obrazovkách. */
import { NativeTabs } from "expo-router/unstable-native-tabs";
import { TabContentContext } from "../../src/components/TabContent";
import { useTheme } from "../../src/theme";

export default function TabsLayout() {
  const theme = useTheme();
  const c = theme.colors;
  return (
    <TabContentContext.Provider value>
      <NativeTabs
        iconColor={{ default: c.textMuted, selected: c.textAccent }}
        labelStyle={{ default: { color: c.textMuted }, selected: { color: c.textAccent } }}
        tintColor={c.textAccent}
        /* iOS: bez vlastního pozadí (Liquid Glass / blur dodá systém); Android: plocha */
        backgroundColor={theme.platform.isAndroid ? c.surfaceCard : undefined}
        indicatorColor={c.accentSoft}
        rippleColor={theme.ripple}
        labelVisibilityMode="labeled"
        minimizeBehavior="automatic"
      >
        <NativeTabs.Trigger name="(home)">
          <NativeTabs.Trigger.Label>Dnes</NativeTabs.Trigger.Label>
          <NativeTabs.Trigger.Icon
            sf={{ default: "sun.max", selected: "sun.max.fill" }}
            md="light_mode"
          />
        </NativeTabs.Trigger>
        <NativeTabs.Trigger name="(calm)">
          <NativeTabs.Trigger.Label>Klid</NativeTabs.Trigger.Label>
          <NativeTabs.Trigger.Icon sf={{ default: "leaf", selected: "leaf.fill" }} md="spa" />
        </NativeTabs.Trigger>
        <NativeTabs.Trigger name="(stats)">
          <NativeTabs.Trigger.Label>Přehledy</NativeTabs.Trigger.Label>
          <NativeTabs.Trigger.Icon
            sf={{ default: "chart.bar", selected: "chart.bar.fill" }}
            md="bar_chart"
          />
        </NativeTabs.Trigger>
        <NativeTabs.Trigger name="(help)">
          <NativeTabs.Trigger.Label>Pomoc</NativeTabs.Trigger.Label>
          <NativeTabs.Trigger.Icon
            sf={{ default: "heart", selected: "heart.fill" }}
            md="volunteer_activism"
          />
        </NativeTabs.Trigger>
      </NativeTabs>
    </TabContentContext.Provider>
  );
}
