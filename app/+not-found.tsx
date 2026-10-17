/* Neznámá cesta (deep link na neexistující obrazovku). Česky, s jasným
   dalším krokem — HIG Writing: prázdná obrazovka vždy říká, co dál. */
import { StyleSheet, Text, View } from "react-native";
import { Link, Stack } from "expo-router";
import { colors, font, leading, type } from "../src/theme";

export default function NotFoundScreen() {
  return (
    <>
      <Stack.Screen options={{ title: "Stránka nenalezena" }} />
      <View style={styles.wrap}>
        <Text accessibilityRole="header" style={styles.title}>
          Tahle stránka v Lumi není
        </Text>
        <Text style={styles.text}>Odkaz je asi neplatný nebo zastaralý.</Text>
        <Link href="/" accessibilityRole="link" style={styles.link}>
          Zpět na Dnes
        </Link>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    gap: 12,
    backgroundColor: colors.surfacePage,
  },
  title: {
    ...font.display(700),
    fontSize: type.lg,
    lineHeight: leading.tight(type.lg),
    color: colors.textStrong,
    textAlign: "center",
  },
  text: {
    ...font.body(400),
    fontSize: type.base,
    lineHeight: leading.body(type.base),
    color: colors.textBody,
    textAlign: "center",
  },
  link: {
    ...font.body(600),
    fontSize: type.base,
    color: colors.textStrong,
    paddingVertical: 12,
    textDecorationLine: "underline",
  },
});
