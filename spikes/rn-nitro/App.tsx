// THROWAWAY spike #1b (Nitro) — copy over example/src/App.tsx. Runs a live
// JS→Rust→JS round-trip via the Nitro Hybrid Object and prints a sentinel that the
// runbook greps from logcat.
import React from 'react';
import { Text, View, StyleSheet } from 'react-native';
import { NitroModules } from 'react-native-nitro-modules';
// The type comes from the lib's spec. Adjust the import to the lib package, e.g.
//   import type { LumiCrypto } from 'react-native-lumi-crypto';
import type { LumiCrypto } from './LumiCrypto.nitro';

const Lumi = NitroModules.createHybridObject<LumiCrypto>('LumiCrypto');

const SENTINEL = 'LUMI_SPIKE_RESULT';

function run(): string {
  try {
    const a = Lumi.newDeviceKey();
    const b = Lumi.newDeviceKey();

    // A seals to B; B opens from A (real X25519 DH + ChaCha20-Poly1305 in Rust).
    const sealed = Lumi.sealCheckin(a.handle, b.publicKeyB64, 'klid', 3, 'ok');
    const opened = Lumi.openCheckin(b.handle, a.publicKeyB64, sealed);
    const roundtrip =
      opened.mood === 'klid' && opened.intensity === 3 && opened.note === 'ok';

    // Throwing fn: a garbage sealed blob must surface an error in JS.
    let threw = false;
    try {
      Lumi.openCheckin(b.handle, a.publicKeyB64, 'AAAAAAAAAAAAAAAAAAAA');
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
