/* Dnes — domovská obrazovka. Stavy jsou datové: bez WHO-5 měření se místo
   procenta zobrazí výzva k prvnímu dotazníku (varianta „první den“),
   po dnešním zápisu se check-in karta změní na shrnutí. */
import { StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import type { Href } from "expo-router";
import { Badge, Button, Card, Icon, ListItem, ProgressRing } from "../../ds";
import { LumiHeader, SectionLabel } from "../../components/Header";
import MoodShape from "../../components/MoodShape";
import Screen from "../../components/Screen";
import {
  MOOD_BY_ID,
  RECOMMENDATIONS,
  czGreeting,
  czToday,
  lastEntryForDate,
  latestWho5,
  toISODate,
  who5HomeText,
} from "../../model";
import { useAppStore } from "../../store";
import { useEntries, useMeasurements } from "../../db/hooks";
import { colors, font, leading, palette, radius, space, type } from "../../theme";

export default function HomeScreen() {
  const { state } = useAppStore();
  const router = useRouter();
  const name = state.name.trim();
  const today = toISODate();
  const todayEntry = lastEntryForDate(useEntries({ from: today, to: today }), today);
  const who5 = useMeasurements("who5");

  const startCheckin = () => router.push("/checkin");
  const openHelp = () => router.push("/help");
  const openStats = () => router.push("/stats");

  /* mood je non-null vždy, když existuje todayEntry — TS to přes ternár
     nenarrowuje, proto níže `mood!` (čistě typová aserce, bez vlivu na runtime) */
  const mood = todayEntry ? MOOD_BY_ID[todayEntry.mood] : null;
  const measurement = latestWho5(who5);
  return (
    <Screen>
      <LumiHeader kicker={czToday()} title={czGreeting(name)} />

      {/* Check-in karta (dominantní) */}
      {todayEntry ? (
        <Card variant="sunken">
          <View style={styles.entryRow}>
            <MoodShape mood={mood} size={22} />
            <View style={styles.flex1}>
              <Text style={styles.entryTitle}>
                Dnes zapsáno: {mood!.name}
                {todayEntry.words && todayEntry.words.length
                  ? ` · ${todayEntry.words.join(", ")}`
                  : ""}
              </Text>
              <Text style={styles.entryMeta}>v {todayEntry.time} · záznam najdeš v Přehledech</Text>
            </View>
          </View>
          <View style={styles.entryActions}>
            <Button variant="ghost" size="sm" onPress={startCheckin} style={styles.selfStart}>
              Přidat další zápis
            </Button>
          </View>
        </Card>
      ) : (
        <Card variant="ink">
          <Text style={styles.inkTitle}>Jak se dnes cítíš?</Text>
          <Text style={styles.inkText}>Krátký check-in pomáhá najít, co ti dělá dobře.</Text>
          <Button variant="soft" onPress={startCheckin} style={styles.selfStart}>
            Začít check-in
          </Button>
        </Card>
      )}

      {/* Wellbeing index */}
      {measurement ? (
        <Card onPress={openStats}>
          <View style={styles.ringRow}>
            <ProgressRing
              value={measurement.score / 100}
              size={78}
              label={`${measurement.score} %`}
              sublabel="wellbeing"
            />
            <View style={styles.flex1}>
              <Text style={styles.ringTitle}>Wellbeing index</Text>
              <Text style={styles.ringText}>{who5HomeText(who5)}</Text>
            </View>
          </View>
        </Card>
      ) : (
        <Card>
          <View style={styles.ringRow}>
            <ProgressRing value={0} size={78} label="—" sublabel="wellbeing" />
            <View style={styles.flex1}>
              <Text style={styles.ringTitle}>Wellbeing index</Text>
              <Text style={[styles.ringText, styles.ringTextEmpty]}>
                Krátký dotazník (5 otázek) ti nastaví výchozí bod. Bez známek, bez porovnávání.
              </Text>
              <Button
                variant="secondary"
                size="sm"
                onPress={() => router.push("/measure/who5")}
                style={styles.selfStart}
              >
                Vyplnit první dotazník
              </Button>
            </View>
          </View>
        </Card>
      )}

      {/* Pro tebe */}
      <View>
        <SectionLabel>Pro tebe</SectionLabel>
        <Card style={styles.listCard}>
          {RECOMMENDATIONS.map((rec) => (
            <ListItem
              key={rec.id}
              icon={rec.icon}
              iconTint={rec.iconTint}
              iconColor={rec.iconColor}
              title={rec.title}
              subtitle={rec.subtitle}
              trailing={rec.badge ? <Badge tone={rec.badge[0]}>{rec.badge[1]}</Badge> : null}
              onPress={() => router.navigate(rec.route as Href)}
            />
          ))}
        </Card>
      </View>

      {/* Krizová karta — jemně odlišená, ne alarmující */}
      <View style={styles.crisisSection}>
        <View style={styles.crisisHeader}>
          <Icon name="heart-handshake" size={20} color={palette.clay700} />
          <Text style={styles.crisisTitle}>Není ti dobře?</Text>
        </View>
        <Text style={styles.crisisText}>Pomoc je tu pořád — nemusíš na nic čekat.</Text>
        <Button variant="crisis" onPress={openHelp} style={styles.selfStart}>
          <Icon name="heart-handshake" size={18} color={colors.textOnAccent} />
          Otevřít Pomoc
        </Button>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex1: { flex: 1 },
  selfStart: { alignSelf: "flex-start" },

  /* shrnutí dnešního zápisu */
  entryRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  entryTitle: {
    ...font.body(600),
    fontSize: type.base,
    lineHeight: leading.body(type.base),
    color: colors.textStrong,
  },
  entryMeta: {
    ...font.body(400),
    fontSize: type.sm,
    lineHeight: leading.body(type.sm),
    color: palette.ink700,
  },
  entryActions: { marginTop: 12 },

  /* ink karta — výzva k check-inu (text na tmavém podkladu nedědí, barvy explicitně) */
  inkTitle: { ...font.display(700), fontSize: type.lg, color: colors.textOnInk, marginBottom: 4 },
  inkText: {
    ...font.body(400),
    fontSize: type.base,
    lineHeight: leading.body(type.base),
    color: "rgba(255,248,236,0.82)",
    marginBottom: 16,
  },

  /* wellbeing index */
  ringRow: { flexDirection: "row", alignItems: "center", gap: 16 },
  ringTitle: {
    ...font.body(600),
    fontSize: type.base,
    lineHeight: leading.body(type.base),
    color: colors.textStrong,
  },
  ringText: {
    ...font.body(400),
    fontSize: type.sm,
    lineHeight: leading.body(type.sm),
    color: palette.ink700,
  },
  ringTextEmpty: { marginTop: 2, marginBottom: 10 },

  /* Pro tebe */
  listCard: { paddingVertical: 8, paddingHorizontal: 12, marginTop: 6 },

  /* krizová karta */
  crisisSection: { backgroundColor: colors.dangerSoft, borderRadius: radius.lg, padding: space.s5 },
  crisisHeader: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 6 },
  crisisTitle: { ...font.display(700), fontSize: type.md, color: palette.clay700 },
  crisisText: {
    ...font.body(400),
    fontSize: type.base,
    lineHeight: leading.body(type.base),
    color: colors.textBody,
    marginBottom: 14,
  },
});
