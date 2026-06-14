// Step 4a — minimal JS SMOKE (NOT the real check-in screen). Drives the full
// JS -> Nitro -> C++ -> Rust -> SQLite path against a temp DB and emits a sentinel to logcat +
// screen. Wire this temporarily as the app entry (see RUNBOOK Step 6); do NOT touch the real
// check-in feature yet — that is step 4b.
import React from 'react';
import { Text, View, StyleSheet } from 'react-native';
import { File, Paths } from 'expo-file-system';
import { LumiVault } from './LumiVault';

const SENTINEL = 'LUMI_SLICE_SMOKE';

function runSmoke(): string {
  // A throwaway temp DB path in the app cache dir. SDK-56 expo-file-system uses the new Paths/File
  // API (the old `cacheDirectory` moved to expo-file-system/legacy and would be undefined here).
  // `.uri` is a file:// URI; rusqlite/SQLite needs a plain filesystem path, so strip the scheme.
  // The cache dir always exists + is app-writable; rusqlite creates the .db file. (Real app = step 4b.)
  const dbPath = new File(Paths.cache, `lumi-smoke-${Date.now()}.db`).uri.replace(/^file:\/\//, '');
  // eslint-disable-next-line no-console
  console.log(`${SENTINEL} dbPath: ${dbPath}`); // so logcat shows the actual path if open still fails
  try {
    LumiVault.open(dbPath);
    const handle = LumiVault.unlock('smoke-pin-1234');

    const id = LumiVault.putCheckin(handle, { mood: 'klid', intensity: 3, note: 'smoke' }, Date.now());

    const list = LumiVault.listCheckins(handle);
    const roundtrip =
      list.length === 1 &&
      list[0].recordId === id &&
      (list[0].payload as { mood?: string }).mood === 'klid';

    const destroyed = LumiVault.shredCheckin(handle, id);
    const afterShred = LumiVault.listCheckins(handle).length === 0;

    LumiVault.close();
    const pass = roundtrip && destroyed && afterShred;
    return `${SENTINEL} ${JSON.stringify({ pass, roundtrip, destroyed, afterShred })}`;
  } catch (e) {
    return `${SENTINEL} ${JSON.stringify({ pass: false, dbPath, error: String(e) })}`;
  }
}

export default function SmokeApp() {
  const [line] = React.useState(runSmoke);
  // eslint-disable-next-line no-console
  console.log(line); // -> ReactNativeJS tag in logcat
  return (
    <View style={styles.c}>
      <Text style={styles.t}>{line}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  c: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  t: { fontSize: 14 },
});
