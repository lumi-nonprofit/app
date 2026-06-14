# Step 4a runbook — app-integrated Nitro module + on-device smoke (run on your Pixel)

**Why this is a runbook, not a finished result:** step 4a's gate is fundamentally *on-device*
(HybridObject registration + a smoke round-trip on a real Pixel) plus a full `assembleRelease`.
The sandbox where this kit was built has **no device/emulator attached** and does not run the
full Android app build, so — exactly like spike #1b — I built the kit and you run the gates on
your Fedora 44 + Pixel 8a. This is a debugging loop: run a step, paste me the error, I fix, repeat.

## Verified in-sandbox already (so you don't re-discover these)
- **Rust→Android cross-compile PASS:** `cargo ndk -t arm64-v8a build --release -p lumi-ffi-cabi`
  compiles clean — **lumi-store's bundled SQLite cross-compiles via the NDK** (the open risk). The
  arm64 `liblumi_ffi_cabi.a` (~27 MB, incl. SQLite) builds in ~24 s.
- **Nitro spec PASS:** Nitrogen 0.35.9 generates `HybridLumiVaultSpec`, `lumivault+autolinking.cmake`,
  `lumivaultOnLoad.{cpp,hpp,kt}` from `nitro/LumiVault.nitro.ts`. CMake target = `lumivault`;
  namespace `margelo::nitro::lumivault`; OnLoad auto-registers `HybridLumiVault` (needs the default ctor).

## The three gates (what you're proving)
- **A. Registration** — logcat shows `Nitro.HybridObjectRegistry: Successfully registered HybridObject "LumiVault"`.
- **B. Smoke** — `LUMI_SLICE_SMOKE {"pass":true,"roundtrip":true,"destroyed":true,"afterShred":true}` on device + screen.
- **C. Release dex** — `./gradlew assembleRelease` reaches dex-merge **without** the `com.facebook.fbreact.specs`
  duplicate-class collision. This is the first empirical test of ADR 0004's claim that **app-integration
  dissolves the dex issue by construction** (no library module → `com.facebook.react` applied once → no
  second codegen pass). Report whether the prediction held.

## Step 0 — toolbox (already present on your machine)
Temurin JDK 21, Android SDK + **NDK 27.1.12297006**, cargo-ndk 4.1.2, cbindgen 0.29.4, Node 24,
rust targets aarch64/x86_64-linux-android. (NDK is 27, not r28+, so the 16 KB linker flag is set in
the CMake additions rather than relying on r28's default.) `export ANDROID_NDK_HOME=~/Android/Sdk/ndk/27.1.12297006`.

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

## Step 3 — run Nitrogen (from the module dir, where nitro.json lives)
```bash
cd modules/lumi-vault && npx nitrogen && cd -
```
Generates `modules/lumi-vault/nitrogen/generated/...` incl. `shared/c++/HybridLumiVaultSpec.hpp` and
`android/lumivault+autolinking.cmake` + `lumivaultOnLoad.*`.

## Step 4 — build the Rust staticlib into the module cpp/
```bash
bash "$SPIKE/scripts/build-lumi-rust-android.sh" "$PWD/modules/lumi-vault/cpp"
# -> modules/lumi-vault/cpp/rust-libs/{arm64-v8a,x86_64}/liblumi_ffi_cabi.a + lumi_ffi_cabi.h
```

## Step 5 — CMake + the config plugin
- In the module's `android/CMakeLists.txt` (the Nitro module scaffold's; it does `project(lumivault)`,
  `add_library(lumivault SHARED ...)`, `include(.../lumivault+autolinking.cmake)`), append the three
  blocks + the 16 KB flag from `$SPIKE/cpp/CMakeLists.additions.cmake` **after** the `include(...)`.
- Add the config plugin to `app.json` `plugins`: `"./spikes/rn-nitro-app/plugins/withLumiVault"`
  (it sets `reactNativeArchitectures=arm64-v8a,x86_64`, `newArchEnabled=true`, and re-runs the Rust
  build at prebuild). *Best-effort — iterate on prebuild errors.*

## Step 6 — wire the smoke as the TEMPORARY entry (NOT the real screen)
```bash
cp "$SPIKE/ts/smoke.tsx" modules/lumi-vault/src/smoke.tsx
```
Temporarily render `SmokeApp` from `modules/lumi-vault/src/smoke` as the app root (e.g. a throwaway
`app/index.tsx` that re-exports it), so launch runs the smoke. Revert after the gate. **Do NOT touch
the real check-in feature — that's step 4b.**

## Step 7 — prebuild + run on the Pixel (Gates A & B)
```bash
npx expo prebuild --platform android --clean      # generates android/ via the config plugin
npx react-native run-android                       # Pixel via USB (adb devices), New Arch
adb logcat -c && adb logcat | grep -iE "Successfully registered HybridObject|LUMI_SLICE_SMOKE"
```
**Gate A:** `Successfully registered HybridObject "LumiVault"`.  **Gate B:** `LUMI_SLICE_SMOKE {"pass":true,...}`.

## Step 8 — release dex check (Gate C)
```bash
# example/android/app/build.gradle: buildTypes { release { signingConfig signingConfigs.debug } }
cd android && ./gradlew assembleRelease
```
**Gate C:** it reaches/passes `:app:mergeDexRelease` **without** the `com.facebook.fbreact.specs` /
`viewmanagers` "defined multiple times" error. (Predicted to pass by construction — confirm + report.)

## If the config plugin fights prebuild — fall back (don't thrash)
Per the task: run `npx expo prebuild --platform android` once, then work in the generated `android/`
dir directly (bare workflow, still app-integrated): place the module's native files, append the CMake
additions, run the Rust build + nitrogen, and `./gradlew`. Note that you did this; we keep iterating.

## Report back
The three gate results (A registration, B smoke, C release-dex) + any errors (full text + file/line) —
I'll fix and we iterate, then move to step 4b (repoint the real check-in screen + full e2e).
