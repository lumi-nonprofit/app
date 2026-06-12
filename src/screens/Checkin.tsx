/* Check-in — dvoukrokový flow + potvrzení.
   Krok 1: stav (podstatná jména, barva + tvar) a intenzita.
   Krok 2: upřesňující slova (1–2), kontextové štítky, nepovinná poznámka.
   Potvrzení: rodově neutrální, s kontextovým tipem podle stavu. */
import React from "react";
import type { ComponentProps } from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import Slider from "@react-native-community/slider";
import { Badge, Button, Card, Chip, Icon, IconButton, Input, ListItem } from "../ds/index";
import { LumiHeader, SectionLabel } from "../components/Header";
import LumiCTA from "../components/CTA";
import MoodShape from "../components/MoodShape";
import Screen from "../components/Screen";
import { CONTEXT_TAGS, INTENSITY_LABELS, MOODS, MOOD_BY_ID, MOOD_WORDS } from "../model";
import type { CheckinDraft, Intensity, MoodId } from "../model";
import { palette, colors, radius, font, leading, tracking, shadow } from "../theme";

/* ---------- krok 1 ---------- */
interface CheckinStep1Props {
  draft: CheckinDraft;
  setDraft: (p: Partial<CheckinDraft>) => void;
  onNext: () => void;
}

export function CheckinStep1({ draft, setDraft, onNext }: CheckinStep1Props) {
  return (
    <Screen>
      <LumiHeader kicker="Check-in · krok 1 ze 2" title="Jak se právě teď cítíš?" />

      <View
        accessibilityRole="radiogroup"
        accessibilityLabel="Jak se právě teď cítíš?"
        accessibilityHint="Vyber stav, který je teď nejblíž."
        style={styles.quadGrid}
      >
        {MOODS.map((m) => {
          const is = draft.mood === m.id;
          return (
            <Pressable
              key={m.id}
              accessibilityRole="radio"
              accessibilityState={{ checked: is }}
              style={({ pressed }) => [
                styles.quad,
                { backgroundColor: m.soft },
                is && styles.quadSelected,
                pressed && { transform: [{ scale: 0.98 }] },
              ]}
              onPress={() => setDraft({ mood: m.id, words: [] })}
            >
              <MoodShape mood={m} size={22} />
              <View>
                <Text style={styles.quadName}>{m.name}</Text>
                <Text style={styles.quadAxis}>{m.axis}</Text>
              </View>
            </Pressable>
          );
        })}
      </View>

      {/* intenzita */}
      <Card style={styles.intensityCard}>
        <View style={styles.intensityHead}>
          <Text style={styles.intensityLabel}>Jak silné to je?</Text>
          <Text style={styles.intensityValue}>{INTENSITY_LABELS[draft.intensity - 1]}</Text>
        </View>
        <Slider
          minimumValue={1}
          maximumValue={5}
          step={1}
          value={draft.intensity}
          accessibilityLabel="Intenzita"
          accessibilityHint="Posunem vybereš sílu pocitu, od jen lehce po hodně silně."
          accessibilityValue={{ text: INTENSITY_LABELS[draft.intensity - 1] }}
          minimumTrackTintColor={palette.sun400}
          maximumTrackTintColor={palette.cream200}
          thumbTintColor={palette.sun500}
          style={styles.slider}
          /* slider má step 1 v rozsahu 1–5, hodnota je tedy vždy Intensity */
          onValueChange={(v) => setDraft({ intensity: v as Intensity })}
        />
        <View style={styles.intensityScale}>
          <Text style={styles.intensityScaleText}>jen lehce</Text>
          <Text style={styles.intensityScaleText}>hodně silně</Text>
        </View>
      </Card>

      <LumiCTA
        disabled={!draft.mood}
        onPress={onNext}
        hint="Nejdřív klepni na stav, který je teď nejblíž."
      >
        Pokračovat
      </LumiCTA>
    </Screen>
  );
}

/* ---------- krok 2 ---------- */
interface CheckinStep2Props {
  draft: CheckinDraft;
  setDraft: (p: Partial<CheckinDraft>) => void;
  onBack: () => void;
  onSave: () => void;
}

export function CheckinStep2({ draft, setDraft, onBack, onSave }: CheckinStep2Props) {
  /* draft.mood může být null — fallback za `||` to jistí, přetypování jen pro index */
  const mood = MOOD_BY_ID[draft.mood as MoodId] || MOOD_BY_ID.napeti;
  const words = MOOD_WORDS[mood.id];
  const toggleWord = (w: string) => {
    const has = draft.words.includes(w);
    if (has) setDraft({ words: draft.words.filter((x) => x !== w) });
    else if (draft.words.length < 2) setDraft({ words: [...draft.words, w] });
  };
  const toggleTag = (t: string) => {
    const has = draft.tags.includes(t);
    setDraft({ tags: has ? draft.tags.filter((x) => x !== t) : [...draft.tags, t] });
  };
  return (
    <Screen>
      <View style={styles.backRow}>
        <IconButton icon="arrow-left" label="Zpět na krok 1" onPress={onBack} />
        <Text style={styles.kicker}>Check-in · krok 2 ze 2</Text>
      </View>
      <LumiHeader title="Které slovo to vystihuje nejlíp?" />

      {/* shrnutí zvoleného stavu */}
      <View style={[styles.moodSummary, { backgroundColor: mood.soft }]}>
        <MoodShape mood={mood} size={18} />
        <Text style={styles.moodSummaryName}>{mood.name}</Text>
        <Text style={styles.moodSummaryIntensity}>· {INTENSITY_LABELS[draft.intensity - 1]}</Text>
      </View>

      <View>
        <Text style={styles.wordsHint}>Vyber jedno nebo dvě.</Text>
        <View style={styles.chipWrap}>
          {words.map((w) => (
            <Chip key={w} selected={draft.words.includes(w)} onPress={() => toggleWord(w)}>
              {w}
            </Chip>
          ))}
        </View>
      </View>

      <View>
        <Text style={styles.tagsLabel}>Co s tím souvisí?</Text>
        <View style={styles.chipWrap}>
          {CONTEXT_TAGS.map((t) => (
            <Chip key={t} selected={draft.tags.includes(t)} onPress={() => toggleTag(t)}>
              {t}
            </Chip>
          ))}
        </View>
      </View>

      <Input
        label="Poznámka"
        placeholder="Co máš na srdci? (nepovinné)"
        multiline
        value={draft.note}
        onChangeText={(v) => setDraft({ note: v })}
      />

      <LumiCTA
        disabled={draft.words.length === 0}
        onPress={onSave}
        hint="Vyber aspoň jedno slovo — pomáhá v Přehledech."
      >
        Uložit zápis
      </LumiCTA>
    </Screen>
  );
}

/* ---------- potvrzení ---------- */
/* typy ikony a tónu odvozené z DS komponent — drží se v synchronu s jejich sadou */
type TipIconName = ComponentProps<typeof Icon>["name"];
type TipBadgeTone = NonNullable<ComponentProps<typeof Badge>["tone"]>;

interface ConfirmTip {
  icon: TipIconName;
  tint: string;
  color: string;
  title: string;
  subtitle: string;
  badge: [TipBadgeTone, string] | null;
}

const CONFIRM_TIPS: Record<MoodId, ConfirmTip> = {
  napeti: {
    icon: "wind",
    tint: colors.accentSoft,
    color: palette.sun700,
    title: "Dech 4-7-8",
    subtitle: "Pomáhá při napětí",
    badge: ["accent", "3 min"],
  },
  utlum: {
    icon: "moon",
    tint: palette.lilac100,
    color: palette.lilac700,
    title: "Klidné usínání",
    subtitle: "Zvuky a audio na dobrou noc",
    badge: ["lilac", "večer"],
  },
  energie: {
    icon: "notebook-pen",
    tint: colors.positiveSoft,
    color: palette.sage700,
    title: "Zápis do deníku",
    subtitle: "Zachyť, co se dnes povedlo",
    badge: null,
  },
  klid: {
    icon: "footprints",
    tint: colors.positiveSoft,
    color: palette.sage700,
    title: "Všímavá procházka",
    subtitle: "Meditace v pohybu · venku",
    badge: ["positive", "venku"],
  },
};

interface CheckinConfirmProps {
  moodId: MoodId;
  onHome: () => void;
  onOpenCalm: () => void;
}

export function CheckinConfirm({ moodId, onHome, onOpenCalm }: CheckinConfirmProps) {
  const tip = CONFIRM_TIPS[moodId] || CONFIRM_TIPS.napeti;
  return (
    <Screen contentStyle={{ justifyContent: "center" }}>
      <View style={styles.confirmHero}>
        <View style={styles.confirmCircle}>
          <Icon name="check" size={36} strokeWidth={2.2} color={palette.sun700} />
        </View>
        <View>
          <Text accessibilityRole="header" style={styles.confirmTitle}>
            Uloženo.
          </Text>
          <Text style={styles.confirmBody}>
            Tohle byla chvilka pro tebe.
            {"\n"}
            Záznam zůstává v telefonu.
          </Text>
        </View>
      </View>

      <View style={styles.tipBlock}>
        <SectionLabel>Mohlo by teď sednout</SectionLabel>
        <Card style={styles.tipCard}>
          <ListItem
            icon={tip.icon}
            iconTint={tip.tint}
            iconColor={tip.color}
            title={tip.title}
            subtitle={tip.subtitle}
            trailing={tip.badge ? <Badge tone={tip.badge[0]}>{tip.badge[1]}</Badge> : null}
            onPress={onOpenCalm}
          />
        </Card>
      </View>

      <View style={styles.homeBlock}>
        <Button variant="secondary" size="lg" fullWidth onPress={onHome}>
          Zpět na Dnes
        </Button>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  /* krok 1 — mřížka kvadrantů (web: grid 1fr 1fr, .lumi-quad) */
  quadGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  quad: {
    flexBasis: "47%",
    flexGrow: 1,
    minHeight: 96,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: "transparent",
    padding: 14,
    justifyContent: "space-between",
    gap: 10,
  },
  quadSelected: { borderColor: palette.sun400, ...shadow.glow },
  quadName: {
    ...font.display(600),
    fontSize: 16,
    lineHeight: leading.body(16),
    color: colors.textStrong,
  },
  quadAxis: {
    ...font.body(400),
    fontSize: 12,
    lineHeight: leading.body(12),
    color: palette.ink700,
    marginTop: 1,
  },

  /* krok 1 — intenzita */
  intensityCard: { paddingTop: 16, paddingHorizontal: 20, paddingBottom: 12 },
  intensityHead: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "baseline",
    marginBottom: 2,
  },
  intensityLabel: {
    ...font.body(600),
    fontSize: 14.5,
    lineHeight: leading.body(14.5),
    color: colors.textBody,
  },
  intensityValue: {
    ...font.body(600),
    fontSize: 13.5,
    lineHeight: leading.body(13.5),
    color: palette.sun700,
  },
  slider: { height: 44 },
  intensityScale: { flexDirection: "row", justifyContent: "space-between" },
  intensityScaleText: {
    ...font.body(400),
    fontSize: 12.5,
    lineHeight: leading.body(12.5),
    color: palette.ink700,
  },

  /* krok 2 */
  backRow: { flexDirection: "row", alignItems: "center", gap: 8, marginHorizontal: -6 },
  kicker: {
    ...font.body(600),
    fontSize: 11,
    letterSpacing: tracking.label(11),
    textTransform: "uppercase",
    color: palette.ink700,
  },
  moodSummary: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderRadius: radius.md,
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  moodSummaryName: {
    ...font.body(600),
    fontSize: 14.5,
    lineHeight: leading.body(14.5),
    color: colors.textStrong,
  },
  moodSummaryIntensity: {
    ...font.body(400),
    fontSize: 13,
    lineHeight: leading.body(13),
    color: palette.ink700,
  },
  wordsHint: {
    ...font.body(400),
    fontSize: 13.5,
    lineHeight: leading.body(13.5),
    color: palette.ink700,
    marginBottom: 8,
  },
  tagsLabel: {
    ...font.body(600),
    fontSize: 14.5,
    lineHeight: leading.body(14.5),
    color: colors.textBody,
    marginTop: 4,
    marginBottom: 8,
  },
  chipWrap: { flexDirection: "row", flexWrap: "wrap", gap: 8 },

  /* potvrzení */
  confirmHero: { alignItems: "center", gap: 16 },
  confirmCircle: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: colors.accentSoft,
    alignItems: "center",
    justifyContent: "center",
    ...shadow.glow,
  },
  confirmTitle: {
    ...font.display(700),
    fontSize: 28,
    lineHeight: leading.tight(28),
    letterSpacing: tracking.display(28),
    color: colors.textStrong,
    textAlign: "center",
    marginBottom: 8,
  },
  confirmBody: {
    ...font.body(400),
    fontSize: 16,
    lineHeight: leading.body(16),
    color: colors.textBody,
    textAlign: "center",
  },
  tipBlock: { marginTop: 28 },
  tipCard: { paddingVertical: 8, paddingHorizontal: 12, marginTop: 6 },
  homeBlock: { marginTop: 16 },
});
