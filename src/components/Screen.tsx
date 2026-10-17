/* Screen — obrazovka se scrollem pod nativní hlavičkou. Horní odsazení řeší
   navigátor (iOS velký titulek přes contentInsetAdjustmentBehavior); spodní
   bezpečnou zónu v tabech řeší nativní tab bar, mimo taby ji přidá Screen.
   Okraj obsahu podle platformy (HIG 20 pt / Material 16 dp). `keyboard`
   zvedne obsah nad klávesnici (iOS; Android řeší adjustResize). */
import React from "react";
import { ScrollView, type StyleProp, type ViewStyle } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { createThemedStyles } from "../theme";
import { useInsideTabs } from "./TabContent";

interface Props {
  children: React.ReactNode;
  contentStyle?: StyleProp<ViewStyle>;
  /** Obrazovka s textovým vstupem: obsah se posune nad klávesnici. */
  keyboard?: boolean;
}

export default function Screen({ children, contentStyle, keyboard = false }: Props) {
  const insets = useSafeAreaInsets();
  const insideTabs = useInsideTabs();
  const styles = useStyles();
  const paddingBottom = (insideTabs ? 0 : insets.bottom) + 24;
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
