/* Předání telefonu (app/handover, fullScreenModal) — celoobrazovkový režim pro
   třetí osobu, která drží telefon místo uživatele.

   ZÁMĚR — VYKÁNÍ: tahle obrazovka je jediná v aplikaci, kde tykání nedává smysl.
   Mluvíme k někomu jinému než k uživateli (drží telefon za něj/za ni), proto tady
   všude vykáme. Žádný tlak, žádná vina — jen klidné, konkrétní pokyny.

   Bez osobních dat: záměrně neimportujeme useAppStore / useEntries / useMeasurements.
   Žádné jméno, žádné záznamy. Krizová čísla jsou napevno — nezávisí na profilu. */
import { StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { Button } from "../../ds/index";
import Screen from "../../components/Screen";
import { colors, palette, radius, font, leading, type } from "../../theme";

/* Pět principů — každý jako vlastní řádek s tečkou (informace nikdy jen barvou:
   nositelem je text, tečka je jen vizuální odrážka). Maximálně pár slov. */
const PRINCIPLES = [
  "Zůstaňte nablízku.",
  "Hlavně poslouchejte.",
  "Neraďte a nebagatelizujte.",
  "Berte to vážně.",
  "Při ohrožení nenechávejte o samotě.",
] as const;

function Principle({ text }: { text: string }) {
  return (
    <View style={styles.principleRow}>
      {/* odrážka je dekorativní — význam nese text vedle ní */}
      <View
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        style={styles.dot}
      />
      <Text style={styles.principleText}>{text}</Text>
    </View>
  );
}

export default function HandoverScreen() {
  const router = useRouter();
  return (
    <Screen contentStyle={styles.content}>
      <Text accessibilityRole="header" style={styles.heading}>
        Jste tu pro někoho — to je to nejdůležitější.
      </Text>

      <View style={styles.principles}>
        {PRINCIPLES.map((p) => (
          <Principle key={p} text={p} />
        ))}
      </View>

      <View style={styles.actions}>
        {/* krizové linky — čísla napevno, nezávislá na profilu */}
        <Button variant="crisis" size="lg" fullWidth href="tel:116123">
          Zavolat 116 123 — dospělí
        </Button>
        <Button variant="crisis" size="lg" fullWidth href="tel:116111">
          Zavolat 116 111 — děti a studenti
        </Button>

        <Text style={styles.emergency}>
          Při ohrožení života: 155 záchranná služba · 112 tísňová linka
        </Text>

        <Button variant="secondary" size="lg" fullWidth onPress={() => router.back()}>
          Vrátit telefon
        </Button>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { gap: 24, justifyContent: "center" },

  heading: {
    ...font.display(700),
    fontSize: type.xxl,
    lineHeight: leading.tight(type.xxl),
    color: colors.textStrong,
  },

  principles: { gap: 14 },
  principleRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  dot: { width: 8, height: 8, borderRadius: radius.pill, backgroundColor: palette.clay500 },
  /* velké písmo (≥ type.lg) — telefon drží cizí člověk, často ve stresu */
  principleText: {
    ...font.body(600),
    flex: 1,
    fontSize: type.lg,
    lineHeight: leading.snug(type.lg),
    color: colors.textStrong,
  },

  actions: { gap: 12 },
  /* vysoký kontrast — nouzová čísla musí být čitelná na první pohled */
  emergency: {
    ...font.body(700),
    fontSize: type.lg,
    lineHeight: leading.body(type.lg),
    color: palette.clay700,
    textAlign: "center",
    marginVertical: 4,
  },
});
