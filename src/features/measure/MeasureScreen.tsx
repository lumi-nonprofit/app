/* The questionnaire (WHO-5, PHQ-9, GAD-7): one question per card, the progress at the top, the
   scale answers as large touch targets. The result goes into `measurements` right after the last
   answer.

   PHQ-9 question 9 (thoughts of death or self-harm): an answer above 0 leads to an empathetic
   interstitial instead of the result. It has a calm tone, the actions above the fold and no
   block (the person can continue to the result). */
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
import { HELP_LINES, toISODate } from "../../model";
import { useTranslation } from "../../i18n";
import { formatPercent } from "../../i18n/format";
import { useAppStore } from "../../store";
import { announce } from "../../lib/a11y";
import { haptics } from "../../lib/haptics";
import { useDiscardGuard } from "../../lib/useDiscardGuard";
import { INSTRUMENTS, PHQ9_RISK_QUESTION_INDEX, isMeasurementType } from "./definitions";
import { bandFor, scoreFor, trendText } from "./scoring";
import { createThemedStyles, useTheme } from "../../theme";

const DISCLAIMER_SEEN_KEY = "measure-disclaimer-seen";

/** The header of a question: the title is the name of the instrument. The left item is Close on
    the first question, then Back to the previous question (a step inside one route, not a pop of
    the stack). */
function QuestionHeader({
  title,
  first,
  onBack,
}: {
  title: string;
  first: boolean;
  onBack: () => void;
}) {
  const { t } = useTranslation("measure");
  const theme = useTheme();
  return (
    <Stack.Screen
      options={{
        title,
        gestureEnabled: true,
        ...headerItems(theme, {
          left: [
            first
              ? closeItem(onBack, t("header.close"))
              : backItem(onBack, t("header.previousQuestion")),
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
  // The key: a change of the route parameter (phq9 to gad7) must give the questionnaire a clean state.
  return <Measure key={type} type={type} />;
}

function Measure({ type }: { type: MeasurementType }) {
  const { t } = useTranslation(["measure", "common"]);
  const inst = INSTRUMENTS[type];
  const router = useRouter();
  const theme = useTheme();
  const styles = useStyles();
  const db = useDb();
  const write = useDbWriter();
  const { state } = useAppStore();

  /* The component reads the previous score for the trend once at the start, before it saves the
     new one. */
  const [prevScore] = React.useState<number | null>(() => {
    const list = listMeasurements(db, type);
    return list.length ? list[list.length - 1].score : null;
  });
  const [phase, setPhase] = React.useState<Phase>(() =>
    type !== "who5" && !getSetting<boolean>(db, DISCLAIMER_SEEN_KEY)
      ? { kind: "disclaimer" }
      : { kind: "question", index: 0, answers: [] },
  );

  /* Protection against a double tap: a fast second touch would land on an option of the next
     question (the same position on the screen). On PHQ-9 question 9 the person could answer the
     question about self-harm without intent. There are 3 layers:
     1. an index lock: only one answer passes per question,
     2. a time lockout of 250 ms from the timestamp of the touch (a bounce through the commit),
     3. a single measurement id and a synchronous save lock (a duplicate submit collides on the id,
        and `ON CONFLICT` drops it). */
  /* A questionnaire in progress (1 or more answers) does not close without a question: neither a
     swipe down nor Back. */
  useDiscardGuard({
    dirty: phase.kind === "question" && phase.answers.length > 0,
    title: t("discard.title"),
    message: t("discard.message"),
    confirmLabel: t("discard.confirm"),
  });

  /* The screen reader announces a step in the questionnaire: the number of the question, the
     interstitial and the result. */
  const questionIndex = phase.kind === "question" ? phase.index : -1;
  React.useEffect(() => {
    if (phase.kind === "question") {
      announce(t("question.progress", { number: phase.index + 1, total: inst.questions.length }));
    } else if (phase.kind === "support") {
      announce(t("support.announce"));
    } else if (phase.kind === "result") {
      announce(t("result.title"));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- The announcement follows a change of the step, not of the answers.
  }, [phase.kind, questionIndex]);

  const lastAnsweredIndex = React.useRef(-1);
  const lastAdvanceAt = React.useRef(0);
  const measurementId = React.useRef(newMeasurementId(type));
  const submitted = React.useRef(false);

  const answer = (value: number, e: GestureResponderEvent) => {
    if (phase.kind !== "question") return;
    if (lastAnsweredIndex.current >= phase.index) return; // A double tap on the same question.
    /* Without a timestamp (some test environments) the lockout does not block. */
    const ts = e.nativeEvent?.timestamp ?? lastAdvanceAt.current + 1000;
    if (ts - lastAdvanceAt.current < 250) return; // The bounce lands on the next question.
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
      lastAnsweredIndex.current = phase.index - 2; // The previous question can get a new answer.
      setPhase({
        kind: "question",
        index: phase.index - 1,
        answers: phase.answers.slice(0, phase.index - 1),
      });
    } else {
      router.back();
    }
  };

  /* ---------- the disclaimer (only PHQ-9 and GAD-7, only the first time) ---------- */
  if (phase.kind === "disclaimer") {
    return (
      <Screen contentStyle={styles.center}>
        <Stack.Screen
          options={{
            title: inst.title,
            ...headerItems(theme, { left: [closeItem(() => router.back(), t("header.close"))] }),
          }}
        />
        <View style={styles.headBlock}>
          <View style={styles.iconCircle}>
            <Icon name="shield" size={26} color={theme.colors.textInfo} />
          </View>
          <Text accessibilityRole="header" variant="title1" align="center">
            {t("disclaimer.title")}
          </Text>
          <Text variant="body" align="center">
            {t("disclaimer.text")}
          </Text>
        </View>
        <View style={styles.actions}>
          <Button
            size="lg"
            fullWidth
            onPress={() => {
              /* The code saves the flag at the consent, not after the completion: the person read
                 and confirmed the content, so a second read is not necessary. */
              write((d) => setSetting(d, DISCLAIMER_SEEN_KEY, true));
              setPhase({ kind: "question", index: 0, answers: [] });
            }}
          >
            {t("common:actions.continue")}
          </Button>
          <Button variant="ghost" fullWidth onPress={() => router.back()}>
            {t("disclaimer.notNow")}
          </Button>
        </View>
      </Screen>
    );
  }

  /* ---------- the questions ---------- */
  if (phase.kind === "question") {
    const total = inst.questions.length;
    const num = phase.index + 1;
    return (
      <Screen>
        <QuestionHeader title={inst.title} first={phase.index === 0} onBack={stepBack} />

        {/* The progress as text and as a bar: the information never comes from colour alone. The
            bar is decorative for screen readers, because the text "Otázka X z Y" carries the
            progress. */}
        <View>
          <Text variant="footnote" weight="semibold" color="textMuted" style={styles.progressText}>
            {t("question.progress", { number: num, total })}
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
              accessibilityHint={t("question.answer.a11yHint", { number: num, total })}
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

  /* ---------- the interstitial after PHQ-9 question 9 above 0 ---------- */
  if (phase.kind === "support") {
    /* Without a known age, the line for adults is the safer choice (the line for children has an
       age limit). */
    const line = state.age === "u26" ? HELP_LINES.u26 : HELP_LINES.plus27;
    return (
      <Screen contentStyle={styles.center}>
        {/* The interstitial has no swipe and no close item: only the actions below lead out. */}
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
            {t("support.title")}
          </Text>
          <Text variant="body" align="center">
            {t("support.text")}
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
            {t("support.openHelp")}
          </Button>
          <Button
            variant="secondary"
            size="lg"
            fullWidth
            href={`tel:${line.phone.replace(/\s/g, "")}`}
          >
            {t("support.call", { line: line.nameDative, phone: line.phone })}
          </Button>
          <Button
            variant="ghost"
            fullWidth
            onPress={() => setPhase({ kind: "result", score: phase.score })}
          >
            {t("support.continueToResult")}
          </Button>
        </View>
      </Screen>
    );
  }

  /* ---------- the result ---------- */
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
            label={formatPercent(phase.score)}
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
          {t("result.title")}
        </Text>
        <Text variant="body" align="center">
          {type === "who5"
            ? prevScore === null
              ? t("result.who5.first")
              : t("result.who5.next")
            : band?.text}
        </Text>
        {type !== "who5" ? (
          <Text variant="footnote" color="textMuted">
            {t("result.score", { count: phase.score, max: inst.maxScore })}
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
          {t("common:actions.done")}
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
