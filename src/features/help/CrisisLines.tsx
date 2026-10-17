/* Krizové linky bez závislosti na profilu a databázi: obě linky jako tlačítka
   tel:, pod nimi tísňová čísla. Sdílí je /crisis, ErrorBoundary a fallback
   DbProvideru — pomoc musí být dostupná, i když selže všechno ostatní. */
import { View } from "react-native";
import { Button, Text } from "../../ds";
import { HELP_LINES } from "../../model";
import { createThemedStyles } from "../../theme";

const tel = (phone: string): string => `tel:${phone.replace(/\s/g, "")}`;

export default function CrisisLines() {
  const styles = useStyles();
  return (
    <View style={styles.wrap}>
      {(["u26", "plus27"] as const).map((band) => {
        const line = HELP_LINES[band];
        return (
          <View key={band} style={styles.line}>
            <Button variant="crisis" size="lg" fullWidth href={tel(line.phone)}>
              {`Zavolat ${line.phone} · ${line.name}`}
            </Button>
            <Text variant="footnote" color="textMuted" align="center">
              {line.meta}
            </Text>
          </View>
        );
      })}
      <Text variant="subheadline" weight="semibold" color="textDanger" style={styles.emergency}>
        Při bezprostředním ohrožení života:
      </Text>
      <View style={styles.row}>
        <Button variant="secondary" href="tel:155" style={styles.flex1}>
          155 · záchranka
        </Button>
        <Button variant="secondary" href="tel:112" style={styles.flex1}>
          112 · tíseň
        </Button>
      </View>
    </View>
  );
}

const useStyles = createThemedStyles(() => ({
  wrap: { gap: 12 },
  line: { gap: 6 },
  emergency: { marginTop: 8 },
  row: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  flex1: { flexGrow: 1 },
}));
