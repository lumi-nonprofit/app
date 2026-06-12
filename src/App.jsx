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
import { colors } from "./theme.js";
import { useAppState, newEntryId } from "./store.js";
import { lastEntryForDate, nowTime, toISODate } from "./model.js";
import LumiTabBar from "./components/TabBar.jsx";
import { OnboardingAge, OnboardingName, OnboardingPrivacy } from "./screens/Onboarding.jsx";
import HomeScreen from "./screens/Home.jsx";
import { CheckinConfirm, CheckinStep1, CheckinStep2 } from "./screens/Checkin.jsx";
import CalmScreen from "./screens/Calm.jsx";
import StatsScreen from "./screens/Stats.jsx";
import HelpScreen from "./screens/Help.jsx";

const EMPTY_DRAFT = { mood: null, intensity: 3, words: [], tags: [], note: "" };

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
  const [draft, setDraftRaw] = React.useState(EMPTY_DRAFT);
  const setDraft = (p) => setDraftRaw((d) => ({ ...d, ...p }));

  if (!st || (!fontsLoaded && !fontError)) return null;

  const route = st.route;
  const nav = (r) => patch({ route: r });

  const todayEntry = lastEntryForDate(st.entries, toISODate());

  const startCheckin = () => {
    setDraftRaw(EMPTY_DRAFT);
    nav("checkin1");
  };
  const saveCheckin = () => {
    const now = new Date();
    const entry = {
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

  const onTab = (id) => {
    if (id === "checkin") startCheckin();
    else nav(id);
  };
  const activeTab = route === "checkin1" || route === "checkin2" || route === "confirm" ? "checkin" : route;
  const confirmMood = draft.mood || (todayEntry && todayEntry.mood) || "napeti";
  const isOnboarding = route === "ob1" || route === "ob2" || route === "ob3";

  let screen = null;
  if (route === "ob1") {
    screen = <OnboardingName name={st.name} onName={(v) => patch({ name: v })} onNext={() => nav("ob2")} />;
  } else if (route === "ob2") {
    screen = <OnboardingAge age={st.age} onAge={(v) => patch({ age: v })} onNext={() => nav("ob3")} onBack={() => nav("ob1")} />;
  } else if (route === "ob3") {
    screen = <OnboardingPrivacy onDone={() => patch({ onboarded: true, route: "home" })} onBack={() => nav("ob2")} />;
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
    screen = <CheckinStep2 draft={draft} setDraft={setDraft} onBack={() => nav("checkin1")} onSave={saveCheckin} />;
  } else if (route === "confirm") {
    screen = <CheckinConfirm moodId={confirmMood} onHome={() => nav("home")} onOpenCalm={() => nav("calm")} />;
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
