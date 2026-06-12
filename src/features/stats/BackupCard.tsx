/* Záloha v Přehledech: export záznamů do JSON souboru (expo-file-system +
   expo-sharing) a import s náhledem počtů a sloučením bez duplicit.
   Srozumitelně a bez právničiny; exportovaný soubor už není šifrovaný —
   říkáme to rovnou v kartě. */
import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { File, Paths } from "expo-file-system";
import * as Sharing from "expo-sharing";
import * as DocumentPicker from "expo-document-picker";
import { Button, Card } from "../../ds/index";
import { SectionLabel } from "../../components/Header";
import { buildBackup, importBackup, parseBackup, type ParseResult } from "../../db/backup";
import { useDb } from "../../db/provider";
import { useDbWriter } from "../../db/hooks";
import { czPlural, toISODate, type ISODate } from "../../model";
import { colors, font, leading, palette, type } from "../../theme";

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

export default function BackupCard() {
  const db = useDb();
  const write = useDbWriter();
  const [flow, setFlow] = React.useState<Flow>({ kind: "idle" });

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
        ? `Hotovo — přidáno ${result.addedEntries} ${czPlural(result.addedEntries, ["záznam", "záznamy", "záznamů"])} a ${result.addedMeasurements} měření.`
        : "Vše už v telefonu je — nic nebylo potřeba přidávat.",
    });
  };

  const previewText = (parsed: Extract<ParseResult, { ok: true }>): string => {
    const { entryCount, measurementCount, from, to } = parsed.preview;
    if (!entryCount && !measurementCount) return "Záloha je prázdná — není co přidat.";
    const range = from && to ? ` z období ${isoToCz(from)} – ${isoToCz(to)}` : "";
    return `Najdeš tu ${entryCount} ${czPlural(entryCount, ["záznam", "záznamy", "záznamů"])}${range} a ${measurementCount} měření. Přidá se jen to, co v telefonu ještě není.`;
  };

  return (
    <View>
      <SectionLabel>Záloha</SectionLabel>
      <Card style={styles.card}>
        <Text style={styles.text}>
          Záznamy si můžeš uložit do souboru a přenést do jiného telefonu. Exportovaný soubor už
          není šifrovaný — ulož si ho někam bezpečně.
        </Text>

        {flow.kind === "preview" ? (
          <View style={styles.flowBox}>
            <Text style={styles.text}>{previewText(flow.parsed)}</Text>
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

        {flow.kind === "done" ? <Text style={styles.done}>{flow.message}</Text> : null}
        {flow.kind === "error" ? <Text style={styles.error}>{flow.message}</Text> : null}
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { marginTop: 6, gap: 12 },
  text: {
    ...font.body(400),
    fontSize: type.sm,
    lineHeight: leading.body(type.sm),
    color: palette.ink700,
  },
  flowBox: { gap: 12 },
  row: { flexDirection: "row", gap: 8, flexWrap: "wrap" },
  done: {
    ...font.body(600),
    fontSize: type.sm,
    lineHeight: leading.body(type.sm),
    color: palette.sage700,
  },
  error: {
    ...font.body(600),
    fontSize: type.sm,
    lineHeight: leading.body(type.sm),
    color: colors.danger,
  },
});
