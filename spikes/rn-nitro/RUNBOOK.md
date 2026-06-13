# Spike #1b runbook (Nitro) — Rust↔RN binding on real Android

**GO criterion (unchanged):** a live JS→Rust→JS round-trip on the **x86_64 emulator
AND the arm64 Pixel** — `sealCheckin → openCheckin` round-trips, the throwing fn errors
in JS, §1 intact — emitting `LUMI_SPIKE_RESULT {"pass":true,"roundtrip":true,"threw":true}`.
**NO-GO** if it can't be made reliable even with the local loop → fall back to
CMP-uniffi (ADR 0003). Android-first; iOS deferred. Throwaway under `spikes/`; `apps/`
stays empty. This is a debugging loop: run a step, paste me the error, I fix, repeat.

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
+ `lumicryptoOnLoad.{cpp,hpp,kt}` (the OnLoad auto-registers `HybridLumiCrypto`).

## Step 5 — build the Rust C-ABI libs into the lib's cpp/
```bash
bash "$SPIKE/scripts/build-rust-android.sh" "$PWD/cpp"
```
Writes `cpp/rust-libs/{arm64-v8a,x86_64}/liblumi_ffi_cabi.a` and `cpp/lumi_ffi.h`.

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
**Dev loop (fast iteration):**
```bash
cd example
npx react-native start          # terminal 1 (Metro)
npx react-native run-android     # terminal 2: emulator (boot one first) or Pixel via USB
adb logcat -c && adb logcat | grep -i LUMI_SPIKE_RESULT
```
**Offline release (the GO proof — no Metro):**
```bash
# example/android/app/build.gradle: buildTypes { release { signingConfig signingConfigs.debug } }
cd example/android && ./gradlew assembleRelease
adb install -r app/build/outputs/apk/release/app-release.apk
PKG=$(aapt dump badging app/build/outputs/apk/release/app-release.apk | sed -n "s/package: name='\([^']*\)'.*/\1/p")
adb shell am start -n "$PKG/.MainActivity"
adb logcat -c && adb logcat | grep -i LUMI_SPIKE_RESULT
```
Run on the **x86_64 emulator** and the **arm64 Pixel** (USB; `adb devices`).

**Expected (GO):** `LUMI_SPIKE_RESULT {"pass":true,"roundtrip":true,"threw":true}`.

## Step 9 — §1 verification (no secret crosses)
```bash
grep -RniE "secret|private[_-]?key|staticsecret" \
  "$SPIKE/nitro/LumiCrypto.nitro.ts" "$SPIKE/nitro/cpp/HybridLumiCrypto."*
```
Expect nothing in any signature — only `handle`, `publicKeyB64`, `mood`, `intensity`,
`note`, `sealedB64` cross; the private key stays in the Rust `SECRETS` registry.

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
