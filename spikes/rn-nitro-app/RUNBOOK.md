# Step 4a runbook — app-integrated Nitro module + on-device smoke (run on your Pixel)

> **Note (2026-10-18):** Rewritten in Simplified Technical English on 2026-10-18; decisions and section numbering unchanged.

**Why this is a runbook, not a finished result:** the gate of step 4a is _on-device_ by nature.
It needs the HybridObject registration and a smoke round-trip on a real Pixel, plus a full
`assembleRelease`. The sandbox that produced this kit has **no device and no emulator** and no
full Android app build.

Thus, as in spike #1b, I built the kit. You run the gates on your Fedora 44 + Pixel 8a. This is a
debug loop: run a step, paste me the error, I fix, repeat.

## Verified in the sandbox already (so you do not discover these again)

- **Rust→Android cross-compile PASS:** `cargo ndk -t arm64-v8a build --release -p lumi-ffi-cabi`
  compiles clean. **The bundled SQLite of lumi-store cross-compiles through the NDK** (the open
  risk). The arm64 `liblumi_ffi_cabi.a` (~27 MB, with SQLite) builds in ~24 s.
- **Nitro spec PASS:** Nitrogen 0.35.9 generates `HybridLumiVaultSpec`,
  `lumivault+autolinking.cmake` and `lumivaultOnLoad.{cpp,hpp,kt}` from `nitro/LumiVault.nitro.ts`.
  The CMake target is `lumivault`; the namespace is `margelo::nitro::lumivault`. The OnLoad
  auto-registers `HybridLumiVault` (it needs the default constructor).

## The 3 gates (what you prove)

- **A. Registration** — logcat shows
  `Nitro.HybridObjectRegistry: Successfully registered HybridObject "LumiVault"`.
- **B. Smoke** — `LUMI_SLICE_SMOKE {"pass":true,"roundtrip":true,"destroyed":true,"afterShred":true}`
  on the device and on the screen.
- **C. Release dex** — `./gradlew assembleRelease` reaches the dex-merge **without** the
  `com.facebook.fbreact.specs` duplicate-class collision. This is the first empirical test of the
  ADR 0004 claim: **app-integration dissolves the dex issue by construction**. (No library module →
  `com.facebook.react` applied once → no second codegen pass.) Report whether the prediction held.

## Step 0 — toolbox (already on your machine)

Your machine already has:

- Temurin JDK 21.
- The Android SDK with **`NDK 27.1.12297006`**. The NDK is 27, not r28+. Thus the CMake additions
  set the 16 KB linker flag, and we do not rely on the r28 default.
- `cargo-ndk 4.1.2`, `cbindgen 0.29.4` and Node 24.
- The rust targets `aarch64-linux-android` and `x86_64-linux-android`.

Set `export ANDROID_NDK_HOME=~/Android/Sdk/ndk/27.1.12297006`.

## Step 1 — create the local Nitro module in the root app

`SPIKE=<repo>/spikes/rn-nitro-app`. In the app root, create `modules/lumi-vault/`:

```bash
mkdir -p modules/lumi-vault/src modules/lumi-vault/cpp
cp "$SPIKE/nitro/LumiVault.nitro.ts" modules/lumi-vault/src/
cp "$SPIKE/nitro/nitro.json"         modules/lumi-vault/
cp "$SPIKE/cpp/HybridLumiVault.hpp"  modules/lumi-vault/cpp/
cp "$SPIKE/cpp/HybridLumiVault.cpp"  modules/lumi-vault/cpp/
cp "$SPIKE/ts/LumiVault.ts"          modules/lumi-vault/src/
```

## Step 2 — deps + codegen pin

```bash
npm pkg set devDependencies.nitrogen=^0.35.9
npm pkg set scripts.nitrogen="nitrogen"
npm install react-native-nitro-modules@0.35.9
```

## Step 3 — run Nitrogen (from the module dir, where `nitro.json` lives)

```bash
cd modules/lumi-vault && npx nitrogen && cd -
```

Nitrogen generates `modules/lumi-vault/nitrogen/generated/...`, with
`shared/c++/HybridLumiVaultSpec.hpp`, `android/lumivault+autolinking.cmake` and `lumivaultOnLoad.*`.

## Step 4 — build the Rust static library into the module `cpp/`

```bash
bash "$SPIKE/scripts/build-lumi-rust-android.sh" "$PWD/modules/lumi-vault/cpp"
# -> modules/lumi-vault/cpp/rust-libs/{arm64-v8a,x86_64}/liblumi_ffi_cabi.a + lumi_ffi_cabi.h
```

## Step 5 — CMake + the config plugin

- Open the `android/CMakeLists.txt` of the module (from the Nitro module scaffold). It has
  `project(lumivault)`, `add_library(lumivault SHARED ...)` and
  `include(.../lumivault+autolinking.cmake)`. Append the 3 blocks and the 16 KB flag from
  `$SPIKE/cpp/CMakeLists.additions.cmake` **after** the `include(...)`.
- Add the config plugin to the `plugins` of `app.json`:
  `"./spikes/rn-nitro-app/plugins/withLumiVault"`. It sets
  `reactNativeArchitectures=arm64-v8a,x86_64` and `newArchEnabled=true`, and it runs the Rust build
  again at prebuild. _Best effort — iterate on prebuild errors._

## Step 6 — make the smoke the TEMPORARY entry (NOT the real screen)

```bash
cp "$SPIKE/ts/smoke.tsx" modules/lumi-vault/src/smoke.tsx
```

Render `SmokeApp` from `modules/lumi-vault/src/smoke` as the app root for now, so that the launch
runs the smoke. For example, use a throwaway `app/index.tsx` that re-exports it. Revert after the
gate. **Do NOT touch the real check-in feature — that is step 4b.**

## Step 7 — prebuild + run on the Pixel (Gates A & B)

```bash
npx expo prebuild --platform android --clean      # generates android/ through the config plugin
npx react-native run-android                       # Pixel over USB (adb devices), New Arch
adb logcat -c && adb logcat | grep -iE "Successfully registered HybridObject|LUMI_SLICE_SMOKE"
```

**Gate A:** `Successfully registered HybridObject "LumiVault"`. **Gate B:**
`LUMI_SLICE_SMOKE {"pass":true,...}`.

## Step 8 — release dex check (Gate C)

```bash
# example/android/app/build.gradle: buildTypes { release { signingConfig signingConfigs.debug } }
cd android && ./gradlew assembleRelease
```

**Gate C:** the build reaches and passes `:app:mergeDexRelease` **without** the
`com.facebook.fbreact.specs` / `viewmanagers` "defined multiple times" error. (The prediction is a
pass by construction — confirm and report.)

## If the config plugin fights prebuild — fall back (do not thrash)

Per the task: run `npx expo prebuild --platform android` once. Then work directly in the generated
`android/` directory (bare workflow, still app-integrated):

1. Place the native files of the module.
2. Append the CMake additions.
3. Run the Rust build and nitrogen.
4. Run `./gradlew`.

Tell me that you did this; we continue the iteration from there.

## Report back

Report the 3 gate results (A registration, B smoke, C release-dex). Add all errors (full text, file
and line). I fix them, and we iterate. Then we move to step 4b (repoint the real check-in screen
and run the full e2e).
