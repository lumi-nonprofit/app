// THROWAWAY spike #1b (Nitro) — Hybrid Object spec. Pure C++ on both platforms
// (no Kotlin/Swift logic). Replaces the scaffold's src/LumiCrypto.nitro.ts.
// Verified with Nitrogen 0.35.9: generates HybridLumiCryptoSpec + DeviceKey /
// CheckinDraft C++ structs.
//
// §1: the only data that crosses is handle, publicKeyB64, mood, intensity, note,
// sealedB64 — NO secret/private-key type in any signature. The private key stays in
// the Rust SECRETS registry behind the opaque handle.
import type { HybridObject } from 'react-native-nitro-modules';

export interface DeviceKey {
  handle: string; // u64 as decimal string (JS-number-safe)
  publicKeyB64: string; // 32-byte X25519 public key, base64
}

export interface CheckinDraft {
  mood: string;
  intensity: number;
  note: string;
}

export interface LumiCrypto
  extends HybridObject<{ ios: 'c++'; android: 'c++' }> {
  // -> { handle, publicKeyB64 }   (private key stays in Rust)
  newDeviceKey(): DeviceKey;
  // -> sealedB64; THROWS on unknown handle / bad peer key
  sealCheckin(
    handle: string,
    peerPublicB64: string,
    mood: string,
    intensity: number,
    note: string,
  ): string;
  // -> { mood, intensity, note }; THROWS if the sealed blob can't be opened
  openCheckin(handle: string, peerPublicB64: string, sealedB64: string): CheckinDraft;
}
