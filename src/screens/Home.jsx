/* Dnes — domovská obrazovka. Stavy jsou datové: bez WHO-5 měření se místo
   procenta zobrazí výzva k prvnímu dotazníku (varianta „první den“),
   po dnešním zápisu se check-in karta změní na shrnutí. */
import { StyleSheet, Text, View } from "react-native";
import { Badge, Button, Card, Icon, ListItem, ProgressRing } from "../ds/index.js";
import { LumiHeader, SectionLabel } from "../components/Header.jsx";
import MoodShape from "../components/MoodShape.jsx";
import Screen from "../components/Screen.jsx";
import { MOOD_BY_ID, czGreeting, czToday, latestWho5, who5HomeText } from "../model.js";
import { colors, font, leading, palette, radius, space } from "../theme.js";

export default function HomeScreen({ name, todayEntry, who5, onStartCheckin, onOpenCalm, onOpenHelp, onOpenStats }) {
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
                Dnes zapsáno: {mood.name}
                {todayEntry.words && todayEntry.words.length ? ` · ${todayEntry.words.join(", ")}` : ""}
              </Text>
              <Text style={styles.entryMeta}>v {todayEntry.time} · záznam najdeš v Přehledech</Text>
            </View>
          </View>
          <View style={styles.entryActions}>
            <Button variant="ghost" size="sm" onPress={onStartCheckin} style={styles.selfStart}>Přidat další zápis</Button>
          </View>
        </Card>
      ) : (
        <Card variant="ink">
          <Text style={styles.inkTitle}>Jak se dnes cítíš?</Text>
          <Text style={styles.inkText}>
            Krátký check-in pomáhá najít, co ti dělá dobře.
          </Text>
          <Button variant="soft" onPress={onStartCheckin} style={styles.selfStart}>Začít check-in</Button>
        </Card>
      )}

      {/* Wellbeing index */}
      {measurement ? (
        <Card onPress={onOpenStats}>
          <View style={styles.ringRow}>
            <ProgressRing value={measurement.score / 100} size={78} label={`${measurement.score} %`} sublabel="wellbeing" />
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
              <Button variant="secondary" size="sm" onPress={onOpenStats} style={styles.selfStart}>Vyplnit první dotazník</Button>
            </View>
          </View>
        </Card>
      )}

      {/* Pro tebe */}
      <View>
        <SectionLabel>Pro tebe</SectionLabel>
        <Card style={styles.listCard}>
          <ListItem
            icon="wind"
            title="Dechové cvičení 4-7-8"
            subtitle="Pomáhá při napětí"
            trailing={<Badge tone="accent">3 min</Badge>}
            onPress={onOpenCalm}
          />
          <ListItem
            icon="notebook-pen"
            iconTint={colors.positiveSoft}
            iconColor={palette.sage700}
            title="Večerní zápis do deníku"
            subtitle="Na co dnes nechceš zapomenout?"
            onPress={onStartCheckin}
          />
          <ListItem
            icon="moon"
            iconTint={palette.lilac100}
            iconColor={palette.lilac700}
            title="Klidné usínání"
            subtitle="Zvuky a audio na dobrou noc"
            trailing={<Badge tone="lilac">večer</Badge>}
            onPress={onOpenCalm}
          />
        </Card>
      </View>

      {/* Krizová karta — jemně odlišená, ne alarmující */}
      <View style={styles.crisisSection}>
        <View style={styles.crisisHeader}>
          <Icon name="heart-handshake" size={20} color={palette.clay700} />
          <Text style={styles.crisisTitle}>Není ti dobře?</Text>
        </View>
        <Text style={styles.crisisText}>
          Pomoc je tu pořád — nemusíš na nic čekat.
        </Text>
        <Button variant="crisis" onPress={onOpenHelp} style={styles.selfStart}>
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
  entryTitle: { ...font.body(600), fontSize: 15, lineHeight: leading.body(15), color: colors.textStrong },
  entryMeta: { ...font.body(400), fontSize: 13, lineHeight: leading.body(13), color: palette.ink700 },
  entryActions: { marginTop: 12 },

  /* ink karta — výzva k check-inu (text na tmavém podkladu nedědí, barvy explicitně) */
  inkTitle: { ...font.display(700), fontSize: 21, color: colors.textOnInk, marginBottom: 4 },
  inkText: { ...font.body(400), fontSize: 14.5, lineHeight: Math.round(14.5 * 1.5), color: "rgba(255,248,236,0.82)", marginBottom: 16 },

  /* wellbeing index */
  ringRow: { flexDirection: "row", alignItems: "center", gap: 16 },
  ringTitle: { ...font.body(600), fontSize: 15, lineHeight: leading.body(15), color: colors.textStrong },
  ringText: { ...font.body(400), fontSize: 13.5, lineHeight: Math.round(13.5 * 1.45), color: palette.ink700 },
  ringTextEmpty: { marginTop: 2, marginBottom: 10 },

  /* Pro tebe */
  listCard: { paddingVertical: 8, paddingHorizontal: 12, marginTop: 6 },

  /* krizová karta */
  crisisSection: { backgroundColor: colors.dangerSoft, borderRadius: radius.lg, padding: space.s5 },
  crisisHeader: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 6 },
  crisisTitle: { ...font.display(700), fontSize: 17, color: palette.clay700 },
  crisisText: { ...font.body(400), fontSize: 15, lineHeight: leading.body(15), color: colors.textBody, marginBottom: 14 },
});
