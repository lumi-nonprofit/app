/* Pomoc — krizová intervence. Primární linka podle věku z onboardingu,
   druhá vždy viditelná hned pod ní; tlačítka volají přes tel: odkazy.
   Krizový register: konkrétně, čísla a akce napřed, žádný alarm. */
import { StyleSheet, Text, View } from "react-native";
import { Badge, Button, Card, Icon, ListItem } from "../ds/index.js";
import Screen from "../components/Screen.jsx";
import { LumiHeader, SectionLabel } from "../components/Header.jsx";
import { palette, colors, radius, font } from "../theme.js";
import { HELP_LINES } from "../model.js";

const telHref = (phone) => `tel:${phone.replace(/\s/g, "")}`;

function LineRow({ line, primary }) {
  return (
    <View style={styles.lineRow}>
      <View>
        <View style={styles.lineHead}>
          <Text style={[styles.lineName, { fontSize: primary ? 18 : 15.5 }]}>{line.name}</Text>
          {primary ? <Badge tone="danger">tvoje linka</Badge> : null}
        </View>
        <Text style={styles.lineMeta}>{line.meta}</Text>
      </View>
      <Button variant={primary ? "crisis" : "secondary"} size={primary ? "md" : "sm"} href={telHref(line.phone)}>
        <Icon name="phone" size={17} color={primary ? colors.textOnAccent : colors.textStrong} />
        {`Zavolat ${line.phone}`}
      </Button>
    </View>
  );
}

export default function HelpScreen({ age, onOpenCalm }) {
  const primary = age === "plus27" ? HELP_LINES.plus27 : HELP_LINES.u26;
  const secondary = age === "plus27" ? HELP_LINES.u26 : HELP_LINES.plus27;
  return (
    <Screen>
      <LumiHeader kicker="Pomoc" title="Jsme tu s tebou" />

      {/* krizová karta — primární linka podle věku z onboardingu */}
      <View style={styles.crisisCard}>
        <View style={styles.crisisHead}>
          <Icon name="heart-handshake" size={20} color={palette.clay700} />
          <Text style={styles.crisisTitle}>Potřebuješ si promluvit hned?</Text>
        </View>
        <LineRow line={primary} primary />
        <LineRow line={secondary} />
        <Text style={styles.crisisNote}>
          Při bezprostředním ohrožení života volej 155 nebo 112.
        </Text>
      </View>

      {/* krizový plán — rozcestník, detailní obrazovky budou doplněny */}
      <Card style={styles.planCard}>
        <View style={styles.planHead}>
          <Text style={styles.planTitle}>Můj krizový plán</Text>
          <Text style={styles.planSub}>Připrav si kroky, dokud je klid.</Text>
        </View>
        <ListItem icon="eye" title="Moje varovné signály" subtitle="Podle čeho poznám, že se to horší" onPress={() => {}} />
        <ListItem
          icon="heart"
          iconTint={colors.positiveSoft}
          iconColor={palette.sage700}
          title="Co mi pomáhá"
          subtitle="Ověřené kroky a činnosti"
          onPress={() => {}}
        />
        <ListItem
          icon="users"
          iconTint={colors.infoSoft}
          iconColor={palette.lake700}
          title="Na koho se obrátím"
          subtitle="Blízcí lidé a kontakty"
          onPress={() => {}}
        />
      </Card>

      {/* rychlé zklidnění */}
      <Card style={styles.slimCard}>
        <ListItem icon="wind" title="Rychlé zklidnění" subtitle="Dech a uzemnění na 2 minuty" trailing={<Badge tone="accent">2 min</Badge>} onPress={onOpenCalm} />
      </Card>

      {/* rozcestník */}
      <View>
        <SectionLabel>Co dělat, když…</SectionLabel>
        <Card style={styles.sectionCard}>
          <ListItem icon="cloud" iconTint={colors.infoSoft} iconColor={palette.lake700} title="…přijde úzkost" subtitle="Krátké kroky pro tady a teď" onPress={() => {}} />
          <ListItem icon="waves" iconTint={colors.infoSoft} iconColor={palette.lake700} title="…přijde panika" subtitle="Co dělat během vlny" onPress={() => {}} />
          <ListItem icon="cloud-rain" iconTint={colors.infoSoft} iconColor={palette.lake700} title="…jsou myšlenky těžké" subtitle="Nejsi v tom — kde hledat oporu" onPress={() => {}} />
        </Card>
      </View>

      {/* kontakty */}
      <View>
        <SectionLabel>Kontakty</SectionLabel>
        <Card style={styles.sectionCard}>
          <ListItem
            icon="phone"
            iconTint={colors.dangerSoft}
            iconColor={palette.clay700}
            title="Linka bezpečí · 116 111"
            subtitle="nonstop, zdarma · děti a studenti do 26 let"
            href={telHref("116 111")}
          />
          <ListItem
            icon="phone"
            iconTint={colors.dangerSoft}
            iconColor={palette.clay700}
            title="Linka první psychické pomoci · 116 123"
            subtitle="nonstop, zdarma · dospělí"
            href={telHref("116 123")}
          />
          <ListItem
            icon="phone"
            iconTint={colors.dangerSoft}
            iconColor={palette.clay700}
            title="Rodičovská linka · 606 021 021"
            subtitle="Po–Pá 9–21 · rodiče a blízcí dětí"
            href={telHref("606 021 021")}
          />
          <ListItem
            icon="message-circle"
            iconTint={colors.positiveSoft}
            iconColor={palette.sage700}
            title="Chat Linky bezpečí"
            subtitle="denně 9–13 a 15–19 · když se nechce mluvit"
            onPress={() => {}}
          />
        </Card>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  /* karta jedné linky uvnitř krizové sekce */
  lineRow: {
    backgroundColor: colors.surfaceCard,
    borderRadius: radius.md,
    paddingVertical: 14,
    paddingHorizontal: 16,
    gap: 10,
  },
  lineHead: { flexDirection: "row", alignItems: "baseline", gap: 8, flexWrap: "wrap" },
  lineName: { ...font.display(700), color: colors.textStrong },
  lineMeta: { ...font.body(400), fontSize: 13, color: palette.ink700, marginTop: 2 },

  crisisCard: { backgroundColor: colors.dangerSoft, borderRadius: radius.lg, padding: 16, gap: 10 },
  crisisHead: { flexDirection: "row", alignItems: "center", gap: 10, paddingTop: 2, paddingHorizontal: 4 },
  crisisTitle: { ...font.display(700), fontSize: 17, color: palette.clay700 },
  crisisNote: {
    paddingTop: 2,
    paddingHorizontal: 4,
    paddingBottom: 4,
    ...font.body(600),
    fontSize: 13.5,
    color: palette.clay700,
    lineHeight: Math.round(13.5 * 1.5),
  },

  planCard: { paddingTop: 16, paddingHorizontal: 12, paddingBottom: 8 },
  planHead: { paddingHorizontal: 8, paddingBottom: 6 },
  planTitle: { ...font.display(700), fontSize: 17, color: colors.textStrong },
  planSub: { ...font.body(400), fontSize: 13.5, color: palette.ink700, marginTop: 2 },

  slimCard: { paddingVertical: 8, paddingHorizontal: 12 },
  sectionCard: { paddingVertical: 8, paddingHorizontal: 12, marginTop: 6 },
});
