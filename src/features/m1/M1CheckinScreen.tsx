// The M1 skeleton check-in screen: minimal but real. It has the real Argon2id unlock, the real
// per-record AEAD encryption with SQLite persistence, and it renders from decrypted data. It is not
// the M3 user interface (the real flow lives in app/checkin/ and src/features/checkin and stays as
// it is). It talks to the vault only through the proven wrapper (modules/lumi-vault/src/LumiVault).
//
// Design notes for the review (steer these):
//  - A separate route (/m1-checkin) that does not touch the real check-in flow.
//  - The PIN has the development default "1234" (skeleton), but the real Argon2id unlock runs.
//  - unlock() is a synchronous Nitro call: Argon2id (64 MiB) blocks the JS thread for about
//    100 to 200 ms. The call waits one frame so that the busy state paints. M3 must move it off
//    the thread (Nitro async or a worker).
//  - Plain labelled controls (no DS, no MoodShape) keep the screen self-contained; the mood ids
//    and names come from src/model (MOODS). The selection shows as text, a check mark and the
//    a11y state, never as colour alone. The radios and the list items take their name from their
//    visible text (no redundant accessibilityLabel). The group and the free-text inputs carry a
//    label and a hint.
//  - The persistent database is at Paths.document/lumi-vault.db (it survives a restart and a
//    cache clear).
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { File, Paths } from "expo-file-system";
import { LumiVault, type Checkin } from "../../../modules/lumi-vault/src/LumiVault";
import { useTranslation } from "../../i18n";
import { formatDateTime } from "../../i18n/format";
import { MOODS, type MoodId } from "../../model";

// The persistent (documents) database path. rusqlite needs a plain file system path, so the code
// removes the file:// prefix.
const DB_PATH = new File(Paths.document, "lumi-vault.db").uri.replace(/^file:\/\//, "");

/** The name of a mood in the active language. An unknown id (old data) stays as it is. */
const moodName = (id: string): string => MOODS.find((m) => m.id === id)?.name ?? id;

const INTENSITIES = [1, 2, 3, 4, 5] as const;

interface CheckinPayload {
  mood: MoodId;
  intensity: number;
  note: string;
}

export default function M1CheckinScreen() {
  const { t } = useTranslation("m1");
  const [pin, setPin] = useState("1234"); // The development default of the skeleton.
  const [unlocking, setUnlocking] = useState(false);
  const [unlockError, setUnlockError] = useState<string | null>(null);
  const [handle, setHandle] = useState<number | null>(null);

  const [mood, setMood] = useState<MoodId | null>(null);
  const [intensity, setIntensity] = useState<number>(3);
  const [note, setNote] = useState("");
  const [saveError, setSaveError] = useState<string | null>(null);

  const [checkins, setCheckins] = useState<Checkin[]>([]);

  // The effect only cleans up: it closes (zeroizes) the vault when the person leaves the screen.
  useEffect(() => {
    return () => {
      try {
        LumiVault.close();
      } catch {
        /* The teardown ignores errors. */
      }
    };
  }, []);

  const refresh = useCallback((h: number) => {
    setCheckins(LumiVault.listCheckins(h));
  }, []);

  const onUnlock = useCallback(() => {
    setUnlockError(null);
    setUnlocking(true);
    // The call waits one frame so that the busy state paints before the synchronous Argon2id block.
    requestAnimationFrame(() => {
      try {
        LumiVault.open(DB_PATH); // Idempotent: it opens the persistent vault database.
      } catch (e) {
        if (__DEV__) console.error("M1CheckinScreen open failed", e); // S12: no error logs in production.
        setUnlockError(t("errors.open"));
        setUnlocking(false);
        return;
      }

      try {
        const h = LumiVault.unlock(pin); // The real Argon2id; the first run creates the vault.
        setHandle(h);
        refresh(h);
      } catch (e) {
        if (__DEV__) console.error("M1CheckinScreen unlock failed", e); // S12: no error logs in production.
        setUnlockError(t("errors.unlock"));
      } finally {
        setUnlocking(false);
      }
    });
  }, [pin, refresh, t]);

  const onSave = useCallback(() => {
    if (handle == null || mood == null) return;
    setSaveError(null);
    try {
      const payload: CheckinPayload = { mood, intensity, note: note.trim() };
      LumiVault.putCheckin(handle, payload, Date.now());
      setMood(null);
      setIntensity(3);
      setNote("");
      refresh(handle);
    } catch (e) {
      if (__DEV__) console.error("Failed to save check-in", e); // S12: no error logs in production.
      // Only a development build shows the raw error text of the core; production shows the
      // generic message.
      const detail = __DEV__ && e instanceof Error && e.message ? e.message : null;
      setSaveError(detail ? t("errors.saveDetail", { detail }) : t("errors.save"));
    }
  }, [handle, mood, intensity, note, refresh, t]);

  // --- Locked: the PIN entry ---
  if (handle == null) {
    return (
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <Text style={styles.h1} accessibilityRole="header">
          {t("locked.title")}
        </Text>
        <Text style={styles.hint}>{t("locked.hint")}</Text>
        <TextInput
          style={styles.input}
          value={pin}
          onChangeText={setPin}
          placeholder={t("locked.pin.placeholder")}
          keyboardType="number-pad"
          secureTextEntry
          autoFocus
          accessibilityLabel={t("locked.pin.a11yLabel")}
          accessibilityHint={t("locked.pin.a11yHint")}
          returnKeyType="go"
          onSubmitEditing={onUnlock}
        />
        <Pressable
          style={[styles.cta, unlocking && styles.ctaBusy]}
          onPress={onUnlock}
          disabled={unlocking || pin.length === 0}
          accessibilityRole="button"
          accessibilityState={{ disabled: unlocking || pin.length === 0, busy: unlocking }}
          accessibilityHint={t("locked.unlock.a11yHint")}
        >
          {unlocking ? (
            <View style={styles.row}>
              <ActivityIndicator />
              <Text style={[styles.ctaText, styles.ctaTextBusy]}>{t("locked.unlock.busy")}</Text>
            </View>
          ) : (
            <Text style={styles.ctaText}>{t("locked.unlock.label")}</Text>
          )}
        </Pressable>
        {unlockError ? (
          <Text style={styles.error} accessibilityLiveRegion="polite">
            {unlockError}
          </Text>
        ) : null}
        <Text style={styles.debug}>{t("debug.dbPath", { path: DB_PATH })}</Text>
      </ScrollView>
    );
  }

  // --- Unlocked: the capture and the list ---
  const canSave = mood != null;
  return (
    <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
      <Text style={styles.h1} accessibilityRole="header">
        {t("capture.title")}
      </Text>

      <View
        accessibilityRole="radiogroup"
        accessibilityLabel={t("capture.mood.label")}
        accessibilityHint={t("capture.mood.a11yHint")}
      >
        <Text style={styles.label}>{t("capture.mood.label")}</Text>
        <View style={styles.wrap}>
          {MOODS.map((m) => {
            const selected = mood === m.id;
            return (
              <Pressable
                key={m.id}
                style={[styles.chip, selected && styles.chipOn]}
                onPress={() => setMood(m.id)}
                accessibilityRole="radio"
                accessibilityState={{ checked: selected }}
              >
                <Text style={[styles.chipText, selected && styles.chipTextOn]}>
                  {selected ? t("capture.option.selected", { name: m.name }) : m.name}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      <View
        accessibilityRole="radiogroup"
        accessibilityLabel={t("capture.intensity.label")}
        accessibilityHint={t("capture.intensity.a11yHint")}
      >
        <Text style={styles.label}>{t("capture.intensity.label")}</Text>
        <View style={styles.wrap}>
          {INTENSITIES.map((n) => {
            const selected = intensity === n;
            return (
              <Pressable
                key={n}
                style={[styles.num, selected && styles.numOn]}
                onPress={() => setIntensity(n)}
                accessibilityRole="radio"
                accessibilityState={{ checked: selected }}
              >
                <Text style={[styles.numText, selected && styles.chipTextOn]}>{n}</Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      <Text style={styles.label}>{t("capture.note.label")}</Text>
      <TextInput
        style={[styles.input, styles.note]}
        value={note}
        onChangeText={setNote}
        placeholder={t("capture.note.placeholder")}
        multiline
        accessibilityLabel={t("capture.note.a11yLabel")}
        accessibilityHint={t("capture.note.a11yHint")}
      />

      <Pressable
        style={[styles.cta, !canSave && styles.ctaDisabled]}
        onPress={onSave}
        disabled={!canSave}
        accessibilityRole="button"
        accessibilityState={{ disabled: !canSave }}
        accessibilityHint={canSave ? t("capture.save.a11yHint") : t("capture.save.noMood.a11yHint")}
      >
        <Text style={styles.ctaText}>{t("capture.save.label")}</Text>
      </Pressable>
      {saveError ? (
        <Text style={styles.error} accessibilityLiveRegion="polite">
          {saveError}
        </Text>
      ) : null}

      <Text style={styles.h2} accessibilityRole="header">
        {t("list.title")}
      </Text>
      {checkins.length === 0 ? (
        <Text style={styles.hint}>{t("list.empty")}</Text>
      ) : (
        checkins.map((c) => {
          const p = c.payload as CheckinPayload;
          return (
            <View key={c.recordId} style={styles.item} accessible>
              <Text style={styles.itemTitle}>
                {t("list.item", { mood: moodName(p.mood), intensity: p.intensity })}
              </Text>
              {p.note ? <Text style={styles.itemNote}>{p.note}</Text> : null}
              <Text style={styles.itemWhen}>{formatDateTime(new Date(c.createdAt))}</Text>
            </View>
          );
        })
      )}

      <Text style={styles.debug}>{t("debug.dbPath", { path: DB_PATH })}</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, gap: 14 },
  row: { flexDirection: "row", alignItems: "center" },
  wrap: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 6 },
  h1: { fontSize: 24, fontWeight: "700" },
  h2: { fontSize: 18, fontWeight: "700", marginTop: 18 },
  label: { fontSize: 15, fontWeight: "600", marginTop: 6 },
  hint: { fontSize: 14, color: "#555" },
  input: {
    borderWidth: 1,
    borderColor: "#999",
    borderRadius: 8,
    paddingHorizontal: 12,
    minHeight: 48,
    fontSize: 16,
  },
  note: { minHeight: 72, textAlignVertical: "top", paddingTop: 10 },
  chip: {
    borderWidth: 1,
    borderColor: "#888",
    borderRadius: 22,
    paddingHorizontal: 16,
    minHeight: 44,
    justifyContent: "center",
  },
  chipOn: { borderColor: "#1b5e20", borderWidth: 2, backgroundColor: "#e8f5e9" },
  chipText: { fontSize: 16 },
  chipTextOn: { fontWeight: "700", color: "#1b5e20" },
  num: {
    borderWidth: 1,
    borderColor: "#888",
    borderRadius: 8,
    minWidth: 48,
    minHeight: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  numOn: { borderColor: "#1b5e20", borderWidth: 2, backgroundColor: "#e8f5e9" },
  numText: { fontSize: 16 },
  cta: {
    backgroundColor: "#1b5e20",
    borderRadius: 10,
    minHeight: 52,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
  },
  ctaBusy: { opacity: 0.9 },
  ctaDisabled: { backgroundColor: "#9e9e9e" },
  ctaText: { color: "#fff", fontSize: 17, fontWeight: "700" },
  ctaTextBusy: { marginLeft: 8 },
  error: { color: "#b00020", fontSize: 14, marginTop: 8 },
  item: { borderWidth: 1, borderColor: "#ddd", borderRadius: 8, padding: 12, gap: 2 },
  itemTitle: { fontSize: 16, fontWeight: "600" },
  itemNote: { fontSize: 14, color: "#333" },
  itemWhen: { fontSize: 12, color: "#777" },
  debug: { fontSize: 11, color: "#aaa", marginTop: 16 },
});
