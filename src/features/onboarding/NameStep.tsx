/* Step 1 of the onboarding: the welcome and the name (optional; without it Lumi addresses the
   person in a neutral way). The HIG guidance for the onboarding: fast and easy to skip; the
   step buttons are "Začít", "Pokračovat" and "Hotovo". */
import React from "react";
import { StyleSheet, View } from "react-native";
import { useRouter } from "expo-router";
import { Button, Input } from "../../ds";
import LumiMark from "../../components/LumiMark";
import { useTranslation } from "../../i18n";
import { useAppStore } from "../../store";
import { ObShell, ObTitle } from "./Shell";

export default function NameStep() {
  const { t } = useTranslation("onboarding");
  const { state, patch } = useAppStore();
  const router = useRouter();
  return (
    <ObShell step={1}>
      <LumiMark size={52} style={styles.mark} />
      <ObTitle title={t("name.title")} body={t("name.body")} />
      <Input
        label={t("name.label")}
        placeholder={t("name.placeholder")}
        hint={t("name.hint")}
        value={state.name}
        onChangeText={(v) => patch({ name: v })}
        autoCapitalize="words"
        autoComplete="name"
        textContentType="name"
        returnKeyType="done"
      />
      <View style={styles.flex1} />
      <Button size="lg" fullWidth onPress={() => router.push("/onboarding/age")}>
        {t("name.start")}
      </Button>
    </ObShell>
  );
}

const styles = StyleSheet.create({
  flex1: { flex: 1 },
  mark: { marginBottom: 18 },
});
