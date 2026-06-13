# Spike #1 — GO/NO-GO report: `uniffi-bindgen-react-native` (ADR 0001 §13)

**Date:** 2026-06-13 · **Verdict: NO-GO on criterion 3 → reopen to §2.4a (per the gate rule).**
Criteria 1, 2, 4, 5 are PROVEN (codegen, cross-compile, §1, pin). Criterion 3 — the
live JS→Rust→JS round-trip on a real emulator/simulator on the New Architecture — was
**attempted across multiple CI iterations and did NOT pass on either leg.** Per the
gate ("GO only if BOTH legs round-trip; if either fails or is flaky → NO-GO"), this
fires **NO-GO** → reopen to §2.4a (CMP/Flutter via the gate-2 binding evaluation).

**Honest nuance (so the decision is fully informed):** this is *not* proof the binder
is fundamentally incapable — its codegen, cross-compile, and §1 all work, and
Mozilla/Filament ship it. The criterion-3 failure reflects **real pre-1.0 e2e
fragility at the pinned versions** PLUS the limits of a blind CI with no local mobile
dev loop. Some remaining issues look fixable with a local Xcode/Android Studio
debugging session. But under the conservative gate you set (the live round-trip is
the sufficient proof and must actually pass), it has **not** passed — so the gate
stays closed.

Evidence: CI workflow `Spike RN FFI (throwaway)` (`.github/workflows/spike-rn-ffi.yml`),
run on GitHub-hosted ubuntu + macOS runners. Harness is THROWAWAY (`spikes/rn-ffi/`);
`apps/` untouched.

## Environment honesty

This work was driven from a headless Linux **toolbx** with **no C compiler, no
Android SDK/NDK, no emulator, and no macOS/Xcode**. So nothing mobile ran locally;
everything below was proven on **CI full-toolchain runners** (ubuntu for Android +
host, macOS for iOS), exactly as the brief permitted. The on-device round-trip
(criterion 3) needs an emulator/simulator e2e harness that was not built here.

## Criteria

| # | Criterion | Status | Evidence |
|---|---|---|---|
| 1 | Representative core (real pure-Rust crypto) + non-trivial typed fn (record in / Result out); binding exercised on realistic types | **PROVEN** | `lumi-ffi-spike`: x25519-dalek + ChaCha20-Poly1305 + HKDF. Host round-trip test green. `ubrn generate jsi bindings` produced correct TS+C++ for `CheckinDraft`/`DeviceKey` records, `bigint`/`ArrayBuffer`, throwing fns. |
| 2 | Cross-compile to REAL targets: aarch64 Android (NDK) + iOS device + sim | **PROVEN** | `cargo ndk -t arm64-v8a build` → `liblumi_ffi_spike.so` (NDK r27c). `cargo build --target aarch64-apple-ios` + `…-ios-sim` on macOS. |
| 3 | Round-trip on a real device/emulator, New Architecture, pinned RN version | **ATTEMPTED — FAILED** | Built a throwaway RN 0.81.4 New-Arch turbo-module (create-react-native-library 0.49.10 + ubrn) for our crate. Neither leg reached a live round-trip — see §"Criterion 3" below. |
| 4 | §1 invariant: no raw key bytes cross the FFI into the JS heap | **PROVEN** | By design (the `StaticSecret` type is never in any `#[uniffi::export]` signature) AND firsthand in the generated TS: surface is `newDeviceKey()->{handle,publicKey}`, `publicKey(handle)->bytes`, `sealCheckin(handle,peerPublic,draft)->bytes`, `openCheckin(...)->CheckinDraft`. No `StaticSecret`/secret-key type anywhere. |
| 5 | Binder pinnable + vendorable | **PROVEN** | `uniffi-bindgen-react-native@0.29.3-1` pinned in `package.json`, installs + runs in CI. Mozilla + Filament-backed, built on first-party Mozilla UniFFI 0.29; GitHub-vendorable. (This is the maintained RN binder — **not** the stale third-party CMP/Kotlin fork flagged in ADR §2.5.) |

## Generated FFI surface (the §1 proof)

```ts
export function newDeviceKey(): DeviceKey                                  // {handle: bigint, publicKey: ArrayBuffer}
export function publicKey(handle: bigint): ArrayBuffer
export function sealCheckin(handle: bigint, peerPublic: ArrayBuffer, draft: CheckinDraft): ArrayBuffer
export function openCheckin(handle: bigint, peerPublic: ArrayBuffer, sealed: ArrayBuffer): CheckinDraft
export type CheckinDraft = { mood: string, intensity: number, note: string }
export type DeviceKey   = { handle: bigint, publicKey: ArrayBuffer }
```

The device private key lives only in a Rust-side registry behind the opaque `handle`;
the X25519 shared secret and HKDF key are derived and consumed inside Rust. Only the
handle, public keys, the plaintext domain record, and ciphertext cross the boundary.

## Rough edges (pre-1.0)

1. **First `npx ubrn` call compiles the binder CLI from Rust source** ("…only needed
   first time") — the build host needs a full Rust toolchain **+ a C compiler** just
   to run codegen. Budget this in CI and any contributor's machine.
2. `ubrn generate jsi` needs a **sub-subcommand** (`bindings` / `turbo-module`).
   `bindings` is the low-level uniffi form: `--library <compiled .so/.dylib>
   --ts-dir --cpp-dir`. The docs lead with the high-level `ubrn build` (turbo-module)
   path instead; the low-level path took discovery.
3. `ubrn generate jsi bindings` runs `cargo metadata` in **CWD** — must be invoked
   from the crate directory even in library mode.
4. The high-level `ubrn build android` (full TurboModule) needs the RN
   **library-project scaffold** (package.json `codegenConfig`,
   `react-native.config.js` `cmakeListsPath`) — that scaffold is part of the
   unexercised criterion-3 integration.
5. Doc-comments **propagate into generated TS JSDoc** (nice — but means prose words
   like "secret" appear in comments; not a leak. Verify §1 against type signatures,
   not substrings).
6. `cargo-ndk` via `taiki-e/install-action` flaked once (transient); `cargo install
   cargo-ndk --locked` was reliable. (`--version` flag also unsupported.)

## Criterion 3 — e2e attempt (what actually happened)

Harness: a throwaway turbo-module made with `create-react-native-library@0.49.10`
(RN **0.81.4**, New Arch / Fabric+TurboModules, Hermes), our `lumi-ffi-spike` crate
wired via ubrn, on CI runners (ubuntu+KVM for Android, macOS for iOS). Two iterations.
Workflow: `.github/workflows/spike-rn-e2e.yml` (runs `27472273533`, `27472776172`).

**Pre-1.0 plumbing failures hit (the "plumbing that tends to break" you flagged):**

1. **ubrn ↔ cargo-ndk version incompatibility (Android).** `ubrn build android` passes
   `--no-strip`, which **cargo-ndk 4.x removed** (changelog: "`--no-strip` option is
   removed"). So ubrn 0.29.3-1 is broken against current cargo-ndk; only worked after
   pinning **cargo-ndk 3.5.4** (EOL). A real maintenance/fragility signal.
2. **Android gradle build did not complete.** After the pin, `ubrn build android`
   succeeded, but `gradlew assembleDebug` builds CMake for **all 4 ABIs**
   (arm64-v8a/armeabi-v7a/x86/x86_64) while we built only the x86_64 `.so` (to match
   the x86_64 emulator). Needs ABI alignment + JS bundling for an offline emulator
   run — and this `gradle` turbo-module build is the step **ubrn's own CI disables as
   "perma-failing."**
3. **iOS app cannot link the Rust static library.** `ubrn build ios --and-generate`
   and `pod install` both succeed and generate the bindings + xcframework, but the
   app build fails at link: **`ld: library 'lumi_ffi_spike' not found`** — even after
   building the full default xcframework (not just one sim slice). The generated
   podspec/xcconfig isn't putting the static lib on the linker search path. Persistent
   across both iterations.

**Net:** neither leg reached a live round-trip. The failures are integration/
packaging issues at the pinned versions, plus the limits of debugging mobile builds
blind in CI (no local Xcode/Android Studio loop). They are *plausibly fixable* by a
mobile engineer with local tooling — but they did not pass here.

## Recommendation

Per the gate you set — criterion 3 is the sufficient proof and the gate stays open
until the live round-trip actually passes; if either leg fails or is flaky → NO-GO →
reopen to §2.4a — the result is **NO-GO**, because the live round-trip did not pass on
either leg and the e2e showed real fragility (ubrn↔cargo-ndk incompatibility; iOS
static-lib link failure; Android gradle/ABI + maintainer-disabled "perma-failing"
build).

→ **Reopen the v1 UI decision to the §2.4a broad-surface analysis** (Compose
Multiplatform / Flutter via the gate-2 binding-maturity evaluation), per the gate.

**Caveat for your decision:** this NO-GO means "the live New-Arch round-trip was not
achievable reliably in this attempt," not "the binder is fundamentally incapable" —
criteria 1/2/4/5 passed, and Mozilla/Filament ship this binder in production. If you'd
rather, a bounded retry on a real mobile dev machine (local Xcode + Android Studio)
could try to clear items 2–3 above before reopening. Your call; under the conservative
rule as written, it's NO-GO now.

**Stopped for your review. No RN↔core integration built. `apps/` untouched. Harness is
throwaway (`spikes/`) — quarantine/delete after review.**
