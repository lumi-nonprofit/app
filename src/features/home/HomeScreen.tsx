/* Dnes — domovská obrazovka. Stavy jsou datové: bez WHO-5 měření se místo
   procenta zobrazí výzva k prvnímu dotazníku (varianta „první den“),
   po dnešním zápisu se check-in karta změní na shrnutí. */
import { View } from "react-native";
import { useRouter } from "expo-router";
import type { Href } from "expo-router";
import { Badge, Button, Card, Icon, ListItem, ProgressRing, Text } from "../../ds";
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
import { createThemedStyles, useTheme } from "../../theme";

export default function HomeScreen() {
  const { state } = useAppStore();
  const router = useRouter();
  const theme = useTheme();
  const styles = useStyles();
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
              <Text variant="body" weight="semibold" color="textStrong">
                Dnes zapsáno: {mood!.name}
                {todayEntry.words && todayEntry.words.length
                  ? ` · ${todayEntry.words.join(", ")}`
                  : ""}
              </Text>
              <Text variant="footnote" color="textOnSunken">
                v {todayEntry.time} · záznam najdeš v Přehledech
              </Text>
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
          {/* ink karta: text na primární ploše nedědí, barva explicitně */}
          <Text variant="title3" color="textOnPrimary" style={styles.inkTitle}>
            Jak se dnes cítíš?
          </Text>
          <Text variant="body" color="textOnPrimary" style={styles.inkText}>
            Krátký check-in pomáhá najít, co ti dělá dobře.
          </Text>
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
              <Text variant="headline">Wellbeing index</Text>
              <Text variant="subheadline" color="textMuted">
                {who5HomeText(who5)}
              </Text>
            </View>
          </View>
        </Card>
      ) : (
        <Card>
          <View style={styles.ringRow}>
            <ProgressRing value={0} size={78} label="—" sublabel="wellbeing" />
            <View style={styles.flex1}>
              <Text variant="headline">Wellbeing index</Text>
              <Text variant="subheadline" color="textMuted" style={styles.ringTextEmpty}>
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
              tone={rec.tone}
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
          <Icon name="heart-handshake" size={20} color={theme.colors.textDanger} />
          <Text variant="headline" color="textDanger" style={styles.flex1}>
            Není ti dobře?
          </Text>
        </View>
        <Text variant="body" style={styles.crisisText}>
          Pomoc je tu pořád — nemusíš na nic čekat.
        </Text>
        <Button variant="crisis" onPress={openHelp} style={styles.selfStart}>
          <Icon name="heart-handshake" size={18} color={theme.colors.textOnCrisis} />
          Otevřít Pomoc
        </Button>
      </View>
    </Screen>
  );
}

const useStyles = createThemedStyles((t) => ({
  flex1: { flex: 1 },
  selfStart: { alignSelf: "flex-start" },

  /* shrnutí dnešního zápisu */
  entryRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  entryActions: { marginTop: 12 },

  /* ink karta — výzva k check-inu */
  inkTitle: { marginBottom: 4 },
  inkText: { marginBottom: 16 },

  /* wellbeing index */
  ringRow: { flexDirection: "row", alignItems: "center", gap: 16 },
  ringTextEmpty: { marginTop: 2, marginBottom: 10 },

  /* Pro tebe */
  listCard: { paddingVertical: 8, paddingHorizontal: 12, marginTop: 6 },

  /* krizová karta */
  crisisSection: {
    backgroundColor: t.colors.dangerSoft,
    borderRadius: t.radius.lg,
    padding: t.space.s5,
  },
  crisisHeader: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 6 },
  crisisText: { marginBottom: 14 },
}));
