/* Native tabs: "Dnes" · "Klid" · "Přehledy" · "Pomoc" (HIG Tab bars: navigation, not actions;
   the check-in starts from "Dnes"). iOS: the system tab bar with Liquid Glass and filled
   symbols for the active tab. Android: the Material navigation bar with an indicator, a ripple
   and labels that stay visible. Each tab has its own stack, so the tab bar stays visible on
   the nested screens too. */
import { NativeTabs } from "expo-router/unstable-native-tabs";
import { TabContentContext } from "../../src/components/TabContent";
import { useTranslation } from "../../src/i18n";
import { useTheme } from "../../src/theme";

export default function TabsLayout() {
  const { t } = useTranslation("navigation");
  const theme = useTheme();
  const c = theme.colors;
  return (
    <TabContentContext.Provider value>
      <NativeTabs
        iconColor={{ default: c.textMuted, selected: c.textAccent }}
        labelStyle={{ default: { color: c.textMuted }, selected: { color: c.textAccent } }}
        tintColor={c.textAccent}
        /* iOS: no custom background (the system supplies Liquid Glass / blur); Android: a surface. */
        backgroundColor={theme.platform.isAndroid ? c.surfaceCard : undefined}
        indicatorColor={c.accentSoft}
        rippleColor={theme.ripple}
        labelVisibilityMode="labeled"
        minimizeBehavior="automatic"
      >
        <NativeTabs.Trigger name="(home)">
          <NativeTabs.Trigger.Label>{t("tabs.home")}</NativeTabs.Trigger.Label>
          <NativeTabs.Trigger.Icon
            sf={{ default: "sun.max", selected: "sun.max.fill" }}
            md="light_mode"
          />
        </NativeTabs.Trigger>
        <NativeTabs.Trigger name="(calm)">
          <NativeTabs.Trigger.Label>{t("tabs.calm")}</NativeTabs.Trigger.Label>
          <NativeTabs.Trigger.Icon sf={{ default: "leaf", selected: "leaf.fill" }} md="spa" />
        </NativeTabs.Trigger>
        <NativeTabs.Trigger name="(stats)">
          <NativeTabs.Trigger.Label>{t("tabs.stats")}</NativeTabs.Trigger.Label>
          <NativeTabs.Trigger.Icon
            sf={{ default: "chart.bar", selected: "chart.bar.fill" }}
            md="bar_chart"
          />
        </NativeTabs.Trigger>
        <NativeTabs.Trigger name="(help)">
          <NativeTabs.Trigger.Label>{t("tabs.help")}</NativeTabs.Trigger.Label>
          <NativeTabs.Trigger.Icon
            sf={{ default: "heart", selected: "heart.fill" }}
            md="volunteer_activism"
          />
        </NativeTabs.Trigger>
      </NativeTabs>
    </TabContentContext.Provider>
  );
}
