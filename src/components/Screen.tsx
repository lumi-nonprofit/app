/* Screen — obrazovka se scrollem pod nativní hlavičkou. Horní odsazení řeší
   navigátor (iOS velký titulek přes contentInsetAdjustmentBehavior), spodní
   bezpečná zóna plus rezerva na plovoucí tab bar (jen v tabech). Okraj obsahu
   podle platformy (HIG 20 pt / Material 16 dp). `keyboard` zvedne obsah nad
   klávesnici (iOS; Android řeší adjustResize). */
import React from "react";
import { ScrollView, type StyleProp, type ViewStyle } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { createThemedStyles } from "../theme";
import { useTabBarInset } from "./TabBarInset";

interface Props {
  children: React.ReactNode;
  contentStyle?: StyleProp<ViewStyle>;
  /** Obrazovka s textovým vstupem: obsah se posune nad klávesnici. */
  keyboard?: boolean;
}

export default function Screen({ children, contentStyle, keyboard = false }: Props) {
  const insets = useSafeAreaInsets();
  const tabBarReserve = useTabBarInset();
  const styles = useStyles();
  const paddingBottom = insets.bottom + (tabBarReserve > 0 ? tabBarReserve : 20);
  return (
    <ScrollView
      style={styles.fill}
      contentContainerStyle={[styles.content, { paddingBottom }, contentStyle]}
      contentInsetAdjustmentBehavior="automatic"
      automaticallyAdjustKeyboardInsets={keyboard}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="interactive"
    >
      {children}
    </ScrollView>
  );
}

const useStyles = createThemedStyles((t) => ({
  fill: { flex: 1, backgroundColor: t.colors.surfacePage },
  content: {
    paddingTop: t.platform.isAndroid ? 12 : 16,
    paddingHorizontal: t.platform.screenMargin,
    gap: 14,
    flexGrow: 1,
  },
}));
