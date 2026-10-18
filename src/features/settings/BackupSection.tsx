/* Záloha (Nastavení): export záznamů do JSON souboru (expo-file-system +
   expo-sharing) a import s náhledem počtů a sloučením bez duplicit.
   Srozumitelně a bez právničiny; exportovaný soubor už není šifrovaný —
   říkáme to rovnou. Výsledek zůstává inline (HIG: žádné samo-mizející prvky). */
import React from "react";
import { View } from "react-native";
import { File, Paths } from "expo-file-system";
import * as Sharing from "expo-sharing";
import * as DocumentPicker from "expo-document-picker";
import { Button, Card, Text } from "../../ds";
import { SectionLabel } from "../../components/Header";
import { buildBackup, importBackup, parseBackup, type ParseResult } from "../../db/backup";
import { useDb } from "../../db/provider";
import { useDbWriter } from "../../db/hooks";
import { announce } from "../../lib/a11y";
import { toISODate, type ISODate } from "../../model";
import i18n from "../../i18n";
import { createThemedStyles } from "../../theme";

/** "2026-06-12" → "12. 6. 2026" */
const isoToCz = (iso: ISODate): string => {
  const [y, m, d] = iso.split("-");
  return `${Number(d)}. ${Number(m)}. ${y}`;
};

type Flow =
  | { kind: "idle" }
  | { kind: "preview"; parsed: Extract<ParseResult, { ok: true }> }
  | { kind: "done"; message: string }
  | { kind: "error"; message: string };

export default function BackupSection() {
  const db = useDb();
  const write = useDbWriter();
  const styles = useStyles();
  const [flow, setFlow] = React.useState<Flow>({ kind: "idle" });
  /* výsledek zůstává inline a oznámí se čtečce */
  React.useEffect(() => {
    if (flow.kind === "done" || flow.kind === "error") announce(flow.message);
  }, [flow]);

  const exportBackup = async () => {
    try {
      const backup = buildBackup(db);
      const file = new File(Paths.cache, `lumi-zaloha-${toISODate()}.json`);
      if (!file.exists) file.create();
      file.write(JSON.stringify(backup, null, 2));
      await Sharing.shareAsync(file.uri, {
        mimeType: "application/json",
        dialogTitle: "Uložit zálohu Lumi",
      });
      setFlow({ kind: "done", message: "Záloha je vytvořená. Ulož si soubor někam bezpečně." });
    } catch {
      setFlow({ kind: "error", message: "Export se nepovedl. Zkus to prosím znovu." });
    }
  };

  const pickImport = async () => {
    try {
      const res = await DocumentPicker.getDocumentAsync({
        type: "application/json",
        copyToCacheDirectory: true,
      });
      if (res.canceled || !res.assets?.[0]) return;
      const text = await new File(res.assets[0].uri).text();
      const parsed = parseBackup(text);
      if (!parsed.ok) {
        setFlow({
          kind: "error",
          message: "Tenhle soubor nejde načíst — vypadá to, že není záloha z Lumi.",
        });
        return;
      }
      setFlow({ kind: "preview", parsed });
    } catch {
      setFlow({ kind: "error", message: "Soubor se nepodařilo otevřít. Zkus to prosím znovu." });
    }
  };

  const confirmImport = (parsed: Extract<ParseResult, { ok: true }>) => {
    const result = write((d) => importBackup(d, parsed.backup));
    const total = result.addedEntries + result.addedMeasurements;
    setFlow({
      kind: "done",
      message: total
        ? `Hotovo — přidáno ${i18n.t("common:counts.entries", { count: result.addedEntries })} a ${result.addedMeasurements} měření.`
        : "Vše už v telefonu je — nic nebylo potřeba přidávat.",
    });
  };

  const previewText = (parsed: Extract<ParseResult, { ok: true }>): string => {
    const { entryCount, measurementCount, from, to } = parsed.preview;
    if (!entryCount && !measurementCount) return "Záloha je prázdná — není co přidat.";
    const range = from && to ? ` z období ${isoToCz(from)} – ${isoToCz(to)}` : "";
    return `Najdeš tu ${i18n.t("common:counts.entries", { count: entryCount })}${range} a ${measurementCount} měření. Přidá se jen to, co v telefonu ještě není.`;
  };

  return (
    <View>
      <SectionLabel>Záloha</SectionLabel>
      <Card style={styles.card}>
        <Text variant="subheadline" color="textMuted">
          Záznamy si můžeš uložit do souboru a přenést do jiného telefonu. Exportovaný soubor už
          není šifrovaný — ulož si ho někam bezpečně.
        </Text>

        {flow.kind === "preview" ? (
          <View style={styles.flowBox}>
            <Text variant="subheadline" color="textMuted">
              {previewText(flow.parsed)}
            </Text>
            <View style={styles.row}>
              {flow.parsed.preview.entryCount + flow.parsed.preview.measurementCount > 0 ? (
                <Button size="sm" onPress={() => confirmImport(flow.parsed)}>
                  Sloučit do aplikace
                </Button>
              ) : null}
              <Button variant="ghost" size="sm" onPress={() => setFlow({ kind: "idle" })}>
                Zrušit
              </Button>
            </View>
          </View>
        ) : (
          <View style={styles.row}>
            <Button variant="secondary" size="sm" onPress={exportBackup}>
              Exportovat zálohu
            </Button>
            <Button variant="ghost" size="sm" onPress={pickImport}>
              Obnovit ze zálohy
            </Button>
          </View>
        )}

        {flow.kind === "done" ? (
          <Text variant="subheadline" weight="semibold" color="textPositive">
            {flow.message}
          </Text>
        ) : null}
        {flow.kind === "error" ? (
          <Text variant="subheadline" weight="semibold" color="textDanger">
            {flow.message}
          </Text>
        ) : null}
      </Card>
    </View>
  );
}

const useStyles = createThemedStyles(() => ({
  card: { marginTop: 6, gap: 12 },
  flowBox: { gap: 12 },
  row: { flexDirection: "row", gap: 8, flexWrap: "wrap" },
}));
