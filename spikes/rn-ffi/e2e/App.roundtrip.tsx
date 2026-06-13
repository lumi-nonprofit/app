// THROWAWAY — injected into the scaffolded example app to run a real JS→Rust→JS
// round-trip on device and print a sentinel the CI greps from the device log.
import * as React from 'react';
import { Text, View, AppRegistry } from 'react-native';
// Generated TurboModule surface (re-exported by the scaffolded lib package).
import {
  newDeviceKey,
  sealCheckin,
  openCheckin,
} from 'react-native-lumi-spike';

const SENTINEL = 'LUMI_SPIKE_RESULT';

function runRoundTrip(): string {
  try {
    const a = newDeviceKey();
    const b = newDeviceKey();
    const draft = { mood: 'klid', intensity: 3, note: 'ok' };
    const sealed = sealCheckin(a.handle, b.publicKey, draft);
    const opened = openCheckin(b.handle, a.publicKey, sealed);
    const roundtrip =
      opened.mood === 'klid' && opened.intensity === 3 && opened.note === 'ok';

    // Throwing-fn check: too-short sealed buffer must surface an error in JS.
    let threw = false;
    try {
      openCheckin(b.handle, a.publicKey, new Uint8Array([1, 2, 3]).buffer);
    } catch (_e) {
      threw = true;
    }

    const pass = roundtrip && threw;
    return `${SENTINEL} ${JSON.stringify({ pass, roundtrip, threw })}`;
  } catch (e) {
    return `${SENTINEL} ${JSON.stringify({ pass: false, error: String(e) })}`;
  }
}

export default function App() {
  const [line] = React.useState(runRoundTrip);
  // eslint-disable-next-line no-console
  console.log(line); // -> ReactNativeJS in logcat / iOS log
  return (
    <View>
      <Text>{line}</Text>
    </View>
  );
}

AppRegistry.registerComponent('LumiSpikeExample', () => App);
