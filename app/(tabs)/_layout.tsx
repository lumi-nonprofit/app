/* Taby: Dnes · Klid · Check-in (+) · Přehledy · Pomoc. Každý tab má vlastní
   stack (nativní hlavičky, tab bar zůstává při pushi viditelný — HIG Tab bars).
   Vlastní LumiTabBar je přechodný: fáze 5 ho nahradí nativním tab barem
   (4 taby, check-in z Dnes). Prostřední „tab“ není route, ale akce. */
import React from "react";
import { useRouter } from "expo-router";
import { Tabs, type BottomTabBarProps } from "expo-router/tabs";
import LumiTabBar, { type TabId } from "../../src/components/TabBar";
import { TAB_BAR_RESERVE, TabBarInsetContext } from "../../src/components/TabBarInset";
import { useTheme } from "../../src/theme";

const TAB_FOR_ROUTE: Record<string, TabId> = {
  "(home)": "home",
  "(calm)": "calm",
  "(stats)": "stats",
  "(help)": "help",
};
const ROUTE_FOR_TAB: Record<Exclude<TabId, "checkin">, string> = {
  home: "(home)",
  calm: "(calm)",
  stats: "(stats)",
  help: "(help)",
};

function TabBarAdapter({ state, navigation }: BottomTabBarProps) {
  const router = useRouter();
  const active = TAB_FOR_ROUTE[state.routes[state.index]?.name] ?? "home";
  const onSelect = (id: TabId) => {
    if (id === "checkin") {
      router.push("/checkin");
      return;
    }
    navigation.navigate(ROUTE_FOR_TAB[id]);
  };
  return <LumiTabBar active={active} onSelect={onSelect} />;
}

export default function TabsLayout() {
  const theme = useTheme();
  return (
    <TabBarInsetContext.Provider value={TAB_BAR_RESERVE}>
      <Tabs
        tabBar={(props) => <TabBarAdapter {...props} />}
        screenOptions={{
          headerShown: false,
          sceneStyle: { backgroundColor: theme.colors.surfacePage },
        }}
      >
        <Tabs.Screen name="(home)" />
        <Tabs.Screen name="(calm)" />
        <Tabs.Screen name="(stats)" />
        <Tabs.Screen name="(help)" />
      </Tabs>
    </TabBarInsetContext.Provider>
  );
}
