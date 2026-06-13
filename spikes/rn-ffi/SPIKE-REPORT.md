# Spike #1 — GO/NO-GO report: `uniffi-bindgen-react-native` (ADR 0001 §13)

**Date:** 2026-06-13 · **Verdict: STRONG PARTIAL — not a full GO yet.**
4 of the 5 gate criteria are PROVEN with CI evidence on real toolchains; criterion 3
(live round-trip on a real device/emulator on the New Architecture) was **not
exercised this session** and is the one remaining leg. The binder itself shows **no
NO-GO signal** — every binder-specific risk (existence, maturity, pin/vendor,
codegen on realistic types, cross-compile, §1) came back positive.

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
| 3 | Round-trip call on a real device/emulator, on the New Architecture (JSI/Fabric), pinned RN version | **NOT EXERCISED** | No RN New-Arch app + TurboModule run on an emulator/simulator this session. The decisive integration leg remains. |
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

## What it would take to close criterion 3

Build a minimal RN New-Architecture app (throwaway) that consumes the generated
TurboModule (the `ubrn build android/ios` happy path + the RN scaffold), then run a
JS→Rust→JS round-trip:
- **Android:** on a CI Linux runner with KVM via `reactivecircus/android-emulator-runner`.
- **iOS:** on a macOS runner with an iOS simulator.

This is a meaningfully larger integration than the cross-compile/codegen proved here,
and is the genuine remaining risk to retire before committing D-rn-for-v1.

## Recommendation

The binder is sound and well-backed; criteria 1/2/4/5 are green. This is **not a
NO-GO** — there is no reason yet to reopen to the §2.4a broad-surface analysis. But
per the gate's "GO only if ALL hold," it is **not yet a GO** either: criterion 3
remains. Decision for Anna:
- **(a)** Authorize the focused emulator/simulator e2e leg (above) to close criterion
  3 → then GO; or
- **(b)** Accept 4/5 + the Mozilla/Filament backing as sufficient confidence to
  proceed with D-rn-for-v1, treating criterion 3 as an early task in the RN↔core
  integration (with the right to reopen if the live round-trip then fails).

**Stopped for review. No RN↔core integration built. Harness is throwaway, kept for
your review; quarantine/delete after.**
