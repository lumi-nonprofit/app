/* Neznámá cesta (deep link na neexistující obrazovku). Česky, s jasným
   dalším krokem — HIG Writing: prázdná obrazovka vždy říká, co dál. */
import { View } from "react-native";
import { Link, Stack } from "expo-router";
import { Text } from "../src/ds";
import { createThemedStyles } from "../src/theme";

export default function NotFoundScreen() {
  const styles = useStyles();
  return (
    <>
      <Stack.Screen options={{ headerShown: true, title: "Nenalezeno" }} />
      <View style={styles.wrap}>
        <Text accessibilityRole="header" variant="title2" align="center">
          Tahle stránka v Lumi není
        </Text>
        <Text variant="body" align="center">
          Odkaz je asi neplatný nebo zastaralý.
        </Text>
        <Link href="/" accessibilityRole="link" style={styles.link}>
          <Text variant="label" color="textStrong" style={styles.linkText}>
            Zpět na Dnes
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
