// THROWAWAY spike #1b — copy over example/src/App.tsx. Runs a live JS->Rust->JS
// round-trip on launch and prints a sentinel the runbook greps from logcat.
import React from 'react';
import { Text, View, StyleSheet } from 'react-native';
import LumiCrypto from './NativeLumiCrypto'; // adjust path to the lib's spec/export

type DeviceKey = { handle: string; publicKeyB64: string };
type CheckinDraft = { mood: string; intensity: number; note: string };

const SENTINEL = 'LUMI_SPIKE_RESULT';

function run(): string {
  try {
    const a = LumiCrypto.newDeviceKey() as DeviceKey;
    const b = LumiCrypto.newDeviceKey() as DeviceKey;

    // A seals to B; B opens from A (real X25519 DH + ChaCha20-Poly1305 in Rust).
    const sealed = LumiCrypto.sealCheckin(a.handle, b.publicKeyB64, 'klid', 3, 'ok');
    const opened = LumiCrypto.openCheckin(b.handle, a.publicKeyB64, sealed) as CheckinDraft;
    const roundtrip =
      opened.mood === 'klid' && opened.intensity === 3 && opened.note === 'ok';

    // Throwing fn: a garbage sealed blob must surface an error in JS.
    let threw = false;
    try {
      LumiCrypto.openCheckin(b.handle, a.publicKeyB64, 'AAAAAAAAAAAAAAAAAAAA');
    } catch {
      threw = true;
    }

    const pass = roundtrip && threw;
    return `${SENTINEL} ${JSON.stringify({ pass, roundtrip, threw })}`;
  } catch (e) {
    return `${SENTINEL} ${JSON.stringify({ pass: false, error: String(e) })}`;
  }
}

export default function App() {
  const [line] = React.useState(run);
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
  t: { fontSize: 16 },
});
