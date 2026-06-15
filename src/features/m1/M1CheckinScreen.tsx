// M1 WALKING-SKELETON check-in screen — minimal but REAL: real Argon2id unlock, real per-record
// AEAD encryption + SQLite persistence, rendered from DECRYPTED data. This is NOT the M3 designed
// UI (the real flow lives in app/checkin/ + src/features/checkin and is untouched). It talks to the
// vault only through the proven wrapper (modules/lumi-vault/src/LumiVault).
//
// Design notes for review (steer these):
//  - Separate isolated route (/m1-checkin); does not touch the real check-in flow.
//  - PIN defaults to a dev value "1234" (skeleton) — but the REAL Argon2id unlock runs.
//  - unlock() is a SYNC Nitro call: Argon2id (64 MiB) blocks the JS thread ~100-200ms. Deferred one
//    frame so "Odemykám…" paints. M3 should move it off-thread (Nitro async / worker).
//  - Plain labelled controls (no DS / MoodShape) to stay self-contained; the 4 mood ids are inlined.
//    Selection is conveyed by text + a check mark + a11y state, never colour alone. Radios/list
//    items are named by their visible text (no redundant accessibilityLabel); the group + free-text
//    inputs carry label + hint.
//  - Persistent DB at Paths.document/lumi-vault.db (survives restart + cache clear).
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { File, Paths } from 'expo-file-system';
import { LumiVault, type Checkin } from '../../../modules/lumi-vault/src/LumiVault';

// Persistent (documents) DB path; rusqlite needs a plain filesystem path, so strip file://.
const DB_PATH = new File(Paths.document, 'lumi-vault.db').uri.replace(/^file:\/\//, '');

// The 4 real mood ids (inlined to keep the skeleton self-contained; M3 wires src/model MOODS + DS).
const MOODS = [
  { id: 'energie', label: 'Energie' },
  { id: 'napeti', label: 'Napětí' },
  { id: 'klid', label: 'Klid' },
  { id: 'utlum', label: 'Útlum' },
] as const;
type MoodId = (typeof MOODS)[number]['id'];
const moodLabel = (id: string) => MOODS.find((m) => m.id === id)?.label ?? id;

const INTENSITIES = [1, 2, 3, 4, 5] as const;

interface CheckinPayload {
  mood: MoodId;
  intensity: number;
  note: string;
}

export default function M1CheckinScreen() {
  const [pin, setPin] = useState('1234'); // dev default for the skeleton
  const [unlocking, setUnlocking] = useState(false);
  const [unlockError, setUnlockError] = useState<string | null>(null);
  const [handle, setHandle] = useState<number | null>(null);

  const [mood, setMood] = useState<MoodId | null>(null);
  const [intensity, setIntensity] = useState<number>(3);
  const [note, setNote] = useState('');
  const [saveError, setSaveError] = useState<string | null>(null);

  const [checkins, setCheckins] = useState<Checkin[]>([]);

  // Cleanup-only effect: close (zeroize) the vault when leaving the screen.
  useEffect(() => {
    return () => {
      try {
        LumiVault.close();
      } catch {
        /* ignore on teardown */
      }
    };
  }, []);

  const refresh = useCallback((h: number) => {
    setCheckins(LumiVault.listCheckins(h));
  }, []);

  const onUnlock = useCallback(() => {
    setUnlockError(null);
    setUnlocking(true);
    // Defer one frame so the "Odemykám…" state paints before the sync Argon2id block.
    requestAnimationFrame(() => {
      try {
        LumiVault.open(DB_PATH); // idempotent; opens the persistent vault DB
      } catch (e) {
        if (__DEV__) console.error('M1CheckinScreen open failed', e); // S12: no error logs in prod
        setUnlockError('Trezor se nepodařilo otevřít (soubor databáze je nedostupný nebo poškozený).');
        setUnlocking(false);
        return;
      }

      try {
        const h = LumiVault.unlock(pin); // real Argon2id (creates vault on first run)
        setHandle(h);
        refresh(h);
      } catch (e) {
        if (__DEV__) console.error('M1CheckinScreen unlock failed', e); // S12: no error logs in prod
        setUnlockError('Trezor se nepodařilo odemknout (zkontrolujte PIN).');
      } finally {
        setUnlocking(false);
      }
    });
  }, [pin, refresh]);

  const onSave = useCallback(() => {
    if (handle == null || mood == null) return;
    setSaveError(null);
    try {
      const payload: CheckinPayload = { mood, intensity, note: note.trim() };
      LumiVault.putCheckin(handle, payload, Date.now());
      setMood(null);
      setIntensity(3);
      setNote('');
      refresh(handle);
    } catch (e) {
      if (__DEV__) console.error('Failed to save check-in', e); // S12: no error logs in prod
      // Surface raw core error text only in dev; production shows the generic message only.
      const safeDetail = __DEV__ && e instanceof Error && e.message ? ` (${e.message})` : '';
      setSaveError(`Uložení se nepodařilo.${safeDetail}`);
    }
  }, [handle, mood, intensity, note, refresh]);

  // --- Locked: PIN entry ---
  if (handle == null) {
    return (
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <Text style={styles.h1} accessibilityRole="header">
          Lumi — check-in (M1)
        </Text>
        <Text style={styles.hint}>Odemkni trezor svým PINem.</Text>
        <TextInput
          style={styles.input}
          value={pin}
          onChangeText={setPin}
          placeholder="PIN"
          keyboardType="number-pad"
          secureTextEntry
          autoFocus
          accessibilityLabel="PIN k trezoru"
          accessibilityHint="Zadej PIN a potvrď pro odemčení šifrovaného trezoru."
          returnKeyType="go"
          onSubmitEditing={onUnlock}
        />
        <Pressable
          style={[styles.cta, unlocking && styles.ctaBusy]}
          onPress={onUnlock}
          disabled={unlocking || pin.length === 0}
          accessibilityRole="button"
          accessibilityState={{ disabled: unlocking || pin.length === 0, busy: unlocking }}
          accessibilityHint="Odemkne šifrovaný trezor (Argon2id)."
        >
          {unlocking ? (
            <View style={styles.row}>
              <ActivityIndicator />
              <Text style={[styles.ctaText, styles.ctaTextBusy]}>Odemykám…</Text>
            </View>
          ) : (
            <Text style={styles.ctaText}>Odemknout</Text>
          )}
        </Pressable>
        {unlockError ? (
          <Text style={styles.error} accessibilityLiveRegion="polite">
            {unlockError}
          </Text>
        ) : null}
        <Text style={styles.debug}>DB: {DB_PATH}</Text>
      </ScrollView>
    );
  }

  // --- Unlocked: capture + list ---
  const canSave = mood != null;
  return (
    <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
      <Text style={styles.h1} accessibilityRole="header">
        Jak ti je?
      </Text>

      <View
        accessibilityRole="radiogroup"
        accessibilityLabel="Nálada"
        accessibilityHint="Vyber, jak se právě cítíš."
      >
        <Text style={styles.label}>Nálada</Text>
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
                  {selected ? '✓ ' : ''}
                  {m.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      <View
        accessibilityRole="radiogroup"
        accessibilityLabel="Intenzita"
        accessibilityHint="Vyber intenzitu od 1 (nejméně) do 5 (nejvíce)."
      >
        <Text style={styles.label}>Intenzita</Text>
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

      <Text style={styles.label}>Poznámka (volitelné)</Text>
      <TextInput
        style={[styles.input, styles.note]}
        value={note}
        onChangeText={setNote}
        placeholder="Pár slov…"
        multiline
        accessibilityLabel="Poznámka, volitelné"
        accessibilityHint="Nepovinná krátká poznámka k tomuto check-inu."
      />

      <Pressable
        style={[styles.cta, !canSave && styles.ctaDisabled]}
        onPress={onSave}
        disabled={!canSave}
        accessibilityRole="button"
        accessibilityState={{ disabled: !canSave }}
        accessibilityHint={canSave ? 'Zašifruje a uloží check-in.' : 'Nejdřív vyber náladu.'}
      >
        <Text style={styles.ctaText}>Uložit check-in</Text>
      </Pressable>
      {saveError ? (
        <Text style={styles.error} accessibilityLiveRegion="polite">
          {saveError}
        </Text>
      ) : null}

      <Text style={styles.h2} accessibilityRole="header">
        Uložené check-iny
      </Text>
      {checkins.length === 0 ? (
        <Text style={styles.hint}>Zatím žádné. Ulož první.</Text>
      ) : (
        checkins.map((c) => {
          const p = c.payload as CheckinPayload;
          const when = new Date(c.createdAt).toLocaleString('cs-CZ');
          return (
            <View key={c.recordId} style={styles.item} accessible>
              <Text style={styles.itemTitle}>
                {moodLabel(p.mood)} · {p.intensity}/5
              </Text>
              {p.note ? <Text style={styles.itemNote}>{p.note}</Text> : null}
              <Text style={styles.itemWhen}>{when}</Text>
            </View>
          );
        })
      )}

      <Text style={styles.debug}>DB: {DB_PATH}</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, gap: 14 },
  row: { flexDirection: 'row', alignItems: 'center' },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 6 },
  h1: { fontSize: 24, fontWeight: '700' },
  h2: { fontSize: 18, fontWeight: '700', marginTop: 18 },
  label: { fontSize: 15, fontWeight: '600', marginTop: 6 },
  hint: { fontSize: 14, color: '#555' },
  input: {
    borderWidth: 1,
    borderColor: '#999',
    borderRadius: 8,
    paddingHorizontal: 12,
    minHeight: 48,
    fontSize: 16,
  },
  note: { minHeight: 72, textAlignVertical: 'top', paddingTop: 10 },
  chip: {
    borderWidth: 1,
    borderColor: '#888',
    borderRadius: 22,
    paddingHorizontal: 16,
    minHeight: 44,
    justifyContent: 'center',
  },
  chipOn: { borderColor: '#1b5e20', borderWidth: 2, backgroundColor: '#e8f5e9' },
  chipText: { fontSize: 16 },
  chipTextOn: { fontWeight: '700', color: '#1b5e20' },
  num: {
    borderWidth: 1,
    borderColor: '#888',
    borderRadius: 8,
    minWidth: 48,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  numOn: { borderColor: '#1b5e20', borderWidth: 2, backgroundColor: '#e8f5e9' },
  numText: { fontSize: 16 },
  cta: {
    backgroundColor: '#1b5e20',
    borderRadius: 10,
    minHeight: 52,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  ctaBusy: { opacity: 0.9 },
  ctaDisabled: { backgroundColor: '#9e9e9e' },
  ctaText: { color: '#fff', fontSize: 17, fontWeight: '700' },
  ctaTextBusy: { marginLeft: 8 },
  error: { color: '#b00020', fontSize: 14, marginTop: 8 },
  item: { borderWidth: 1, borderColor: '#ddd', borderRadius: 8, padding: 12, gap: 2 },
  itemTitle: { fontSize: 16, fontWeight: '600' },
  itemNote: { fontSize: 14, color: '#333' },
  itemWhen: { fontSize: 12, color: '#777' },
  debug: { fontSize: 11, color: '#aaa', marginTop: 16 },
});
