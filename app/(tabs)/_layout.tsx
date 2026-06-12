/* Taby: Dnes · Klid · Check-in (+) · Přehledy · Pomoc.
   Vlastní LumiTabBar místo výchozího — prostřední „tab“ není route,
   ale akce: otevírá modální checkin stack. */
import React from "react";
import { useRouter } from "expo-router";
import { Tabs, type BottomTabBarProps } from "expo-router/tabs";
import LumiTabBar, { type TabId } from "../../src/components/TabBar";
import { colors } from "../../src/theme";

const TAB_FOR_ROUTE: Record<string, TabId> = {
  index: "home",
  calm: "calm",
  stats: "stats",
  help: "help",
};

function TabBarAdapter({ state, navigation }: BottomTabBarProps) {
  const router = useRouter();
  const active = TAB_FOR_ROUTE[state.routes[state.index]?.name] ?? "home";
  const onSelect = (id: TabId) => {
    if (id === "checkin") {
      router.push("/checkin");
      return;
    }
    navigation.navigate(id === "home" ? "index" : id);
  };
  return <LumiTabBar active={active} onSelect={onSelect} />;
}

export default function TabsLayout() {
  return (
    <Tabs
      tabBar={(props) => <TabBarAdapter {...props} />}
      screenOptions={{
        headerShown: false,
        sceneStyle: { backgroundColor: colors.surfacePage },
      }}
    >
      <Tabs.Screen name="index" />
      <Tabs.Screen name="calm" />
      <Tabs.Screen name="stats" />
      <Tabs.Screen name="help" />
    </Tabs>
  );
}
