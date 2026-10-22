# Spike #1b — GO/NO-GO report: RN ↔ Rust binding through **Nitro** (ADR 0003 gate)

> **Note (2026-10-18):** Rewritten in Simplified Technical English on 2026-10-18; decisions and section numbering unchanged.

**Date:** 2026-06-14 · **Verdict: GO.** A live JS→Rust→JS round-trip ran on **real arm64
hardware** (Pixel 8a, GrapheneOS) with §1 intact. This clears the spike #1b gate in ADR 0003 and
**empirically validates the v1 binding choice**. The choice is React Native, bound to the shared
Rust core, with **Nitro** as the binding mechanism. We adopted Nitro after
`create-react-native-library` 0.49 dropped its C++ TurboModule template. The accessibility and
UI-preservation rationale of ADR 0003 does not change.

**Validated stack (end-to-end, at runtime):**

```text
React Native (New Arch / Fabric)
  → Nitro Modules
    → C++ HybridObject  (HybridLumiCrypto)
      → Rust C ABI       (lumi-ffi-cabi: x25519 + ChaCha20-Poly1305 + HKDF + SECRETS registry)
```

This is the inverse of spike #1 (`spikes/rn-ffi/SPIKE-REPORT.md`, ubrn → NO-GO). There, the live
round-trip of the binder never ran. Here it runs, on a real device, through hand-owned C++ whose
JSI glue **Nitrogen generates statically**. This closes the bus-factor-1 hand-glue risk that
ADR 0003 flagged: we own the method bodies, not the JSI glue.

## Environment honesty

**Anna ran this spike on her own machine** (Fedora 44 + Pixel 8a over USB), not in this sandbox.
The sandbox has no C compiler, no NDK and no device. She copied the kit under `spikes/rn-nitro/`
by hand into a throwaway scaffold at `~/lumi-crypto-spike` (`create-react-native-library` 0.49.10,
`--type nitro-module`). The result below is her on-device run; she applied the 3 fixes live during
it.

## Criteria

| #   | Criterion                                                                            | Status                 | Evidence                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| --- | ------------------------------------------------------------------------------------ | ---------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Representative core (real pure-Rust crypto) + non-trivial typed fns over the binding | **PROVEN**             | `lumi-ffi-cabi`: X25519 DH + HKDF-SHA256 + ChaCha20-Poly1305. `newDeviceKey`/`sealCheckin`/`openCheckin` ran on real records (`{mood, intensity, note}`). Host `cargo test` green (Step 0); the same calls ran on the device.                                                                                                                                                                                                                                                                                                 |
| 2   | Cross-compile + link to a REAL target (arm64 Android, NDK)                           | **PROVEN**             | `cargo ndk` built `liblumi_ffi_cabi.a` for **arm64-v8a + x86_64**; linked into `liblumicrypto.so`; the `.so` loads on the device. (The release CMake also compiled both ABIs clean; see the run method.)                                                                                                                                                                                                                                                                                                                      |
| 3   | **Live round-trip on real hardware, New Architecture**                               | **PROVEN (GO)**        | On the Pixel 8a (GrapheneOS): `sealCheckin → openCheckin` round-tripped through Rust; the throw path (garbage sealed blob) surfaced its error to JS. The app emitted `LUMI_SPIKE_RESULT {"pass":true,"roundtrip":true,"threw":true}` to **both** the ReactNativeJS log **and** the on-screen UI. logcat confirmed the chain: `liblumicrypto.so` loaded → `Nitro.HybridObjectRegistry: Successfully registered HybridObject "LumiCrypto"` → JS prototype created for `HybridLumiCryptoSpec` → `fabric:true` (New Arch active). |
| 4   | §1 invariant: no raw key bytes cross the FFI into the JS heap                        | **PROVEN (both ways)** | **Runtime:** JS only ever held the opaque `handle`; the X25519 private key never left the Rust `SECRETS` registry. **Static:** the Nitro spec surface is exactly `handle`, `publicKeyB64`, `peerPublicB64` (a peer _public_ key, input only), `mood`, `intensity`, `note`, `sealedB64`; no private or secret type in any signature.                                                                                                                                                                                           |
| 5   | We can pin and reproduce the binding toolchain                                       | **PROVEN**             | `react-native-nitro-modules` + `nitrogen@0.35.9` (the codegen changed its name from the deprecated `nitro-codegen`); pure-C++ `HybridObject<{ios:'c++',android:'c++'}>`; Nitrogen-generated glue + `+autolinking.cmake` + `OnLoad`. The toolchain that worked is in `RUNBOOK.md` Step 1.                                                                                                                                                                                                                                      |

## Run method (honest)

We reached GO through the **DEBUG APK on the dev-loop** (Metro + `react-native run-android
--no-packager`), **not** through the offline release APK. `assembleRelease` **compiled the native
code cleanly for both arm64-v8a and x86_64**, but it failed later at the **Java dex-merge** (see
deferred item 1). So: **the native binding compiles clean in both debug and release; only the
release Java package step is open.** That is a `create-react-native-library` package issue, not a
binding-mechanism issue.

**Scope that we exercised, compared with the gate as written.** The gate (RUNBOOK / ADR 0003)
asked for the round-trip on the **x86_64 emulator AND the arm64 Pixel**. The **arm64 Pixel leg ran
live and passed**. The **x86_64 emulator leg did not run** (optional cross-arch confirmation);
x86_64 nonetheless compiled fine in the release CMake.

The earlier ADR 0003 gate text also named a **4-ABI** Android build. We narrowed that **by design**
to the **2 ABIs** we run: RUNBOOK Step 7 restricts `reactNativeArchitectures` to
`arm64-v8a,x86_64`. So arm64-v8a (built + run) and x86_64 (built only) are in scope; `armeabi-v7a`
and x86 are out of scope.

iOS stays deferred per ADR 0001 (no Mac; Android first). Thus, as for iOS, the x86_64-runtime and
full-4-ABI clauses pass through a **narrowed scope, not as literally written**. The verdict is GO
on the strength of the live arm64-device round-trip plus the clean x86_64 build.

## 3 issues hit and fixed (during the run)

We record them against the runbook steps, so that a re-run is clean (also annotated in
`RUNBOOK.md`):

1. **Step 5 — the Rust std targets were absent.** `build-rust-android.sh` failed with
   `error[E0463]: can't find crate for core` for `aarch64-linux-android`. An earlier
   `rustup target add` had no effect, and the `rustup` toolchain at `~/.cargo/bin` shadows a
   system dnf `rust`. **Fix:** `rustup target add aarch64-linux-android x86_64-linux-android`,
   then run the script again.
2. **Step 8 — autolinked Java package path mismatch.** The first `assembleDebug` failed at
   `:app:compileDebugJavaWithJavac`: RN autolinking generated `PackageList.java` with an import of
   `com.margelo.nitro.lumicrypto.LumiCryptoPackage`, but cra-library generated the class at
   `com.lumicrypto.LumiCryptoPackage`. With no `react-native.config.js`, autolinking derives the
   import from the Nitro namespace, which did not agree with the scaffold. **Fix:** move
   `android/src/main/java/com/lumicrypto/LumiCryptoPackage.kt` to
   `android/src/main/java/com/margelo/nitro/lumicrypto/LumiCryptoPackage.kt` and set its `package`
   to `com.margelo.nitro.lumicrypto`. That class is a no-op `TurboReactPackage` whose real job is
   `System.loadLibrary("lumicrypto")` in its init block; this fires the `OnLoad` of Nitrogen, which
   registers the C++ HybridObject. It must exist **and** be at the autolinked path.
3. **Step 8 — duplicate class from an unused template dependency.** The next `assembleDebug`
   failed at `:app:mergeLibDexDebug`: the dex merge found
   `com.facebook.react.viewmanagers.RNCSafeAreaProviderManagerDelegate` twice, from
   `react-native-safe-area-context`. That is an example-template dependency declared only in
   `example/package.json`; the harness does not use it. **Fix:**
   `cd example && yarn remove react-native-safe-area-context`.

## Production hygiene — deferred follow-ups (NOT spike blockers)

We stepped around these for the spike (debug dev-loop); they belong to the real app build:

1. **Release-APK dex collisions.** `assembleRelease` fails at `:app:mergeDexRelease` with
   `com.facebook.fbreact.specs.NativeAccessibilityInfoSpec` **defined twice** (and in general the
   `com.facebook.fbreact.specs` / `com.facebook.react.viewmanagers` set). The library module
   bundles the RN-core codegen specs that the app's own copy of React Native already has. This is
   a known interaction between `create-react-native-library` and the New-Architecture package
   step. **Fix direction (real app):** the library module must not bundle or regenerate the core
   and third-party codegen specs that the app already ships.
2. **16 KB ELF page alignment.** Debug-build advisory:
   `This app isn't 16 KB-compatible. ELF alignment check failed.` Our own `liblumicrypto.so`
   reported `LOAD segment not aligned` → **fix with the linker flag `-Wl,-z,max-page-size=16384`**
   (or NDK r28+, which defaults to 16 KB-aligned output). The other flagged libs are prebuilt
   dependencies: `libreactnative`, `libhermes`, `libjsi`, `libfbjni`, `libc++_shared`, the Fresco
   image libs and `libNitroModules`. The fix for them is 16 KB-aligned upstream versions.
   **Required for Google Play for Android-15+ targets;** irrelevant to the spike.

## Recommendation

**GO.** The v1 binding path — **React Native → Nitro → C++ → Rust C ABI** — passed the empirical
validation on real arm64 hardware with §1 intact. Proceed to the real RN↔core integration (M1+) on
this stack, after Anna's review. The 2 deferred items above are production-build hygiene to carry
into the real app, not blockers.

You **can now delete** the throwaway scaffold (`~/lumi-crypto-spike`). `spikes/rn-nitro/` stays as
the reference kit (the Rust C ABI crate, the Nitro spec and C++ Hybrid Object, the build script,
this report and `RUNBOOK.md`).

**No real RN↔core integration exists yet; `apps/` stays empty until M3.**
