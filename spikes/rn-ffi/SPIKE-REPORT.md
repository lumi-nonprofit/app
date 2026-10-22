# Spike #1 — GO/NO-GO report: `uniffi-bindgen-react-native` (ADR 0001 §13)

> **Note (2026-10-18):** Rewritten in Simplified Technical English on 2026-10-18; decisions and section numbering unchanged.

**Date:** 2026-06-13 · **Verdict: NO-GO on criterion 3 → reopen to §2.4a (per the gate rule).**
Criteria 1, 2, 4 and 5 are PROVEN (codegen, cross-compile, §1, pin). Criterion 3 is the live
JS→Rust→JS round-trip on a real emulator/simulator on the New Architecture. **We tried it across
several CI iterations, and it did NOT pass on either leg.** The gate says: "GO only if BOTH legs
round-trip; if either fails or is flaky → NO-GO". Thus the result is **NO-GO** → reopen to §2.4a
(CMP/Flutter through the gate-2 binding evaluation).

**Honest nuance (so that the decision has the full picture):** this is _not_ proof that the binder
is fundamentally incapable. Its codegen, cross-compile and §1 all work, and Mozilla/Filament ship
it. The criterion-3 failure reflects **real pre-1.0 e2e fragility at the pinned versions**. It also
reflects the limits of a blind CI with no local mobile dev loop. Some of the open issues look
fixable with a local Xcode/Android Studio debug session.

But under the conservative gate you set, the live round-trip is the proof that counts, and it must
pass. It has **not** passed, so the gate stays closed.

Evidence: the CI workflow `Spike RN FFI (throwaway)` (`.github/workflows/spike-rn-ffi.yml`), run on
GitHub-hosted ubuntu and macOS runners. The harness is THROWAWAY (`spikes/rn-ffi/`); `apps/` stays
untouched.

## Environment honesty

I drove this work from a headless Linux **toolbx** with **no C compiler, no Android SDK/NDK, no
emulator and no macOS/Xcode**. So nothing mobile ran locally. The **CI full-toolchain runners**
(ubuntu for Android and host, macOS for iOS) proved everything below, exactly as the brief
permitted. The on-device round-trip (criterion 3) needs an emulator/simulator e2e harness, which
does not exist here.

## Criteria

| #   | Criterion                                                                                                                         | Status                 | Evidence                                                                                                                                                                                                                                                                                                                              |
| --- | --------------------------------------------------------------------------------------------------------------------------------- | ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Representative core (real pure-Rust crypto) + non-trivial typed fn (record in / Result out); binding exercised on realistic types | **PROVEN**             | `lumi-ffi-spike`: `x25519-dalek` + ChaCha20-Poly1305 + HKDF. Host round-trip test green. `ubrn generate jsi bindings` produced correct TS+C++ for the `CheckinDraft`/`DeviceKey` records, `bigint`/`ArrayBuffer` and the fns that throw.                                                                                              |
| 2   | Cross-compile to REAL targets: aarch64 Android (NDK) + iOS device + sim                                                           | **PROVEN**             | `cargo ndk -t arm64-v8a build` → `liblumi_ffi_spike.so` (NDK r27c). `cargo build --target aarch64-apple-ios` + `…-ios-sim` on macOS.                                                                                                                                                                                                  |
| 3   | Round-trip on a real device/emulator, New Architecture, pinned RN version                                                         | **ATTEMPTED — FAILED** | We built a throwaway RN 0.81.4 New-Arch turbo-module (`create-react-native-library` 0.49.10 + ubrn) for our crate. Neither leg reached a live round-trip; see §"Criterion 3" below.                                                                                                                                                   |
| 4   | §1 invariant: no raw key bytes cross the FFI into the JS heap                                                                     | **PROVEN**             | By design (the `StaticSecret` type is never in any `#[uniffi::export]` signature) AND firsthand in the generated TS: the surface is `newDeviceKey()->{handle,publicKey}`, `publicKey(handle)->bytes`, `sealCheckin(handle,peerPublic,draft)->bytes`, `openCheckin(...)->CheckinDraft`. No `StaticSecret` or secret-key type anywhere. |
| 5   | We can pin and vendor the binder                                                                                                  | **PROVEN**             | `uniffi-bindgen-react-native@0.29.3-1` is pinned in `package.json`; it installs and runs in CI. Mozilla and Filament back it; it builds on the first-party Mozilla UniFFI 0.29; we can vendor it from GitHub. (This is the maintained RN binder, **not** the stale third-party CMP/Kotlin fork flagged in ADR §2.5.)                  |

## Generated FFI surface (the §1 proof)

```ts
export function newDeviceKey(): DeviceKey; // {handle: bigint, publicKey: ArrayBuffer}
export function publicKey(handle: bigint): ArrayBuffer;
export function sealCheckin(
  handle: bigint,
  peerPublic: ArrayBuffer,
  draft: CheckinDraft,
): ArrayBuffer;
export function openCheckin(
  handle: bigint,
  peerPublic: ArrayBuffer,
  sealed: ArrayBuffer,
): CheckinDraft;
export type CheckinDraft = { mood: string; intensity: number; note: string };
export type DeviceKey = { handle: bigint; publicKey: ArrayBuffer };
```

The device private key lives only in a Rust-side registry behind the opaque `handle`. Rust derives
and consumes the X25519 shared secret and the HKDF key internally. Only the handle, the public
keys, the plaintext domain record and the ciphertext cross the boundary.

## Rough edges (pre-1.0)

1. **The first `npx ubrn` call compiles the binder CLI from Rust source** ("…only needed first
   time"). Thus the build host needs a full Rust toolchain **and a C compiler** only to run the
   codegen. Budget this in CI and on the machine of every contributor.
2. `ubrn generate jsi` needs a **sub-subcommand** (`bindings` / `turbo-module`). `bindings` is the
   low-level uniffi form: `--library <compiled .so/.dylib> --ts-dir --cpp-dir`. The docs lead with
   the high-level `ubrn build` (turbo-module) path instead; the low-level path took discovery.
3. `ubrn generate jsi bindings` runs `cargo metadata` in the **CWD**. You must call it from the
   crate directory, even in library mode.
4. The high-level `ubrn build android` (full TurboModule) needs the RN **library-project scaffold**
   (`codegenConfig` in `package.json`, `cmakeListsPath` in `react-native.config.js`). That
   scaffold is part of the criterion-3 integration, which we did not exercise.
5. Doc comments **propagate into the generated TS JSDoc**. This is nice, but it means that prose
   words such as "secret" appear in comments; that is not a leak. Verify §1 against the type
   signatures, not against substrings.
6. `cargo-ndk` through `taiki-e/install-action` flaked once (transient);
   `cargo install cargo-ndk --locked` was reliable. (The tool also has no `--version` flag.)

## Criterion 3 — e2e attempt (what happened)

Harness: a throwaway turbo-module made with `create-react-native-library@0.49.10` (RN **0.81.4**,
New Arch / Fabric+TurboModules, Hermes). Our `lumi-ffi-spike` crate is in it through ubrn. It ran
on CI runners (ubuntu+KVM for Android, macOS for iOS), in 2 iterations. Workflow:
`.github/workflows/spike-rn-e2e.yml` (runs `27472273533`, `27472776172`).

**Pre-1.0 integration failures (the fragile integration layer you flagged):**

1. **ubrn ↔ cargo-ndk version incompatibility (Android).** `ubrn build android` passes
   `--no-strip`, which **cargo-ndk 4.x removed** (changelog: `--no-strip option is removed`). So
   ubrn 0.29.3-1 does not work with the current cargo-ndk. It worked only after we pinned
   **cargo-ndk 3.5.4** (EOL). A real maintenance/fragility signal.
2. **The Android gradle build did not complete.** After the pin, `ubrn build android` succeeded,
   but `gradlew assembleDebug` builds CMake for **all 4 ABIs** (`arm64-v8a`/`armeabi-v7a`/`x86`/`x86_64`).
   We built only the x86_64 `.so` (to match the x86_64 emulator). An offline emulator run needs ABI
   alignment and JS bundling. Also, this `gradle` turbo-module build is the step that **the own CI
   of ubrn disables as `perma-failing`**.
3. **The iOS app cannot link the Rust static library.** `ubrn build ios --and-generate` and
   `pod install` both succeed and generate the bindings and the xcframework, but the app build
   fails at link: **`ld: library 'lumi_ffi_spike' not found`**. This happens even after a build of
   the full default xcframework (not only one sim slice). The generated podspec/xcconfig does not
   put the static lib on the linker search path. The failure persisted across both iterations.

**Net:** neither leg reached a live round-trip. The failures are integration and package issues at
the pinned versions. Add to that the limits of blind debug work on mobile builds in CI (no local
Xcode/Android Studio loop). A mobile engineer with local tools can _plausibly fix_ them, but they
did not pass here.

## Recommendation

Per the gate you set, criterion 3 is the proof that counts, and the gate stays open until the live
round-trip passes. If either leg fails or is flaky → NO-GO → reopen to §2.4a. The result is
**NO-GO**: the live round-trip did not pass on either leg, and the e2e showed real fragility. The
fragility: the ubrn↔cargo-ndk incompatibility, the iOS static-lib link failure, and the Android
gradle/ABI issue with the `perma-failing` build. (The ubrn maintainers disabled that build in
their own CI.)

→ **Reopen the v1 UI decision to the §2.4a broad-surface analysis** (Compose Multiplatform /
Flutter through the gate-2 binding-maturity evaluation), per the gate.

**Caveat for your decision:** this NO-GO means "the live New-Arch round-trip was not reliable in
this attempt". It does not mean "the binder is fundamentally incapable". Criteria 1/2/4/5 passed, and
Mozilla/Filament ship this binder in production. If you prefer, a bounded retry on a real mobile
dev machine (local Xcode + Android Studio) is possible. It can try to clear items 2–3 above before
you reopen the decision. Your call; under the conservative rule as written, it is NO-GO now.

**Stopped for your review. No RN↔core integration exists. `apps/` stays untouched. The harness is
throwaway (`spikes/`): quarantine or delete it after the review.**
