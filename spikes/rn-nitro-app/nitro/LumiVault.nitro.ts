// Step 4a — app-integrated Nitro Hybrid Object spec over the lumi-ffi-cabi C ABI.
// Pure C++ on both platforms. Validated with Nitrogen 0.35.9 -> generates
// HybridLumiVaultSpec + lumivault+autolinking.cmake + lumivaultOnLoad.{cpp,hpp,kt}.
//
// §1: only handles, the PIN inbound, plaintext JSON, a hex record id, and a JS-number-safe
// createdAt cross — NO key bytes. createdAtMs is a number (ms; must stay < 2^53; no raw i64
// as a JS number). The list is returned as a JSON string the TS wrapper double-decodes.
import type { HybridObject } from 'react-native-nitro-modules';

export interface LumiVault extends HybridObject<{ ios: 'c++'; android: 'c++' }> {
  open(dbPath: string): void; // THROWS on error code
  close(): void;
  unlock(pin: string): number; // -> opaque handle (small monotonic counter, < 2^53); THROWS on wrong PIN
  putCheckin(handle: number, recordJson: string, createdAtMs: number): string; // -> record id hex; THROWS
  listCheckinsJson(handle: number): string; // -> raw JSON array string; TS wrapper double-decodes; THROWS
  shredCheckin(handle: number, recordId: string): boolean; // -> destroyed?; THROWS on real errors
}
