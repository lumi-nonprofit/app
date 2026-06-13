// THROWAWAY spike #1b — TurboModule spec (New Architecture). The module name is
// 'LumiCrypto'; name your scaffold's spec accordingly so the codegen'd C++ base
// class is NativeLumiCryptoCxxSpec (matched by cpp/LumiCryptoImpl.{h,cpp}).
//
// Bytes cross as base64 STRINGS and the u64 handle as a decimal STRING — this keeps
// the codegen surface to string/number/Object only (no ArrayBuffer/struct codegen
// friction). Returns are untyped `Object` so the C++ builds the jsi::Object BY HAND
// (the point of this spike). JS-side typing is applied in App.tsx.
//
// §1: the only data that ever crosses is handle, publicKeyB64, mood, intensity,
// note, sealedB64 — NO secret/private-key type appears in any signature.
import type { TurboModule } from 'react-native';
import { TurboModuleRegistry } from 'react-native';

export interface Spec extends TurboModule {
  // -> { handle: string; publicKeyB64: string }   (private key stays in Rust)
  newDeviceKey(): Object;
  // -> sealedB64 string; THROWS on unknown handle / bad peer key
  sealCheckin(
    handle: string,
    peerPublicB64: string,
    mood: string,
    intensity: number,
    note: string,
  ): string;
  // -> { mood: string; intensity: number; note: string }; THROWS if sealed can't be opened
  openCheckin(handle: string, peerPublicB64: string, sealedB64: string): Object;
}

export default TurboModuleRegistry.getEnforcing<Spec>('LumiCrypto');
