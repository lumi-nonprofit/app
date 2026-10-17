/* Dotazník (WHO-5 / PHQ-9 / GAD-7): jedna otázka na kartu, progres nahoře,
   škálové odpovědi jako velké dotykové cíle. Výsledek se ukládá do
   `measurements` hned po poslední odpovědi.

   PHQ-9 otázka 9 (myšlenky na smrt / sebepoškození): odpověď > 0 vede
   místo výsledku na empatickou mezistránku — klidný tón, akce nad foldem,
   žádné blokování (k výsledku se dá pokračovat). */
import React from "react";
import { Pressable, View, type GestureResponderEvent } from "react-native";
import { Redirect, Stack, useLocalSearchParams, useRouter } from "expo-router";
import { Button, Icon, ProgressRing, Text } from "../../ds";
import { pressFeedback, pressedStyle } from "../../ds/press";
import { backItem, closeItem, headerItems } from "../../components/HeaderItems";
import Screen from "../../components/Screen";
import { useDb } from "../../db/provider";
import { useDbWriter } from "../../db/hooks";
import {
  getSetting,
  insertMeasurement,
  listMeasurements,
  newMeasurementId,
  setSetting,
  type MeasurementType,
} from "../../db/repo";
import { HELP_LINES, toISODate, czPlural } from "../../model";
import { useAppStore } from "../../store";
import { haptics } from "../../lib/haptics";
import { useDiscardGuard } from "../../lib/useDiscardGuard";
import { INSTRUMENTS, PHQ9_RISK_QUESTION_INDEX, isMeasurementType } from "./definitions";
import { bandFor, scoreFor, trendText } from "./scoring";
import { createThemedStyles, useTheme } from "../../theme";

const DISCLAIMER_SEEN_KEY = "measure-disclaimer-seen";

/** Hlavička otázky: titulek = název nástroje; vlevo Zavřít u první otázky,
    pak Zpět na předchozí otázku (krok uvnitř jedné routy, ne pop stacku). */
function QuestionHeader({
  title,
  first,
  onBack,
}: {
  title: string;
  first: boolean;
  onBack: () => void;
}) {
  const theme = useTheme();
  return (
    <Stack.Screen
      options={{
        title,
        gestureEnabled: true,
        ...headerItems(theme, {
          left: [
            first ? closeItem(onBack, "Zavřít dotazník") : backItem(onBack, "Předchozí otázka"),
          ],
        }),
      }}
    />
  );
}

type Phase =
  | { kind: "disclaimer" }
  | { kind: "question"; index: number; answers: number[] }
  | { kind: "support"; score: number }
  | { kind: "result"; score: number };

export default function MeasureScreen() {
  const { type } = useLocalSearchParams<{ type?: string }>();
  if (!isMeasurementType(type)) return <Redirect href="/" />;
  // key: změna parametru routy (phq9 → gad7) musí znamenat čistý stav dotazníku
  return <Measure key={type} type={type} />;
}

function Measure({ type }: { type: MeasurementType }) {
  const inst = INSTRUMENTS[type];
  const router = useRouter();
  const theme = useTheme();
  const styles = useStyles();
  const db = useDb();
  const write = useDbWriter();
  const { state } = useAppStore();

  /* předchozí skóre pro trend — čte se jednou při otevření, před uložením nového */
  const [prevScore] = React.useState<number | null>(() => {
    const list = listMeasurements(db, type);
    return list.length ? list[list.length - 1].score : null;
  });
  const [phase, setPhase] = React.useState<Phase>(() =>
    type !== "who5" && !getSetting<boolean>(db, DISCLAIMER_SEEN_KEY)
      ? { kind: "disclaimer" }
      : { kind: "question", index: 0, answers: [] },
  );

  /* ochrana proti dvojkliku: rychlý druhý dotek by dopadl na možnost
     DALŠÍ otázky (stejná pozice na obrazovce) — u PHQ-9 ot. 9 by tak šlo
     nevědomky odpovědět na otázku o sebepoškození. Tři vrstvy:
     1. index-zámek: na jednu otázku projde jen jedna odpověď,
     2. časový lockout 250 ms z timestampu dotyku (odraz přes commit),
     3. jednorázové id měření + synchronní zámek uložení (duplicitní
        submit koliduje na id a ON CONFLICT ho zahodí). */
  /* rozpracovaný dotazník (≥ 1 odpověď) se nezavře bez dotazu — swipe-down ani Back */
  useDiscardGuard({
    dirty: phase.kind === "question" && phase.answers.length > 0,
    title: "Ukončit dotazník?",
    message: "Dosavadní odpovědi se neuloží.",
    confirmLabel: "Ukončit",
  });

  const lastAnsweredIndex = React.useRef(-1);
  const lastAdvanceAt = React.useRef(0);
  const measurementId = React.useRef(newMeasurementId(type));
  const submitted = React.useRef(false);

  const answer = (value: number, e: GestureResponderEvent) => {
    if (phase.kind !== "question") return;
    if (lastAnsweredIndex.current >= phase.index) return; // dvojklik na téže otázce
    /* bez timestampu (některá testovací prostředí) lockout neblokuje */
    const ts = e.nativeEvent?.timestamp ?? lastAdvanceAt.current + 1000;
    if (ts - lastAdvanceAt.current < 250) return; // odraz dopadl na další otázku
    lastAdvanceAt.current = ts;
    lastAnsweredIndex.current = phase.index;
    haptics.select();

    const answers = [...phase.answers, value];
    if (answers.length < inst.questions.length) {
      setPhase({ kind: "question", index: answers.length, answers });
      return;
    }
    if (submitted.current) return;
    submitted.current = true;
    const score = scoreFor(type, answers);
    write((d) =>
      insertMeasurement(d, {
        id: measurementId.current,
        type,
        score,
        date: toISODate(),
        answers,
      }),
    );
    if (type === "phq9" && answers[PHQ9_RISK_QUESTION_INDEX] > 0) {
      setPhase({ kind: "support", score });
    } else {
      setPhase({ kind: "result", score });
    }
  };

  const stepBack = () => {
    if (phase.kind === "question" && phase.index > 0) {
      lastAnsweredIndex.current = phase.index - 2; // předchozí otázka jde zodpovědět znovu
      setPhase({
        kind: "question",
        index: phase.index - 1,
        answers: phase.answers.slice(0, phase.index - 1),
      });
    } else {
      router.back();
    }
  };

  /* ---------- disclaimer (jen PHQ-9 / GAD-7, jen poprvé) ---------- */
  if (phase.kind === "disclaimer") {
    return (
      <Screen contentStyle={styles.center}>
        <Stack.Screen
          options={{
            title: inst.title,
            ...headerItems(theme, { left: [closeItem(() => router.back(), "Zavřít dotazník")] }),
          }}
        />
        <View style={styles.headBlock}>
          <View style={styles.iconCircle}>
            <Icon name="shield" size={26} color={theme.colors.textInfo} />
          </View>
          <Text accessibilityRole="header" variant="title1" align="center">
            Než začneš
          </Text>
          <Text variant="body" align="center">
            Tohle je orientační screeningový nástroj. Nenahrazuje vyšetření ani rozhovor s
            odborníkem — pomáhá všímat si, jak se máš. Výsledky zůstávají jen v tvém telefonu.
          </Text>
        </View>
        <View style={styles.actions}>
          <Button
            size="lg"
            fullWidth
            onPress={() => {
              /* flag se ukládá při odsouhlasení (ne až po dokončení) — záměr:
                 obsah byl přečtený a potvrzený, druhé čtení nevnucujeme */
              write((d) => setSetting(d, DISCLAIMER_SEEN_KEY, true));
              setPhase({ kind: "question", index: 0, answers: [] });
            }}
          >
            Rozumím, pokračovat
          </Button>
          <Button variant="ghost" fullWidth onPress={() => router.back()}>
            Teď ne
          </Button>
        </View>
      </Screen>
    );
  }

  /* ---------- otázky ---------- */
  if (phase.kind === "question") {
    const total = inst.questions.length;
    const num = phase.index + 1;
    return (
      <Screen>
        <QuestionHeader title={inst.title} first={phase.index === 0} onBack={stepBack} />

        {/* progres: text i pruh — informace nikdy jen barvou; pruh je pro
            čtečky dekorativní (text „Otázka X z Y“ už postup nese) */}
        <View>
          <Text variant="footnote" weight="semibold" color="textMuted" style={styles.progressText}>
            {`Otázka ${num} z ${total}`}
          </Text>
          <View
            accessibilityElementsHidden
            importantForAccessibility="no-hide-descendants"
            style={styles.progressTrack}
          >
            <View style={[styles.progressFill, { width: `${(num / total) * 100}%` }]} />
          </View>
        </View>

        <View style={styles.questionBlock}>
          <Text variant="subheadline" color="textMuted" style={styles.intro}>
            {inst.intro}
          </Text>
          <Text accessibilityRole="header" variant="title2">
            {inst.questions[phase.index]}
          </Text>
        </View>

        <View style={styles.options}>
          {inst.options.map((o) => (
            <Pressable
              key={o.value}
              accessibilityRole="button"
              accessibilityHint={`Odpověď na otázku ${num} z ${total}.`}
              onPress={(e) => answer(o.value, e)}
              {...pressFeedback(theme)}
              style={({ pressed }) => [
                styles.option,
                pressed && styles.optionPressed,
                pressedStyle(theme, pressed),
              ]}
            >
              <Text variant="body" weight="semibold" color="textStrong">
                {o.label}
              </Text>
            </Pressable>
          ))}
        </View>
      </Screen>
    );
  }

  /* ---------- mezistránka po PHQ-9 ot. 9 > 0 ---------- */
  if (phase.kind === "support") {
    /* bez známého věku radši linka pro dospělé (dětská je věkově omezená) */
    const line = state.age === "u26" ? HELP_LINES.u26 : HELP_LINES.plus27;
    return (
      <Screen contentStyle={styles.center}>
        {/* mezistránka se nedá odswipovat ani zavřít křížkem — ven vedou jen akce níž */}
        <Stack.Screen
          options={{
            title: inst.title,
            gestureEnabled: false,
            headerBackVisible: false,
            ...headerItems(theme, {}),
          }}
        />
        <View style={styles.headBlock}>
          <View style={styles.iconCircle}>
            <Icon name="heart-handshake" size={26} color={theme.colors.textDanger} />
          </View>
          <Text accessibilityRole="header" variant="title1" align="center">
            Děkujeme za upřímnost.
          </Text>
          <Text variant="body" align="center">
            Tahle odpověď je důležitá. Nemusíš v tom zůstávat o samotě — pomoc je tu i teď a
            možností je víc, než se může zdát.
          </Text>
        </View>
        <View style={styles.actions}>
          <Button
            variant="crisis"
            size="lg"
            fullWidth
            onPress={() => {
              router.dismissAll();
              router.navigate("/help");
            }}
          >
            Otevřít Pomoc
          </Button>
          <Button
            variant="secondary"
            size="lg"
            fullWidth
            href={`tel:${line.phone.replace(/\s/g, "")}`}
          >
            {`Zavolat ${line.nameDative} · ${line.phone}`}
          </Button>
          <Button
            variant="ghost"
            fullWidth
            onPress={() => setPhase({ kind: "result", score: phase.score })}
          >
            Pokračovat k výsledku
          </Button>
        </View>
      </Screen>
    );
  }

  /* ---------- výsledek ---------- */
  const band = bandFor(type, phase.score);
  const trend = trendText(phase.score, prevScore, type === "who5" ? "percent" : "points");
  return (
    <Screen contentStyle={styles.center}>
      <Stack.Screen
        options={{
          title: inst.title,
          gestureEnabled: true,
          headerBackVisible: false,
          ...headerItems(theme, {}),
        }}
      />
      <View style={styles.headBlock}>
        {type === "who5" ? (
          <ProgressRing
            value={phase.score / 100}
            size={110}
            label={`${phase.score} %`}
            sublabel="WHO-5"
          />
        ) : (
          <View style={styles.bandBadge}>
            <Text variant="body" weight="bold" color="textStrong">
              {band?.label}
            </Text>
          </View>
        )}
        <Text accessibilityRole="header" variant="title1" align="center">
          Hotovo. Díky za chvilku.
        </Text>
        <Text variant="body" align="center">
          {type === "who5"
            ? prevScore === null
              ? "Tvůj výchozí bod. Index uvidíš na Dnes i v Přehledech — vždycky jen vůči tvým vlastním datům."
              : "Index uvidíš na Dnes i v Přehledech — vždycky jen vůči tvým vlastním datům."
            : band?.text}
        </Text>
        {type !== "who5" ? (
          <Text variant="footnote" color="textMuted">
            {`${phase.score} ${czPlural(phase.score, ["bod", "body", "bodů"])} z ${inst.maxScore}`}
          </Text>
        ) : null}
        {trend ? (
          <Text variant="footnote" weight="semibold" color="textMuted">
            {trend}
          </Text>
        ) : null}
      </View>
      <View style={styles.actions}>
        <Button size="lg" fullWidth onPress={() => router.back()}>
          Hotovo
        </Button>
      </View>
    </Screen>
  );
}

const useStyles = createThemedStyles((t) => ({
  center: { justifyContent: "center" },
  progressText: { marginBottom: 6 },
  progressTrack: {
    height: 6,
    borderRadius: t.radius.pill,
    backgroundColor: t.colors.borderSubtle,
    overflow: "hidden",
  },
  progressFill: { height: 6, borderRadius: t.radius.pill, backgroundColor: t.colors.accentFill },

  questionBlock: { marginTop: 10, marginBottom: 4 },
  intro: { marginBottom: 8 },

  options: { gap: 10 },
  option: {
    minHeight: t.platform.listRowMinHeight,
    justifyContent: "center",
    paddingVertical: 14,
    paddingHorizontal: 18,
    backgroundColor: t.colors.surfaceCard,
    borderRadius: t.radius.md,
    borderWidth: 1.5,
    borderColor: t.scheme === "dark" ? t.colors.borderSubtle : "transparent",
    overflow: "hidden",
    ...t.elevation.card,
  },
  optionPressed: { borderColor: t.colors.selectionBorder },

  headBlock: { alignItems: "center", gap: 14 },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: t.colors.surfaceSunken,
    alignItems: "center",
    justifyContent: "center",
  },
  bandBadge: {
    paddingVertical: 8,
    paddingHorizontal: 18,
    borderRadius: t.radius.pill,
    backgroundColor: t.colors.surfaceSunken,
  },
  actions: { marginTop: 28, gap: 10 },
}));
