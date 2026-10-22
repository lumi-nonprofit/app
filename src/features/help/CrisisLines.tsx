/* The crisis lines without the profile and the database: both primary lines as "tel:" buttons,
   the emergency numbers under them. /crisis, the ErrorBoundary and the fallback of DbProvider
   share this component: help must stay available when everything else fails. */
import { View } from "react-native";
import { Button, Text } from "../../ds";
import { useTranslation } from "../../i18n";
import { createThemedStyles } from "../../theme";
import { EMERGENCY_LINES, HELP_LINES, telHref } from "./lines";

export default function CrisisLines() {
  const { t } = useTranslation("help");
  const styles = useStyles();
  return (
    <View style={styles.wrap}>
      {(["u26", "plus27"] as const).map((band) => {
        const line = HELP_LINES[band];
        return (
          <View key={band} style={styles.line}>
            <Button variant="crisis" size="lg" fullWidth href={telHref(line.phone)}>
              {t("lines.callWithName", { phone: line.phone, name: line.name })}
            </Button>
            <Text variant="footnote" color="textMuted" align="center">
              {line.meta}
            </Text>
          </View>
        );
      })}
      <Text variant="subheadline" weight="semibold" color="textDanger" style={styles.emergency}>
        {t("lines.emergencyIntro")}
      </Text>
      <View style={styles.row}>
        {EMERGENCY_LINES.map((line) => (
          <Button key={line.id} variant="secondary" href={telHref(line.phone)} style={styles.flex1}>
            {t("lines.emergencyShort", { phone: line.phone, short: line.short })}
          </Button>
        ))}
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
