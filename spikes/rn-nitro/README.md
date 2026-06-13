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

## GO / NO-GO
GO = reliable live round-trip on the x86_64 emulator AND the arm64 Pixel, §1 intact →
RN-via-Nitro confirmed for v1. NO-GO = can't be made reliable even with the local loop →
fall back to CMP-uniffi (ADR 0003). Honest expectation: the Rust C ABI + Nitrogen codegen
are the solid parts; the per-ABI NDK/CMake link + Android registration are where iteration
(1–2 rounds) is likely. Paste errors as you hit them.
