# Step 4a (Option 3) runbook — Expo local module, on-device gates (run on your Pixel)

`modules/lumi-vault/` is now a **real Expo local module** (ADR 0004 (a)). It hosts the pure-C++
**LumiVault** Nitro Hybrid Object over the `lumi-ffi-cabi` C ABI. It applies `com.android.library`
and `expo-module-gradle-plugin` (NOT `com.facebook.react`), so it is **Gate-C-clean by
construction**. Built in the sandbox? No: the sandbox has no device and no full build. This is the
scaffold for your Pixel.

Iterate with me on errors. The module **supersedes** the `spikes/rn-nitro-app/` config-plugin kit.
Do NOT add `withLumiVault` to `app.json`; the Expo autolinking picks the module up instead.

> **Since 2026-10-10 Android builds leave this module out.** Before Step 2, remove `"lumi-vault"`
> from `expo.autolinking.exclude` in `package.json` and set `M1_VAULT_SKELETON_ENABLED` to `true`
> in `src/lib/featureFlags.ts`. Keep both changes out of a pilot build (`docs/STATUS.md`,
> `docs/pilot-release.md`).

## Verified and unproven points

- VERIFIED (in the sandbox): the Rust lib cross-compiles for arm64 (bundled SQLite through the
  NDK). Nitrogen generates the spec and the autolinking. The Expo plugin does not run RN-core
  codegen (Gate-C-clean).
- UNPROVEN, Gate A: does the startup init of the module fire the Nitro registration before the
  smoke runs? Verify this first, on the device. There is no published precedent for Nitro in an
  Expo module. This is the one bespoke piece (see "If GATE A is still empty" below).

## Step 0 — env + device

```bash
export ANDROID_HOME=/var/home/anna/Android/Sdk
export ANDROID_NDK_HOME=/var/home/anna/Android/Sdk/ndk/27.1.12297006
export PATH="$ANDROID_HOME/platform-tools:$PATH"
adb devices            # ✓ your Pixel listed as "<serial>   device"
```

## Step 1 — build the Rust static library into the module's `cpp/` (idempotent; survives prebuild)

```bash
bash /var/home/anna/Lumi/spikes/rn-nitro-app/scripts/build-lumi-rust-android.sh \
     /var/home/anna/Lumi/modules/lumi-vault/cpp
ls /var/home/anna/Lumi/modules/lumi-vault/cpp/rust-libs/arm64-v8a/liblumi_ffi_cabi.a \
   /var/home/anna/Lumi/modules/lumi-vault/cpp/lumi_ffi_cabi.h   # ✓ both exist
```

## Step 2 — (re)generate Nitrogen + prebuild (Expo autolinking picks up the module)

```bash
cd /var/home/anna/Lumi
npm install react-native-nitro-modules@0.35.9      # if not already installed
( cd modules/lumi-vault && npx nitrogen )          # regenerate nitrogen/generated (idempotent)
npx expo prebuild --platform android --clean       # Expo autolinking adds modules/lumi-vault to settings.gradle
# ✓ check the module got autolinked:
grep -i "lumi-vault\|lumivault" android/settings.gradle android/app/build/generated/autolinking/*/*.json 2>/dev/null | head
```

## Step 3 — make the smoke the entry, then build + install + run on the Pixel

```bash
cd /var/home/anna/Lumi
cat > smoke-entry.js <<'EOF'
import { registerRootComponent } from 'expo';
import SmokeApp from './modules/lumi-vault/src/smoke';
registerRootComponent(SmokeApp);
EOF
cp package.json package.json.bak
npm pkg set main=smoke-entry.js
npx expo run:android --device    # builds modules/lumi-vault/android -> liblumivault.so, installs, Metro
# ✓ the app starts and shows a LUMI_SLICE_SMOKE line
```

## Step 4 — Gates A + B (second terminal)

```bash
adb logcat -c
adb logcat | grep --line-buffered -iE "HybridObjectRegistry|lumivaultOnLoad|LUMI_SLICE_SMOKE"
```

- ✓ GATE A: `Nitro.HybridObjectRegistry: Successfully registered HybridObject "LumiVault"`. The log
  also shows `lumivaultOnLoad: Successfully loaded lumivault C++ library!`.
- ✓ GATE B: `LUMI_SLICE_SMOKE {"pass":true,"roundtrip":true,"destroyed":true,"afterShred":true}`.

## Step 5 — Gate C (release dex)

```bash
cd /var/home/anna/Lumi/android
./gradlew assembleRelease 2>&1 | tee /tmp/lumi-assembleRelease.log
grep -i "defined multiple times" /tmp/lumi-assembleRelease.log     # ✓ MUST be empty (no com.facebook.fbreact.specs collision)
grep -iE ":app:mergeDexRelease|BUILD SUCCESSFUL" /tmp/lumi-assembleRelease.log
```

The dex-merge runs before the signing step. If the build fails only later, at the signing step,
Gate C still passed.

## If GATE A is still empty (`registered HybridObjects: []`)

The lib did not load before the smoke. The module already calls
`lumivaultOnLoad.initializeNative()` from a companion `init` (class-load) and from `OnCreate`. If
that is too late, force it earlier. Pick one option:

- **(a) MainApplication hook:** in `android/app/src/main/java/com/annazez/lumi/MainApplication.kt`,
  call `System.loadLibrary("lumivault")` in `onCreate()` after `super.onCreate()`. The effect is
  the same as `com.margelo.nitro.lumivault.lumivaultOnLoad.initializeNative()`: load ->
  `JNI_OnLoad` -> register. The direct call is not possible, because `lumivaultOnLoad` is
  `internal` to the lumi-vault module. `prebuild --clean` removes this edit. If this is the fix, we
  capture it as a `withMainApplication` config plugin afterward.
- **(b) JS touch:** make the wrapper call `requireNativeModule('LumiVault')` before
  `NitroModules.createHybridObject`. This forces the Expo module to instantiate.

Paste me the logcat and the fix you tried, and I fold it in.

## Restore after the gates

```bash
cd /var/home/anna/Lumi
npm pkg set main=expo-router/entry
rm -f smoke-entry.js package.json.bak
```

## Report back

Report the Gate A, B and C results and all build or logcat errors (full text, file and line). Then
step 4b follows: repoint the real check-in screen and run the full e2e.
