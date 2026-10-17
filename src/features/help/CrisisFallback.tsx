/* Nouzová obrazovka: když selže databáze nebo spadne render, člověk se nesmí
   ocitnout bez pomoci (HIG Feedback: říct, co se stalo a co dál; krizové
   linky jsou vždy na dosah). Bez závislosti na storu a DB. */
import type { ReactNode } from "react";
import { ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Text } from "../../ds";
import { createThemedStyles } from "../../theme";
import CrisisLines from "./CrisisLines";

interface Props {
  title: string;
  message: string;
  action?: ReactNode;
}

export default function CrisisFallback({ title, message, action }: Props) {
  const insets = useSafeAreaInsets();
  const styles = useStyles();
  return (
    <ScrollView
      style={styles.fill}
      contentContainerStyle={[
        styles.content,
        { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 24 },
      ]}
    >
      <Text accessibilityRole="header" variant="title2">
        {title}
      </Text>
      <Text variant="body">{message}</Text>
      {action ? <View style={styles.action}>{action}</View> : null}
      <View style={styles.lines}>
        <Text accessibilityRole="header" variant="headline">
          Potřebuješ si promluvit hned?
        </Text>
        <CrisisLines />
      </View>
    </ScrollView>
  );
}

const useStyles = createThemedStyles((t) => ({
  fill: { flex: 1, backgroundColor: t.colors.surfacePage },
  content: { flexGrow: 1, justifyContent: "center", paddingHorizontal: 24, gap: 14 },
  action: { alignSelf: "flex-start" },
  lines: { marginTop: 16, gap: 12 },
}));
