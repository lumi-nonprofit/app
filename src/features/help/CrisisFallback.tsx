/* The emergency screen: when the database fails or a render crashes, the person must still
   reach help (HIG Feedback: say what happened and what to do next; the crisis lines are always
   in reach). No dependency on the store and the database. The title and the message come from
   the caller. */
import type { ReactNode } from "react";
import { ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Text } from "../../ds";
import { useTranslation } from "../../i18n";
import { createThemedStyles } from "../../theme";
import CrisisLines from "./CrisisLines";

interface Props {
  title: string;
  message: string;
  action?: ReactNode;
}

export default function CrisisFallback({ title, message, action }: Props) {
  const { t } = useTranslation("help");
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
          {t("crisis.title")}
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
