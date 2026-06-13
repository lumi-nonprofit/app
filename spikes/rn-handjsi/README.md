# Spike #1b — hand-written RN JSI binding (THROWAWAY)

The go/no-go for **RN-handjsi** as the v1 path (ADR 0003): keep React Native + the
existing accessible UI, bind the Rust core with a **hand-written C++/JSI TurboModule
over a Rust C ABI (cbindgen) — NO ubrn, NO UniFFI**. Android only; iOS deferred.

This is the part blind CI couldn't do — it needs your interactive local loop on
**Fedora + Pixel + Android Studio**. Produced for you to run; we iterate on errors.

## What's here
- `rust/lumi-ffi-cabi/` — the Rust **C ABI** (`extern "C"` + cbindgen) over the
  representative crypto (x25519 + ChaCha20-Poly1305 + HKDF), with a handle registry so
  **no secret key bytes cross** (§1). Includes a host `cargo test`.
- `turbo-module/` — the **hand-written** TurboModule: TS spec (`NativeLumiCrypto.ts`),
  C++/JSI method bodies (`cpp/LumiCryptoImpl.{h,cpp}`), the round-trip `App.tsx`, and
  the `CMakeLists.additions.cmake` that links the Rust staticlib per ABI.
- `scripts/build-rust-android.sh` — cargo-ndk build for arm64-v8a + x86_64 + cbindgen.
- `RUNBOOK.md` — **start here**: step-by-step for your machine.

## GO / NO-GO
- **GO** = a reliable live JS→Rust→JS round-trip on the **x86_64 emulator AND your arm64
  Pixel**: `sealCheckin`→`openCheckin` round-trips, the throwing fn errors in JS, §1
  intact. Then RN-handjsi is confirmed for v1.
- **NO-GO** = it can't be made reliable even with the local debugging loop → fall back
  to **CMP-uniffi** (ADR 0003 fallback). I'll call this honestly rather than force it.

## Honest expectation
The Rust C ABI is the solid part. The New-Arch C++ TurboModule wiring (codegen names,
CMake target, multi-ABI link) is fiddly and version-sensitive — expect **1–3 iteration
rounds** on real errors. That iteration burden *is* part of what the spike measures:
if it's a reasonable debugging loop, RN-handjsi is sound; if it's a quagmire, that's the
signal. Paste errors as you hit them.
