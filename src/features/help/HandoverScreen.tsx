/* Předání telefonu (app/handover, fullScreenModal) — celoobrazovkový režim pro
   třetí osobu, která drží telefon místo uživatele.

   ZÁMĚR — VYKÁNÍ: tahle obrazovka je jediná v aplikaci, kde tykání nedává smysl.
   Mluvíme k někomu jinému než k uživateli (drží telefon za něj/za ni), proto tady
   všude vykáme. Žádný tlak, žádná vina — jen klidné, konkrétní pokyny.

   Bez osobních dat: záměrně neimportujeme useAppStore / useEntries / useMeasurements.
   Žádné jméno, žádné záznamy. Krizová čísla jsou napevno — nezávisí na profilu. */
import { View } from "react-native";
import { useRouter } from "expo-router";
import { Button, Text } from "../../ds";
import Screen from "../../components/Screen";
import { createThemedStyles } from "../../theme";

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
  const styles = useStyles();
  return (
    <View style={styles.principleRow}>
      {/* odrážka je dekorativní — význam nese text vedle ní */}
      <View
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        style={styles.dot}
      />
      {/* velké písmo — telefon drží cizí člověk, často ve stresu */}
      <Text variant="headline" style={styles.principleText}>
        {text}
      </Text>
    </View>
  );
}

export default function HandoverScreen() {
  const router = useRouter();
  const styles = useStyles();
  return (
    <Screen contentStyle={styles.content}>
      <Text accessibilityRole="header" variant="title1">
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

        {/* vysoký kontrast — nouzová čísla musí být čitelná na první pohled */}
        <Text
          variant="headline"
          weight="bold"
          color="textDanger"
          align="center"
          style={styles.emergency}
        >
          Při ohrožení života: 155 záchranná služba · 112 tísňová linka
        </Text>

        <Button variant="secondary" size="lg" fullWidth onPress={() => router.back()}>
          Vrátit telefon
        </Button>
      </View>
    </Screen>
  );
}

const useStyles = createThemedStyles((t) => ({
  content: { gap: 24, justifyContent: "center" },

  principles: { gap: 14 },
  principleRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  dot: {
    width: 8,
    height: 8,
    borderRadius: t.radius.pill,
    backgroundColor: t.colors.surfaceCrisis,
  },
  principleText: { flex: 1, fontSize: 20, lineHeight: 26 },

  actions: { gap: 12 },
  emergency: { fontSize: 20, lineHeight: 26, marginVertical: 4 },
}));
