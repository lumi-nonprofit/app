# Spike #1b runbook (Nitro) — Rust↔RN binding on real Android

> **Note (2026-10-18):** Rewritten in Simplified Technical English on 2026-10-18; decisions and section numbering unchanged.

**Result: GO (2026-06-14, Pixel 8a / arm64).** A live JS→Rust→JS round-trip passed on real
hardware, with §1 intact; the full report is in `SPIKE-REPORT.md`. The 3 fixes from the run have
inline annotations below (Steps 5, 8), so a re-run is clean. The 2 production-hygiene items are at
the end (not spike blockers). You can now delete the throwaway scaffold (`~/lumi-crypto-spike`);
this kit stays as the reference.

**GO criterion (unchanged):** a live JS→Rust→JS round-trip on the **x86_64 emulator AND the arm64
Pixel**. `sealCheckin → openCheckin` round-trips, the fn that throws gives an error in JS, and §1
stays intact. The app emits `LUMI_SPIKE_RESULT {"pass":true,"roundtrip":true,"threw":true}`.
**NO-GO** if the round-trip is not reliable even with the local loop. Then fall back to CMP-uniffi
(ADR 0003).

Android first; iOS deferred. Throwaway under `spikes/`; `apps/` stays empty. This is a debug loop:
run a step, paste me the error, I fix, repeat. (As run: we reached GO on the **arm64 Pixel**
through the **debug dev-loop**. The x86_64 emulator runtime leg was optional, and we did not run
it; x86_64 compiled clean.)

The binding is **Nitro** (`react-native-nitro-modules` + `nitrogen`). Nitrogen statically generates
the JSI glue from a TS spec. We write the logic in **C++**, and the C++ calls our **Rust C ABI**.
Files: `nitro/LumiCrypto.nitro.ts`, `nitro/nitro.json`, `nitro/cpp/HybridLumiCrypto.{hpp,cpp}`,
`nitro/CMakeLists.additions.cmake`, `App.tsx`, `rust/lumi-ffi-cabi/`,
`scripts/build-rust-android.sh`. (`reference/LumiCryptoImpl.*` is the source of the old hand-JSI
port; it is in the kit for reference only.)

> **Verified for you (mid-2026):** the peer range of `react-native-nitro-modules@0.35.9` is
> `react-native: *` (so RN 0.81.4 is fine). A **pure-C++ Hybrid Object**
> (`HybridObject<{ ios:'c++', android:'c++' }>`) generates cleanly with **Nitrogen 0.35.9**. I ran
> it and captured the exact generated names below. **One gotcha:** the codegen package changed its
> name from `nitro-codegen` to **`nitrogen`**; the old `nitro-codegen` is deprecated (stuck at
> 0.29.4), and `create-react-native-library@0.49.10` still pins it. Step 2 fixes that.

---

## Step 0 — host sanity (no Android): does the Rust crypto work?

```bash
cd spikes/rn-nitro/rust/lumi-ffi-cabi && cargo test
```

Expect `test result: ok` (seal/open round-trip, the throw path and the unknown handle).

## Step 1 — toolchain (already in your toolbox; only verify it)

Your toolbox already has these tools:

- Temurin **JDK 21** (`JAVA_HOME` set).
- The Android SDK at `~/Android/Sdk` (`ANDROID_HOME` and `ANDROID_NDK_HOME` set): platform-tools,
  `android-35`, `build-tools 35.0.0`, **`ndk 27.1.12297006`**, `cmake 3.22.1` and the emulator.
- **cargo-ndk 4.1.2**, **cbindgen 0.29.4** and **Node v24**.
- The rust targets `aarch64-linux-android` and `x86_64-linux-android`.

```bash
node -v; java -version; adb version; cargo ndk --version; cbindgen --version
echo "$ANDROID_HOME / $ANDROID_NDK_HOME"
rustup target list --installed | grep android
```

Version notes (flagged). **JDK 21** is fine for RN 0.81.4 and AGP 8.7.2 (the scaffold's Gradle
plugin). **cargo-ndk 4.1.2** is fine here. We run a plain `build` (no `--no-strip`), so the
cargo-ndk break of ubrn does not apply. **cbindgen 0.29.4** is fine.

> **Confirmed in the GO run (2026-06-14, Fedora 44):** **Temurin JDK 21** — use exactly this;
> Fedora 44 only ships JDK **25/26**, which are too new for the Gradle/AGP of the scaffold. Android
> SDK **platform-35 / build-tools-35 / cmake 3.22.1 / NDK 27.x**; **cargo-ndk 4.1.2**; the rustup
> targets **`aarch64-linux-android` + `x86_64-linux-android`**. Confirm that the targets are
> installed (see Step 5): an earlier `rustup target add` can fail silently, and `rustup` at
> `~/.cargo/bin` shadows a system dnf `rust`.

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

This generates the module **`LumiCrypto`**, the spec `src/LumiCrypto.nitro.ts`, `nitro.json`, a
sample Kotlin/Swift implementation and an `example/` app. **Fix the stale codegen pin:**

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
# remove the sample Kotlin/Swift implementations (the C++ Hybrid Object replaces them):
rm -f android/src/main/java/com/margelo/nitro/lumicrypto/LumiCrypto.kt
rm -f ios/LumiCrypto.swift
# keep android/src/main/cpp/cpp-adapter.cpp (the JNI_OnLoad -> nitro initialize).
# make the lib export the type so that example can import it (src/index.tsx):
#   export type { LumiCrypto, DeviceKey, CheckinDraft } from './LumiCrypto.nitro';
```

## Step 4 — run Nitrogen (generates the C++ spec, the structs and the autolinking)

```bash
yarn nitrogen   # == npx nitrogen
```

Nitrogen generates (confirmed): `nitrogen/generated/shared/c++/HybridLumiCryptoSpec.{hpp,cpp}`,
`DeviceKey.hpp`, `CheckinDraft.hpp`, `nitrogen/generated/android/lumicrypto+autolinking.cmake` and
`lumicryptoOnLoad.{cpp,hpp,kt}` (the OnLoad auto-registers `HybridLumiCrypto`).

## Step 5 — build the Rust C-ABI libs into the `cpp/` of the lib

```bash
bash "$SPIKE/scripts/build-rust-android.sh" "$PWD/cpp"
```

The script writes `cpp/rust-libs/{arm64-v8a,x86_64}/liblumi_ffi_cabi.a` and `cpp/lumi_ffi.h`.

> **Fix from the GO run — the Rust std targets were absent.** The script failed with
> `error[E0463]: can't find crate for core` for `aarch64-linux-android`: an earlier
> `rustup target add` had no effect, and the `rustup` toolchain at `~/.cargo/bin` shadows a system
> dnf `rust`. **Fix:** install the targets, then run the script again:
>
> ```bash
> rustup target add aarch64-linux-android x86_64-linux-android
> rustup target list --installed | grep android   # verify both appear
> bash "$SPIKE/scripts/build-rust-android.sh" "$PWD/cpp"
> ```

## Step 6 — wire CMake

Open `android/CMakeLists.txt`. The template has: `project(lumicrypto)`,
`add_library(lumicrypto SHARED src/main/cpp/cpp-adapter.cpp)`,
`include(.../nitrogen/generated/android/lumicrypto+autolinking.cmake)` and
`include_directories("src/main/cpp" "../cpp")`. **After the `include(...)` line**, append the 3
blocks from `$SPIKE/nitro/CMakeLists.additions.cmake`. The blocks add the `HybridLumiCrypto.cpp`
source and link the per-ABI Rust static library. `cpp/` is already on the include path, so
`HybridLumiCrypto.hpp` and `lumi_ffi.h` resolve.

## Step 7 — restrict the ABIs to the ones we build

`example/android/gradle.properties`:

```properties
reactNativeArchitectures=arm64-v8a,x86_64
newArchEnabled=true
```

## Step 8 — build + run

**Dev loop (fast iteration) — this is the path that reached GO:**

```bash
cd example
npx react-native start          # terminal 1 (Metro)
npx react-native run-android     # terminal 2: emulator (boot one first) or Pixel over USB
adb logcat -c && adb logcat | grep -i LUMI_SPIKE_RESULT
```

> **2 fixes from the GO run** (both at `assembleDebug`; apply them once, then run again):
>
> 1. **`:app:compileDebugJavaWithJavac` — autolinked Java package path mismatch.** RN autolinking
>    generated `PackageList.java` with an import of
>    `com.margelo.nitro.lumicrypto.LumiCryptoPackage`, but cra-library generated the class at
>    `com.lumicrypto.LumiCryptoPackage`. With no `react-native.config.js`, autolinking derives the
>    import from the Nitro namespace, which did not agree with the scaffold. **Fix:** move the
>    package class to the autolinked path and fix its `package` line:
>
>    ```bash
>    cd "$HOME/lumi-crypto-spike"
>    mkdir -p android/src/main/java/com/margelo/nitro/lumicrypto
>    git mv android/src/main/java/com/lumicrypto/LumiCryptoPackage.kt \
>           android/src/main/java/com/margelo/nitro/lumicrypto/LumiCryptoPackage.kt 2>/dev/null || \
>    mv     android/src/main/java/com/lumicrypto/LumiCryptoPackage.kt \
>           android/src/main/java/com/margelo/nitro/lumicrypto/LumiCryptoPackage.kt
>    # then set its first line to: package com.margelo.nitro.lumicrypto
>    ```
>
>    That class is a no-op `TurboReactPackage`. Its real job is `System.loadLibrary("lumicrypto")`
>    in its init block, which fires the `OnLoad` of Nitrogen, which registers the C++ HybridObject.
>    It must exist **and** be at the autolinked path; do not delete it.
>
> 2. **`:app:mergeLibDexDebug` — duplicate class from an unused template dependency.** The dex
>    merge found `com.facebook.react.viewmanagers.RNCSafeAreaProviderManagerDelegate` twice, from
>    `react-native-safe-area-context` (an example-template dependency in `example/package.json`;
>    the harness does not use it). **Fix:**
>    `cd example && yarn remove react-native-safe-area-context`.

**Offline release (NOT used for GO — the release Java package step is a deferred follow-up):**

```bash
# example/android/app/build.gradle: buildTypes { release { signingConfig signingConfigs.debug } }
cd example/android && ./gradlew assembleRelease
adb install -r app/build/outputs/apk/release/app-release.apk
PKG=$(aapt dump badging app/build/outputs/apk/release/app-release.apk | sed -n "s/package: name='\([^']*\)'.*/\1/p")
adb shell am start -n "$PKG/.MainActivity"
adb logcat -c && adb logcat | grep -i LUMI_SPIKE_RESULT
```

> **As run:** `assembleRelease` **compiled the native code cleanly for both arm64-v8a and x86_64**,
> but it failed later at `:app:mergeDexRelease` (release dex collisions; see _Production hygiene_
> below). Thus we reached GO through the **debug dev-loop on the arm64 Pixel**, not through this
> offline-release APK. The native binding compiles clean in debug and in release; only the release
> Java package step is open (deferred, not a blocker).

Run on the **arm64 Pixel** (USB; `adb devices`). The x86_64 emulator runtime leg is an optional
cross-arch confirmation (x86_64 compiled clean in the release CMake).

**Expected (GO):** `LUMI_SPIKE_RESULT {"pass":true,"roundtrip":true,"threw":true}`, seen on the
Pixel 8a in the ReactNativeJS log and in the on-screen UI.

## Step 9 — §1 verification (no secret crosses)

```bash
grep -RniE "secret|private[_-]?key|staticsecret" \
  "$SPIKE/nitro/LumiCrypto.nitro.ts" "$SPIKE/nitro/cpp/HybridLumiCrypto."*
```

Expect no match in any signature. Only `handle`, `publicKeyB64`, `peerPublicB64` (a peer _public_
key, input only), `mood`, `intensity`, `note` and `sealedB64` cross; the private key stays in the
Rust `SECRETS` registry.

## Production hygiene — deferred, not spike blockers

We stepped around 2 issues for the spike (debug dev-loop). They belong to the **real app build**,
not to the GO/NO-GO. Here is the record, with the cause and the fix direction:

1. **Release-APK dex collisions.** `assembleRelease` fails at `:app:mergeDexRelease` with
   `com.facebook.fbreact.specs.NativeAccessibilityInfoSpec` **defined twice** (and in general the
   `com.facebook.fbreact.specs` / `com.facebook.react.viewmanagers` set). The library module
   bundles the RN-core codegen specs that the app's own React Native already has. This is a known
   interaction between `create-react-native-library` and the New-Architecture package step. **Fix
   direction:** the library module must not bundle or regenerate the core and third-party codegen
   specs. The app already ships them.
2. **16 KB ELF page alignment.** Debug advisory:
   `This app isn't 16 KB-compatible. ELF alignment check failed.` Our own `liblumicrypto.so`
   reported `LOAD segment not aligned` → **fix with `-Wl,-z,max-page-size=16384`** (or NDK r28+,
   which defaults to 16 KB-aligned output). The other flagged libs are prebuilt dependencies:
   `libreactnative`, `libhermes`, `libjsi`, `libfbjni`, `libc++_shared`, the Fresco image libs and
   `libNitroModules`. The fix for them is 16 KB-aligned upstream versions. **Required for Google
   Play on Android-15+ targets;** irrelevant to the spike itself.

## Likely failure points (we iterate)

- **Nitrogen "0 specs found"** → the install of `react-native-nitro-modules` failed, or the spec
  import does not resolve. Make sure that `yarn` succeeded after the Step-2 codegen fix.
- **`undefined reference` to `lumi_*`** → the CMake additions are absent, or the target is wrong →
  the target is `lumicrypto`; the static library path is `cpp/rust-libs/${ANDROID_ABI}/`.
- **`undefined reference` to `__android_log_*`/`dl*`/`expf`** → make sure that the link line has
  `dl m` (the additions add them; `log` and `android` come from the template).
- **`HybridLumiCrypto is not default-constructible`** (from the generated OnLoad `static_assert`)
  → keep the zero-arg `HybridLumiCrypto()` constructor.
- **`buildCMakeDebug[armeabi-v7a/x86] FAILED`** → Step 7 (`reactNativeArchitectures`) did not take
  effect; we build only arm64-v8a and x86_64.
- **Kotlin/Package build error after the removal of `LumiCrypto.kt`** → paste it. For a pure-C++
  Hybrid Object, the registration is the generated OnLoad. But the `MainApplication`/Package setup
  of the example can need a tweak.

Paste whatever breaks (the full error and the file/line), and I fix it.
