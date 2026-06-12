/* Lumi — kořen aplikace: routing, stav, propojení obrazovek.
   Flow: onboarding → Dnes → check-in (krok 1 → 2 → potvrzení → Dnes) a Dnes → Pomoc.
   Nevykresluje nic, dokud nejsou fonty a stav ze storage (nativní splash zůstává). */
import React from "react";
import { View, StyleSheet } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { useFonts } from "expo-font";
import {
  BricolageGrotesque_400Regular,
  BricolageGrotesque_500Medium,
  BricolageGrotesque_600SemiBold,
  BricolageGrotesque_700Bold,
} from "@expo-google-fonts/bricolage-grotesque";
import {
  InstrumentSans_400Regular,
  InstrumentSans_500Medium,
  InstrumentSans_600SemiBold,
  InstrumentSans_700Bold,
} from "@expo-google-fonts/instrument-sans";
import { colors } from "./theme";
import { useAppState, newEntryId, type Route } from "./store";
import {
  lastEntryForDate,
  nowTime,
  toISODate,
  type CheckinDraft,
  type Entry,
  type MoodId,
} from "./model";
import LumiTabBar, { type TabId } from "./components/TabBar";
import { OnboardingAge, OnboardingName, OnboardingPrivacy } from "./screens/Onboarding";
import HomeScreen from "./screens/Home";
import { CheckinConfirm, CheckinStep1, CheckinStep2 } from "./screens/Checkin";
import CalmScreen from "./screens/Calm";
import StatsScreen from "./screens/Stats";
import HelpScreen from "./screens/Help";

const EMPTY_DRAFT: CheckinDraft = { mood: null, intensity: 3, words: [], tags: [], note: "" };

export default function App() {
  const [fontsLoaded, fontError] = useFonts({
    BricolageGrotesque_400Regular,
    BricolageGrotesque_500Medium,
    BricolageGrotesque_600SemiBold,
    BricolageGrotesque_700Bold,
    InstrumentSans_400Regular,
    InstrumentSans_500Medium,
    InstrumentSans_600SemiBold,
    InstrumentSans_700Bold,
  });
  const [st, patch] = useAppState();
  const [draft, setDraftRaw] = React.useState<CheckinDraft>(EMPTY_DRAFT);
  const setDraft = (p: Partial<CheckinDraft>) => setDraftRaw((d) => ({ ...d, ...p }));

  if (!st || (!fontsLoaded && !fontError)) return null;

  const route = st.route;
  const nav = (r: Route) => patch({ route: r });

  const todayEntry = lastEntryForDate(st.entries, toISODate());

  const startCheckin = () => {
    setDraftRaw(EMPTY_DRAFT);
    nav("checkin1");
  };
  const saveCheckin = () => {
    if (!draft.mood) return; // tlačítko Uložit je do výběru stavu disabled
    const now = new Date();
    const entry: Entry = {
      id: newEntryId(),
      date: toISODate(now),
      time: nowTime(now),
      mood: draft.mood,
      intensity: draft.intensity,
      words: draft.words,
      tags: draft.tags,
      note: draft.note.trim(),
    };
    patch({ entries: [...st.entries, entry], route: "confirm" });
  };

  const onTab = (id: TabId) => {
    if (id === "checkin") startCheckin();
    else nav(id);
  };
  const isCheckin = route === "checkin1" || route === "checkin2" || route === "confirm";
  const isOnboarding = route === "ob1" || route === "ob2" || route === "ob3";
  // tab bar se vykresluje jen mimo onboarding, takže route je tady vždy TabId
  const activeTab: TabId = isCheckin ? "checkin" : (route as TabId);
  const confirmMood: MoodId = draft.mood ?? todayEntry?.mood ?? "napeti";

  let screen: React.ReactNode = null;
  if (route === "ob1") {
    screen = (
      <OnboardingName name={st.name} onName={(v) => patch({ name: v })} onNext={() => nav("ob2")} />
    );
  } else if (route === "ob2") {
    screen = (
      <OnboardingAge
        age={st.age}
        onAge={(v) => patch({ age: v })}
        onNext={() => nav("ob3")}
        onBack={() => nav("ob1")}
      />
    );
  } else if (route === "ob3") {
    screen = (
      <OnboardingPrivacy
        onDone={() => patch({ onboarded: true, route: "home" })}
        onBack={() => nav("ob2")}
      />
    );
  } else if (route === "home") {
    screen = (
      <HomeScreen
        name={st.name.trim()}
        todayEntry={todayEntry}
        who5={st.who5}
        onStartCheckin={startCheckin}
        onOpenCalm={() => nav("calm")}
        onOpenHelp={() => nav("help")}
        onOpenStats={() => nav("stats")}
      />
    );
  } else if (route === "checkin1") {
    screen = <CheckinStep1 draft={draft} setDraft={setDraft} onNext={() => nav("checkin2")} />;
  } else if (route === "checkin2") {
    screen = (
      <CheckinStep2
        draft={draft}
        setDraft={setDraft}
        onBack={() => nav("checkin1")}
        onSave={saveCheckin}
      />
    );
  } else if (route === "confirm") {
    screen = (
      <CheckinConfirm
        moodId={confirmMood}
        onHome={() => nav("home")}
        onOpenCalm={() => nav("calm")}
      />
    );
  } else if (route === "calm") {
    screen = <CalmScreen />;
  } else if (route === "stats") {
    screen = (
      <StatsScreen
        entries={st.entries}
        who5={st.who5}
        share={st.share}
        onShare={(v) => patch({ share: v })}
        onStartCheckin={startCheckin}
        onOpenHelp={() => nav("help")}
      />
    );
  } else if (route === "help") {
    screen = <HelpScreen age={st.age} onOpenCalm={() => nav("calm")} />;
  }

  return (
    <SafeAreaProvider>
      <View style={styles.app}>
        <StatusBar style="dark" />
        {screen}
        {!isOnboarding ? <LumiTabBar active={activeTab} onSelect={onTab} /> : null}
      </View>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  app: { flex: 1, backgroundColor: colors.surfacePage },
});
