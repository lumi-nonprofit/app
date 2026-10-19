/* An unknown path (a deep link to a screen that does not exist). The text names a clear next
   step (the HIG guidance on text: an empty screen always says what comes next). */
import { View } from "react-native";
import { Link, Stack } from "expo-router";
import { Text } from "../src/ds";
import { useTranslation } from "../src/i18n";
import { createThemedStyles } from "../src/theme";

export default function NotFoundScreen() {
  const { t } = useTranslation("navigation");
  const styles = useStyles();
  return (
    <>
      <Stack.Screen options={{ headerShown: true, title: t("notFound.title") }} />
      <View style={styles.wrap}>
        <Text accessibilityRole="header" variant="title2" align="center">
          {t("notFound.heading")}
        </Text>
        <Text variant="body" align="center">
          {t("notFound.message")}
        </Text>
        <Link href="/" accessibilityRole="link" style={styles.link}>
          <Text variant="label" color="textStrong" style={styles.linkText}>
            {t("notFound.home")}
          </Text>
        </Link>
      </View>
    </>
  );
}

const useStyles = createThemedStyles((t) => ({
  wrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    gap: 12,
    backgroundColor: t.colors.surfacePage,
  },
  link: { paddingVertical: 12, minHeight: t.platform.minTouch },
  linkText: { textDecorationLine: "underline" },
}));
