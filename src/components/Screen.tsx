/* Screen — obrazovka se scrollem. Přechodně drží rezervu na vlastní tab bar
   (fáze 3 přejde na nativní hlavičky a insety navigátoru). Okraj obsahu podle
   platformy (HIG 20 pt / Material 16 dp). */
import React from "react";
import { ScrollView, type StyleProp, type ViewStyle } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { createThemedStyles } from "../theme";

interface Props {
  children: React.ReactNode;
  contentStyle?: StyleProp<ViewStyle>;
}

export default function Screen({ children, contentStyle }: Props) {
  const insets = useSafeAreaInsets();
  const styles = useStyles();
  return (
    <ScrollView
      style={styles.fill}
      contentContainerStyle={[
        styles.content,
        { paddingTop: insets.top + 20, paddingBottom: insets.bottom + 110 },
        contentStyle,
      ]}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="interactive"
    >
      {children}
    </ScrollView>
  );
}

const useStyles = createThemedStyles((t) => ({
  fill: { flex: 1, backgroundColor: t.colors.surfacePage },
  content: { paddingHorizontal: t.platform.screenMargin, gap: 14, flexGrow: 1 },
}));
