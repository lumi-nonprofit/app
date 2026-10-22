/* Backup (Settings): the export of the entries into a JSON file (expo-file-system and
   the system share sheet) and the import with a preview of the counts and a merge without duplicates.
   Plain words, no legal language; the exported file is no longer encrypted, and the text says so.
   The result stays inline (HIG: no element that disappears on its own). */
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
import { useTranslation } from "../../i18n";
import { formatDateNumeric } from "../../i18n/format";
import { announce } from "../../lib/a11y";
import { toISODate } from "../../model";
import { createThemedStyles } from "../../theme";

type Parsed = Extract<ParseResult, { ok: true }>;
type ParseFailure = Extract<ParseResult, { ok: false }>;

type Flow =
  | { kind: "idle" }
  | { kind: "preview"; parsed: Parsed }
  | { kind: "done"; message: string }
  | { kind: "error"; message: string };

export default function BackupSection() {
  const { t } = useTranslation(["settings", "common"]);
  const db = useDb();
  const write = useDbWriter();
  const styles = useStyles();
  const [flow, setFlow] = React.useState<Flow>({ kind: "idle" });
  /* The result stays inline and a screen reader announces it. */
  React.useEffect(() => {
    if (flow.kind === "done" || flow.kind === "error") announce(flow.message);
  }, [flow]);

  /* Each error code of parseBackup has its own message in the catalog. */
  const parseErrorText = (reason: ParseFailure["reason"]): string => {
    switch (reason) {
      case "invalid-json":
        return t("backup.errors.invalid-json");
      case "not-a-backup":
        return t("backup.errors.not-a-backup");
      case "unknown-version":
        return t("backup.errors.unknown-version");
    }
  };

  const exportBackup = async () => {
    try {
      const backup = buildBackup(db);
      /* The file name is a technical identifier and stays the same in every language. */
      const file = new File(Paths.cache, `lumi-zaloha-${toISODate()}.json`);
      if (!file.exists) file.create();
      /* expo-file-system 58: `write` is asynchronous. The share sheet must get the full file. */
      await file.write(JSON.stringify(backup, null, 2));
      await Sharing.shareAsync(file.uri, {
        mimeType: "application/json",
        dialogTitle: t("backup.export.shareTitle"),
      });
      setFlow({ kind: "done", message: t("backup.export.done") });
    } catch {
      setFlow({ kind: "error", message: t("backup.export.failed") });
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
        setFlow({ kind: "error", message: parseErrorText(parsed.reason) });
        return;
      }
      setFlow({ kind: "preview", parsed });
    } catch {
      setFlow({ kind: "error", message: t("backup.import.openFailed") });
    }
  };

  const confirmImport = (parsed: Parsed) => {
    const result = write((d) => importBackup(d, parsed.backup));
    const total = result.addedEntries + result.addedMeasurements;
    setFlow({
      kind: "done",
      message: total
        ? t("backup.import.done", {
            entries: t("common:counts.entries", { count: result.addedEntries }),
            count: result.addedMeasurements,
          })
        : t("backup.import.nothingNew"),
    });
  };

  const previewText = (parsed: Parsed): string => {
    const { entryCount, measurementCount, from, to } = parsed.preview;
    if (!entryCount && !measurementCount) return t("backup.preview.empty");
    const entries = t("common:counts.entries", { count: entryCount });
    const found =
      from && to
        ? t("backup.preview.found", {
            entries,
            from: formatDateNumeric(from),
            to: formatDateNumeric(to),
            count: measurementCount,
          })
        : t("backup.preview.foundNoRange", { entries, count: measurementCount });
    return `${found} ${t("backup.preview.mergeNote")}`;
  };

  return (
    <View>
      <SectionLabel>{t("backup.title")}</SectionLabel>
      <Card style={styles.card}>
        <Text variant="subheadline" color="textMuted">
          {t("backup.intro")}
        </Text>

        {flow.kind === "preview" ? (
          <View style={styles.flowBox}>
            <Text variant="subheadline" color="textMuted">
              {previewText(flow.parsed)}
            </Text>
            <View style={styles.row}>
              {flow.parsed.preview.entryCount + flow.parsed.preview.measurementCount > 0 ? (
                <Button size="sm" onPress={() => confirmImport(flow.parsed)}>
                  {t("backup.preview.merge")}
                </Button>
              ) : null}
              <Button variant="ghost" size="sm" onPress={() => setFlow({ kind: "idle" })}>
                {t("common:actions.cancel")}
              </Button>
            </View>
          </View>
        ) : (
          <View style={styles.row}>
            <Button variant="secondary" size="sm" onPress={exportBackup}>
              {t("backup.export.action")}
            </Button>
            <Button variant="ghost" size="sm" onPress={pickImport}>
              {t("backup.import.action")}
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
