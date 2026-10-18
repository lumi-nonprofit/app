/* Screen: a screen that scrolls under the native header. The navigator handles the top inset
   (iOS large title through contentInsetAdjustmentBehavior). Inside the tabs the native tab bar
   handles the bottom safe area; outside the tabs Screen adds it. The content margin follows the
   platform (HIG 20 pt / Material 16 dp). `keyboard` lifts the content above the keyboard
   (iOS; Android uses adjustResize). */
import React from "react";
import { ScrollView, type StyleProp, type ViewStyle } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { createThemedStyles } from "../theme";
import { useInsideTabs } from "./TabContent";

interface Props {
  children: React.ReactNode;
  contentStyle?: StyleProp<ViewStyle>;
  /** A screen with a text input: the content moves above the keyboard. */
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
