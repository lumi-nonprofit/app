# Spike #1b (Nitro) — Rust↔RN binding go/no-go (THROWAWAY)

Go/no-go for **RN-handjsi via Nitro** as the v1 path (ADR 0003). create-react-native-library
removed the C++ TurboModule template, so instead of hand-owning the JSI glue we use
**Nitro** (`react-native-nitro-modules` + `nitrogen`): Nitrogen *statically generates*
the JSI glue from a TS spec (retiring the bus-factor-1 hand-glue risk), and we implement
the logic in **C++** calling our **Rust C ABI**. Still React Native → ADR 0003's
accessibility / UI-preservation rationale is untouched; only the native binding changes.
Android-first; iOS deferred.

**Start with `RUNBOOK.md`.**

## Layout
- `rust/lumi-ffi-cabi/` — **reused unchanged**: the Rust C ABI (x25519 + ChaCha20-Poly1305
  + HKDF + the `SECRETS` handle registry; §1: no secret crosses). Host-tested (Step 0).
- `nitro/LumiCrypto.nitro.ts` — the pure-C++ Hybrid Object spec.
- `nitro/nitro.json` — autolinking → C++ `HybridLumiCrypto` (current Nitrogen syntax).
- `nitro/cpp/HybridLumiCrypto.{hpp,cpp}` — the hand-written C++ impl (method logic +
  base64 + Rust C ABI calls), subclassing the Nitrogen-generated `HybridLumiCryptoSpec`.
- `nitro/CMakeLists.additions.cmake` — link the per-ABI Rust staticlib into the
  `lumicrypto` target.
- `App.tsx` — round-trip via `NitroModules.createHybridObject<LumiCrypto>('LumiCrypto')`.
- `scripts/build-rust-android.sh` — cargo-ndk (arm64-v8a + x86_64) + cbindgen → lib `cpp/`.
- `reference/LumiCryptoImpl.{h,cpp}` — the prior hand-JSI TurboModule port source (kept
  for reference; superseded by `nitro/cpp/HybridLumiCrypto.*`).

## Verified before building (mid-2026)
- `react-native-nitro-modules@0.35.9`, peers `react-native: *` → **RN 0.81.4 supported**.
- **Pure-C++ Hybrid Object generates cleanly** with Nitrogen 0.35.9 (ran it; captured the
  exact `HybridLumiCryptoSpec` / `DeviceKey` / `CheckinDraft` / `+autolinking.cmake` names).
- Gotcha documented + fixed in the runbook: codegen renamed `nitro-codegen` → `nitrogen`
  (old one deprecated at 0.29.4; the create-react-native-library template still pins it).

## GO / NO-GO — **result: GO (2026-06-14)**
**GO.** A live JS→Rust→JS round-trip ran on a real **arm64 device** (Pixel 8a, GrapheneOS)
on the New Architecture, §1 intact — `LUMI_SPIKE_RESULT
{"pass":true,"roundtrip":true,"threw":true}`. **RN-via-Nitro is empirically validated as
the v1 binding path** (proceed to real integration after Anna's review). Full report +
evidence + the three fixes hit during the run: **`SPIKE-REPORT.md`** (and the inline
annotations in `RUNBOOK.md`). As predicted, the Rust C ABI + Nitrogen codegen were
the solid parts; the iteration was in the per-ABI NDK build + Android autolinking/
registration (three fixes, one round).

Honest scope: GO rests on the live arm64-device leg + a clean x86_64 build (the
x86_64-emulator runtime leg was optional, not run); reached via the **debug dev-loop**
(release Java packaging is a deferred production-hygiene item, not a blocker); **iOS
deferred** per ADR 0001.

The throwaway scaffold (`~/lumi-crypto-spike`) **can now be deleted**; this `spikes/rn-nitro/`
kit stays as the reference. No real RN↔core integration built yet; `apps/` stays empty.
