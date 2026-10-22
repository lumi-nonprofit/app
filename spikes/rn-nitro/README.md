# Spike #1b (Nitro) — Rust↔RN binding go/no-go (THROWAWAY)

> **Note (2026-10-18):** Rewritten in Simplified Technical English on 2026-10-18; decisions and section numbering unchanged.

This spike is the go/no-go for **`RN-handjsi` through Nitro** as the v1 path (ADR 0003).
`create-react-native-library` removed the C++ TurboModule template. Thus we do not write the JSI
glue by hand: we use **Nitro** (`react-native-nitro-modules` + `nitrogen`). Nitrogen _statically
generates_ the JSI glue from a TS spec, which removes the bus-factor-1 hand-glue risk. We write the
method logic in **C++**, and the C++ calls our **Rust C ABI**.

The UI stays React Native, so the accessibility and UI-preservation rationale of ADR 0003 stays
the same. Only the native binding changes. Android first; iOS deferred.

**Start with `RUNBOOK.md`.**

## Layout

- `rust/lumi-ffi-cabi/` — **reused unchanged**: the Rust C ABI (x25519, ChaCha20-Poly1305, HKDF
  and the `SECRETS` handle registry; §1: no secret crosses). Tested on the host (Step 0).
- `nitro/LumiCrypto.nitro.ts` — the pure-C++ Hybrid Object spec.
- `nitro/nitro.json` — autolinking → C++ `HybridLumiCrypto` (current Nitrogen syntax).
- `nitro/cpp/HybridLumiCrypto.{hpp,cpp}` — the hand-written C++ implementation (method logic,
  base64 and the Rust C ABI calls). It is a subclass of the Nitrogen-generated
  `HybridLumiCryptoSpec`.
- `nitro/CMakeLists.additions.cmake` — links the per-ABI Rust static library into the
  `lumicrypto` target.
- `App.tsx` — the round-trip through `NitroModules.createHybridObject<LumiCrypto>('LumiCrypto')`.
- `scripts/build-rust-android.sh` — cargo-ndk (arm64-v8a and x86_64) and cbindgen → lib `cpp/`.
- `reference/LumiCryptoImpl.{h,cpp}` — the source of the earlier hand-JSI TurboModule port. Kept
  for reference only; `nitro/cpp/HybridLumiCrypto.*` supersedes it.

## Verified before the build (mid-2026)

- `react-native-nitro-modules@0.35.9` has the peer range `react-native: *` → **RN 0.81.4
  supported**.
- **A pure-C++ Hybrid Object generates cleanly** with Nitrogen 0.35.9. We ran it and captured the
  exact `HybridLumiCryptoSpec`, `DeviceKey`, `CheckinDraft` and `+autolinking.cmake` names.
- Gotcha, documented and fixed in the runbook: the codegen package changed its name from
  `nitro-codegen` to `nitrogen`. The old package is deprecated at 0.29.4; the
  `create-react-native-library` template still pins it.

## GO / NO-GO — **result: GO (2026-06-14)**

**GO.** A live JS→Rust→JS round-trip ran on a real **arm64 device** (Pixel 8a, GrapheneOS) on the
New Architecture, with §1 intact. The app emitted `LUMI_SPIKE_RESULT
{"pass":true,"roundtrip":true,"threw":true}`. **The run empirically validates RN through Nitro as
the v1 binding path.** The next step is the real integration, after Anna's review.

The full report, the evidence and the 3 fixes from the run are in **`SPIKE-REPORT.md`** and in the
inline annotations in `RUNBOOK.md`. As predicted, the Rust C ABI and the Nitrogen codegen were the
solid parts. The iteration was in the per-ABI NDK build and in the Android autolinking and
registration (3 fixes, 1 round).

Honest scope: GO rests on the live arm64-device leg and on a clean x86_64 build. The
x86_64-emulator runtime leg was optional, and we did not run it. We reached GO through the **debug
dev-loop**; the release Java package step is a deferred production-hygiene item, not a blocker.
**iOS stays deferred** per ADR 0001.

You **can now delete** the throwaway scaffold (`~/lumi-crypto-spike`); this `spikes/rn-nitro/` kit
stays as the reference. No real RN↔core integration exists yet; `apps/` stays empty.
