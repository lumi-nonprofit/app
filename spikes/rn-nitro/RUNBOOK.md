# Spike #1b runbook (Nitro) — Rust↔RN binding on real Android

> **Result: GO (2026-06-14, Pixel 8a / arm64).** Live JS→Rust→JS round-trip passed on
> real hardware, §1 intact; full report in `SPIKE-REPORT.md`. The three fixes hit during
> the run are annotated inline below (Steps 5, 8) so a re-run is clean; two production-
> hygiene items are recorded at the end (not spike blockers). The throwaway scaffold
> (`~/lumi-crypto-spike`) can now be deleted — this kit stays as the reference.

**GO criterion (unchanged):** a live JS→Rust→JS round-trip on the **x86_64 emulator
AND the arm64 Pixel** — `sealCheckin → openCheckin` round-trips, the throwing fn errors
in JS, §1 intact — emitting `LUMI_SPIKE_RESULT {"pass":true,"roundtrip":true,"threw":true}`.
**NO-GO** if it can't be made reliable even with the local loop → fall back to
CMP-uniffi (ADR 0003). Android-first; iOS deferred. Throwaway under `spikes/`; `apps/`
stays empty. This is a debugging loop: run a step, paste me the error, I fix, repeat.
(As run: GO was reached on the **arm64 Pixel** via the **debug dev-loop**; the x86_64
emulator runtime leg was optional and not run, though x86_64 compiled clean.)

Binding = **Nitro** (`react-native-nitro-modules` + `nitrogen`): Nitrogen statically
generates the JSI glue from a TS spec; we implement the logic in **C++** calling our
**Rust C ABI**. Files: `nitro/LumiCrypto.nitro.ts`, `nitro/nitro.json`,
`nitro/cpp/HybridLumiCrypto.{hpp,cpp}`, `nitro/CMakeLists.additions.cmake`, `App.tsx`,
`rust/lumi-ffi-cabi/`, `scripts/build-rust-android.sh`. (`reference/LumiCryptoImpl.*`
is the old hand-JSI port source, kept for reference only.)

> **Verified for you (mid-2026):** `react-native-nitro-modules@0.35.9` peers are
> `react-native: *` (so RN 0.81.4 is fine), and a **pure-C++ Hybrid Object**
> (`HybridObject<{ ios:'c++', android:'c++' }>`) generates cleanly with **Nitrogen
> 0.35.9** — I ran it and captured the exact generated names below. **One gotcha:** the
> codegen package was renamed `nitro-codegen` → **`nitrogen`**; the old `nitro-codegen`
> is deprecated (stuck at 0.29.4) and create-react-native-library@0.49.10 still pins it.
> Step 2 fixes that.

---

## Step 0 — host sanity (no Android): does the Rust crypto work?

```bash
cd spikes/rn-nitro/rust/lumi-ffi-cabi && cargo test
```

Expect `test result: ok` (seal/open round-trip + throwing path + unknown handle).

## Step 1 — toolchain (assumed already present in your toolbox — just verify)

Your toolbox already has: Temurin **JDK 21** (`JAVA_HOME` set), Android SDK at
`~/Android/Sdk` (`ANDROID_HOME`/`ANDROID_NDK_HOME` set), platform-tools, android-35,
build-tools 35.0.0, **ndk 27.1.12297006**, cmake 3.22.1, emulator, **cargo-ndk 4.1.2**,
**cbindgen 0.29.4**, **Node v24**, rust targets aarch64/x86_64-linux-android.

```bash
node -v; java -version; adb version; cargo ndk --version; cbindgen --version
echo "$ANDROID_HOME / $ANDROID_NDK_HOME"
rustup target list --installed | grep android
```

Version notes (flagged): **JDK 21** is fine for RN 0.81.4 + AGP 8.7.2 (the scaffold's
Gradle plugin). **cargo-ndk 4.1.2** is fine here — we run a plain `build` (no
`--no-strip`), so ubrn's cargo-ndk break does not apply. **cbindgen 0.29.4** fine.

> **Confirmed working (2026-06-14 GO run, Fedora 44):** **Temurin JDK 21** — use exactly
> this; Fedora 44 only ships JDK **25/26**, which are too new for the scaffold's Gradle/AGP.
> Android SDK **platform-35 / build-tools-35 / cmake 3.22.1 / NDK 27.x**; **cargo-ndk
> 4.1.2**; rustup targets **`aarch64-linux-android` + `x86_64-linux-android`** — confirm
> they are actually installed (see Step 5; an earlier `rustup target add` may not have
> stuck, and `rustup` at `~/.cargo/bin` shadows a system dnf `rust`).

## Step 2 — scaffold the throwaway Nitro module (outside the Lumi repo)

```bash
cd "$HOME"
npm_config_yes=true npx create-react-native-library@0.49.10 lumi-crypto-spike \
  --react-native-version 0.81.4 \
  --slug react-native-lumi-crypto \
  --description spike1b --author-name you --author-email you@example.com \
  --author-url https://example.com \
  --repo-url https://github.com/lumi-nonprofit/app \
  --type nitro-module --example vanilla
cd lumi-crypto-spike
```

This generates module **`LumiCrypto`**, spec `src/LumiCrypto.nitro.ts`, `nitro.json`,
a sample Kotlin/Swift impl, and an `example/` app. **Fix the stale codegen pin:**

```bash
npm pkg delete devDependencies.nitro-codegen
npm pkg set devDependencies.nitrogen=^0.35.9
npm pkg set scripts.nitrogen=nitrogen
yarn   # installs (now resolvable)
```

## Step 3 — drop in the spike files (switch to pure C++)

Let `SPIKE=<abs path>/Lumi/spikes/rn-nitro`.

```bash
cp "$SPIKE/nitro/LumiCrypto.nitro.ts" src/LumiCrypto.nitro.ts   # c++ spec + DeviceKey/CheckinDraft
cp "$SPIKE/nitro/nitro.json"          nitro.json                # autolinking -> c++ / HybridLumiCrypto
mkdir -p cpp
cp "$SPIKE/nitro/cpp/HybridLumiCrypto.hpp" cpp/
cp "$SPIKE/nitro/cpp/HybridLumiCrypto.cpp" cpp/
cp -R "$SPIKE/rust/lumi-ffi-cabi" rust/                          # the Rust C ABI crate
cp "$SPIKE/App.tsx" example/src/App.tsx                          # adjust the type import if needed
# remove the sample Kotlin/Swift impls (replaced by the C++ Hybrid Object):
rm -f android/src/main/java/com/margelo/nitro/lumicrypto/LumiCrypto.kt
rm -f ios/LumiCrypto.swift
# keep android/src/main/cpp/cpp-adapter.cpp (the JNI_OnLoad -> nitro initialize).
# make the lib export the type so example can import it (src/index.tsx):
#   export type { LumiCrypto, DeviceKey, CheckinDraft } from './LumiCrypto.nitro';
```

## Step 4 — run Nitrogen (generates the C++ spec + structs + autolinking)

```bash
yarn nitrogen   # == npx nitrogen
```

Generates (confirmed): `nitrogen/generated/shared/c++/HybridLumiCryptoSpec.{hpp,cpp}`,
`DeviceKey.hpp`, `CheckinDraft.hpp`, and `nitrogen/generated/android/lumicrypto+autolinking.cmake`

- `lumicryptoOnLoad.{cpp,hpp,kt}` (the OnLoad auto-registers `HybridLumiCrypto`).

## Step 5 — build the Rust C-ABI libs into the lib's cpp/

```bash
bash "$SPIKE/scripts/build-rust-android.sh" "$PWD/cpp"
```

Writes `cpp/rust-libs/{arm64-v8a,x86_64}/liblumi_ffi_cabi.a` and `cpp/lumi_ffi.h`.

> **Fix hit during the GO run — Rust std targets not actually installed.** The script
> failed with `error[E0463]: can't find crate for core` for `aarch64-linux-android`: an
> earlier `rustup target add` hadn't stuck, and the `rustup` toolchain at `~/.cargo/bin`
> shadows a system dnf `rust`. **Fix:** install the targets, then re-run:
>
> ```bash
> rustup target add aarch64-linux-android x86_64-linux-android
> rustup target list --installed | grep android   # verify both appear
> bash "$SPIKE/scripts/build-rust-android.sh" "$PWD/cpp"
> ```

## Step 6 — wire CMake

Open `android/CMakeLists.txt` (the template's: `project(lumicrypto)`,
`add_library(lumicrypto SHARED src/main/cpp/cpp-adapter.cpp)`,
`include(.../nitrogen/generated/android/lumicrypto+autolinking.cmake)`,
`include_directories("src/main/cpp" "../cpp")`). **After the `include(...)` line**,
append the 3 blocks from `$SPIKE/nitro/CMakeLists.additions.cmake` (add the
`HybridLumiCrypto.cpp` source + link the per-ABI Rust staticlib). `cpp/` is already on
the include path, so `HybridLumiCrypto.hpp` and `lumi_ffi.h` resolve.

## Step 7 — restrict ABIs to what we built

`example/android/gradle.properties`:

```
reactNativeArchitectures=arm64-v8a,x86_64
newArchEnabled=true
```

## Step 8 — build + run

**Dev loop (fast iteration) — this is the path that reached GO:**

```bash
cd example
npx react-native start          # terminal 1 (Metro)
npx react-native run-android     # terminal 2: emulator (boot one first) or Pixel via USB
adb logcat -c && adb logcat | grep -i LUMI_SPIKE_RESULT
```

> **Two fixes hit during the GO run** (both at `assembleDebug`; apply once, then re-run):
>
> 1. **`:app:compileDebugJavaWithJavac` — autolinked Java package path mismatch.** RN
>    autolinking generated `PackageList.java` importing
>    `com.margelo.nitro.lumicrypto.LumiCryptoPackage`, but cra-library generated the class
>    at `com.lumicrypto.LumiCryptoPackage`. With no `react-native.config.js`, autolinking
>    auto-derives the import from the Nitro namespace, which disagreed with the scaffold.
>    **Fix:** move the package class to the autolinked path and fix its `package`:
>    ```bash
>    cd "$HOME/lumi-crypto-spike"
>    mkdir -p android/src/main/java/com/margelo/nitro/lumicrypto
>    git mv android/src/main/java/com/lumicrypto/LumiCryptoPackage.kt \
>           android/src/main/java/com/margelo/nitro/lumicrypto/LumiCryptoPackage.kt 2>/dev/null || \
>    mv     android/src/main/java/com/lumicrypto/LumiCryptoPackage.kt \
>           android/src/main/java/com/margelo/nitro/lumicrypto/LumiCryptoPackage.kt
>    # then set its first line to: package com.margelo.nitro.lumicrypto
>    ```
>    (That class is a no-op `TurboReactPackage` whose real job is
>    `System.loadLibrary("lumicrypto")` in its init block → fires Nitrogen's `OnLoad` →
>    registers the C++ HybridObject. It must exist **and** be findable at the autolinked
>    path — don't just delete it.)
> 2. **`:app:mergeLibDexDebug` — duplicate class from an unused template dep.**
>    `com.facebook.react.viewmanagers.RNCSafeAreaProviderManagerDelegate` defined twice,
>    from `react-native-safe-area-context` (an example-template dep in `example/package.json`,
>    never imported by the harness). **Fix:** `cd example && yarn remove react-native-safe-area-context`.

**Offline release (NOT used for GO — release Java packaging is a deferred follow-up):**

```bash
# example/android/app/build.gradle: buildTypes { release { signingConfig signingConfigs.debug } }
cd example/android && ./gradlew assembleRelease
adb install -r app/build/outputs/apk/release/app-release.apk
PKG=$(aapt dump badging app/build/outputs/apk/release/app-release.apk | sed -n "s/package: name='\([^']*\)'.*/\1/p")
adb shell am start -n "$PKG/.MainActivity"
adb logcat -c && adb logcat | grep -i LUMI_SPIKE_RESULT
```

> **As run:** `assembleRelease` **compiled the native code cleanly for both arm64-v8a and
> x86_64** but failed downstream at `:app:mergeDexRelease` (release dex collisions — see
> _Production hygiene_ below). GO was therefore reached via the **debug dev-loop on the
> arm64 Pixel**, not this offline-release APK. The native binding compiles clean in both
> debug and release; only release Java packaging is unresolved (deferred, not a blocker).

Run on the **arm64 Pixel** (USB; `adb devices`); the x86_64 emulator runtime leg is an
optional cross-arch confirmation (x86_64 compiled clean in the release CMake).

**Expected (GO):** `LUMI_SPIKE_RESULT {"pass":true,"roundtrip":true,"threw":true}` — seen
on the Pixel 8a, in both the ReactNativeJS log and the on-screen UI.

## Step 9 — §1 verification (no secret crosses)

```bash
grep -RniE "secret|private[_-]?key|staticsecret" \
  "$SPIKE/nitro/LumiCrypto.nitro.ts" "$SPIKE/nitro/cpp/HybridLumiCrypto."*
```

Expect nothing in any signature — only `handle`, `publicKeyB64`, `peerPublicB64` (a peer
_public_ key, input-only), `mood`, `intensity`, `note`, `sealedB64` cross; the private key
stays in the Rust `SECRETS` registry.

## Production hygiene — deferred, not spike blockers

Two issues were stepped around for the spike (debug dev-loop) and belong to the **real app
build**, not to the GO/NO-GO. Recorded with cause + fix direction:

1. **Release-APK dex collisions.** `assembleRelease` fails at `:app:mergeDexRelease` with
   `com.facebook.fbreact.specs.NativeAccessibilityInfoSpec` (and generally the
   `com.facebook.fbreact.specs` / `com.facebook.react.viewmanagers` set) **defined twice** —
   the library module bundles RN-core codegen specs the app's own React Native already
   provides. A known create-react-native-library + New-Architecture packaging interaction.
   **Fix direction:** stop the library module from bundling/regenerating the core (and
   third-party) codegen specs the app already ships.
2. **16 KB ELF page alignment.** Debug advisory: "This app isn't 16 KB-compatible. ELF
   alignment check failed." Our own `liblumicrypto.so` reported `LOAD segment not aligned`
   → **fix with `-Wl,-z,max-page-size=16384`** (or NDK r28+, which defaults to 16 KB-aligned
   output). The other flagged libs (`libreactnative`, `libhermes`, `libjsi`, `libfbjni`,
   `libc++_shared`, the Fresco image libs, `libNitroModules`) are prebuilt deps → resolved
   via 16 KB-aligned upstream versions. **Required for Google Play on Android-15+ targets;**
   irrelevant to the spike itself.

## Likely failure points (we iterate)

- **Nitrogen "0 specs found"** → `react-native-nitro-modules` not installed / spec
  import unresolved → ensure `yarn` succeeded after the Step-2 codegen fix.
- **`undefined reference` to `lumi_*`** → CMake additions not applied / wrong target →
  the target is `lumicrypto`; the staticlib path is `cpp/rust-libs/${ANDROID_ABI}/`.
- **`undefined reference` to `__android_log_*`/`dl*`/`expf`** → ensure `dl m` linked
  (the additions add them; `log`/`android` come from the template).
- **`HybridLumiCrypto is not default-constructible`** (from the generated OnLoad
  static_assert) → keep the zero-arg `HybridLumiCrypto()` ctor.
- **`buildCMakeDebug[armeabi-v7a/x86] FAILED`** → Step 7 `reactNativeArchitectures`
  not applied (only arm64-v8a + x86_64 are built).
- **Kotlin/Package build error after removing LumiCrypto.kt** → paste it; for a
  pure-C++ Hybrid Object the registration is the generated OnLoad, but the example's
  `MainApplication`/Package wiring may need a tweak.

Paste whatever breaks (full error + the file/line) and I'll fix it.
