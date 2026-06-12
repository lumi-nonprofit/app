/* Dotazník (WHO-5 / PHQ-9 / GAD-7): jedna otázka na kartu, progres nahoře,
   škálové odpovědi jako velké dotykové cíle. Výsledek se ukládá do
   `measurements` hned po poslední odpovědi.

   PHQ-9 otázka 9 (myšlenky na smrt / sebepoškození): odpověď > 0 vede
   místo výsledku na empatickou mezistránku — klidný tón, akce nad foldem,
   žádné blokování (k výsledku se dá pokračovat). */
import React from "react";
import { Pressable, StyleSheet, Text, View, type GestureResponderEvent } from "react-native";
import { Redirect, useLocalSearchParams, useRouter } from "expo-router";
import { Button, Icon, IconButton, ProgressRing } from "../../ds/index";
import LumiCTA from "../../components/CTA";
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
import { INSTRUMENTS, PHQ9_RISK_QUESTION_INDEX, isMeasurementType } from "./definitions";
import { bandFor, scoreFor, trendText } from "./scoring";
import { palette, colors, radius, font, leading, tracking, shadow, type } from "../../theme";

const DISCLAIMER_SEEN_KEY = "measure-disclaimer-seen";

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
        submit kolidí na id a ON CONFLICT ho zahodí). */
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
        <View style={styles.headBlock}>
          <View style={styles.iconCircle}>
            <Icon name="shield" size={26} color={palette.lake700} />
          </View>
          <Text accessibilityRole="header" style={styles.title}>
            Než začneš
          </Text>
          <Text style={styles.body}>
            Tohle je orientační screeningový nástroj. Nenahrazuje vyšetření ani rozhovor s
            odborníkem — pomáhá všímat si, jak se máš. Výsledky zůstávají jen v tvém telefonu.
          </Text>
        </View>
        <View style={styles.actions}>
          <LumiCTA
            onPress={() => {
              /* flag se ukládá při odsouhlasení (ne až po dokončení) — záměr:
                 obsah byl přečtený a potvrzený, druhé čtení nevnucujeme */
              write((d) => setSetting(d, DISCLAIMER_SEEN_KEY, true));
              setPhase({ kind: "question", index: 0, answers: [] });
            }}
          >
            Rozumím, pokračovat
          </LumiCTA>
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
        <View style={styles.topRow}>
          <IconButton
            icon="arrow-left"
            label={phase.index > 0 ? "Předchozí otázka" : "Zavřít dotazník"}
            onPress={stepBack}
          />
          <Text style={styles.kicker}>{inst.title}</Text>
        </View>

        {/* progres: text i pruh — informace nikdy jen barvou; pruh je pro
            čtečky dekorativní (text „Otázka X z Y“ už postup nese) */}
        <View>
          <Text style={styles.progressText}>{`Otázka ${num} z ${total}`}</Text>
          <View
            accessibilityElementsHidden
            importantForAccessibility="no-hide-descendants"
            style={styles.progressTrack}
          >
            <View style={[styles.progressFill, { width: `${(num / total) * 100}%` }]} />
          </View>
        </View>

        <View style={styles.questionBlock}>
          <Text style={styles.intro}>{inst.intro}</Text>
          <Text accessibilityRole="header" style={styles.question}>
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
              style={({ pressed }) => [styles.option, pressed && styles.optionPressed]}
            >
              <Text style={styles.optionLabel}>{o.label}</Text>
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
        <View style={styles.headBlock}>
          <View style={styles.iconCircle}>
            <Icon name="heart-handshake" size={26} color={palette.clay700} />
          </View>
          <Text accessibilityRole="header" style={styles.title}>
            Děkujeme za upřímnost.
          </Text>
          <Text style={styles.body}>
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
            <Text style={styles.bandLabel}>{band?.label}</Text>
          </View>
        )}
        <Text accessibilityRole="header" style={styles.title}>
          Hotovo. Díky za chvilku.
        </Text>
        <Text style={styles.body}>
          {type === "who5"
            ? prevScore === null
              ? "Tvůj výchozí bod. Index uvidíš na Dnes i v Přehledech — vždycky jen vůči tvým vlastním datům."
              : "Index uvidíš na Dnes i v Přehledech — vždycky jen vůči tvým vlastním datům."
            : band?.text}
        </Text>
        {type !== "who5" ? (
          <Text style={styles.scoreNote}>
            {`${phase.score} ${czPlural(phase.score, ["bod", "body", "bodů"])} z ${inst.maxScore}`}
          </Text>
        ) : null}
        {trend ? <Text style={styles.trend}>{trend}</Text> : null}
      </View>
      <View style={styles.actions}>
        <LumiCTA onPress={() => router.back()}>Hotovo</LumiCTA>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: { justifyContent: "center" },
  topRow: { flexDirection: "row", alignItems: "center", gap: 8, marginHorizontal: -6 },
  kicker: {
    ...font.body(600),
    fontSize: type.xxs,
    letterSpacing: tracking.label(type.xxs),
    textTransform: "uppercase",
    color: palette.ink700,
  },

  progressText: {
    ...font.body(600),
    fontSize: type.sm,
    color: palette.ink700,
    marginBottom: 6,
  },
  progressTrack: {
    height: 6,
    borderRadius: radius.pill,
    backgroundColor: palette.cream200,
    overflow: "hidden",
  },
  progressFill: { height: 6, borderRadius: radius.pill, backgroundColor: palette.sun500 },

  questionBlock: { marginTop: 10, marginBottom: 4 },
  intro: {
    ...font.body(400),
    fontSize: type.sm,
    lineHeight: leading.body(type.sm),
    color: palette.ink700,
    marginBottom: 8,
  },
  question: {
    ...font.display(700),
    fontSize: type.lg,
    lineHeight: leading.snug(type.lg),
    letterSpacing: tracking.display(type.lg),
    color: colors.textStrong,
  },

  options: { gap: 10 },
  option: {
    minHeight: 56,
    justifyContent: "center",
    paddingVertical: 14,
    paddingHorizontal: 18,
    backgroundColor: colors.surfaceCard,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: "transparent",
    ...shadow.card,
  },
  optionPressed: { borderColor: palette.sun400, transform: [{ scale: 0.99 }] },
  optionLabel: { ...font.body(600), fontSize: type.base, color: colors.textStrong },

  headBlock: { alignItems: "center", gap: 14 },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.surfaceSunken,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    ...font.display(700),
    fontSize: type.xl,
    lineHeight: leading.tight(type.xl),
    letterSpacing: tracking.display(type.xl),
    color: colors.textStrong,
    textAlign: "center",
  },
  body: {
    ...font.body(400),
    fontSize: type.base,
    lineHeight: leading.body(type.base),
    color: colors.textBody,
    textAlign: "center",
  },
  scoreNote: { ...font.body(400), fontSize: type.sm, color: palette.ink700 },
  trend: { ...font.body(600), fontSize: type.sm, color: palette.ink700 },
  bandBadge: {
    paddingVertical: 8,
    paddingHorizontal: 18,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceSunken,
  },
  bandLabel: { ...font.body(700), fontSize: type.base, color: colors.textStrong },
  actions: { marginTop: 28, gap: 10 },
});
