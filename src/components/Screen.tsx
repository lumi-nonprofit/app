/* Screen — obrazovka se scrollem (náhrada .app-scroll z webové verze):
   dole rezerva na tab bar + safe area, nahoře safe area + 20. */
import React from "react";
import { ScrollView, StyleSheet, type StyleProp, type ViewStyle } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors } from "../theme";

interface Props {
  children: React.ReactNode;
  contentStyle?: StyleProp<ViewStyle>;
}

export default function Screen({ children, contentStyle }: Props) {
  const insets = useSafeAreaInsets();
  return (
    <ScrollView
      style={styles.fill}
      contentContainerStyle={[
        styles.content,
        { paddingTop: insets.top + 20, paddingBottom: insets.bottom + 110 },
        contentStyle,
      ]}
      keyboardShouldPersistTaps="handled"
    >
      {children}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, backgroundColor: colors.surfacePage },
  content: { paddingHorizontal: 20, gap: 14, flexGrow: 1 },
});
