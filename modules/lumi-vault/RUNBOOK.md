# Step 4a (Option 3) runbook — Expo local module, on-device gates (run on your Pixel)

`modules/lumi-vault/` is now a **real Expo local module** (ADR 0004 (a)) hosting the pure-C++
**LumiVault** Nitro Hybrid Object over the `lumi-ffi-cabi` C ABI. It applies `com.android.library` +
`expo-module-gradle-plugin` (NOT `com.facebook.react`), so it is **Gate-C-clean by construction**.
Built in-sandbox? No — no device/full build here; this is the scaffold for your Pixel. Iterate with
me on errors. **Supersedes** the `spikes/rn-nitro-app/` config-plugin kit (do NOT add
`withLumiVault` to `app.json` — the Expo module autolinks instead).

> **Since 2026-10-10 Android builds leave this module out.** Before Step 2, remove `"lumi-vault"`
> from `expo.autolinking.exclude` in `package.json` and set `M1_VAULT_SKELETON_ENABLED` to `true`
> in `src/lib/featureFlags.ts`. Keep both changes out of a pilot build (`docs/STATUS.md`,
> `docs/pilot-release.md`).

## What's verified vs unproven
- VERIFIED (in-sandbox): the Rust lib cross-compiles for arm64 (bundled SQLite via NDK); Nitrogen
  generates the spec/autolinking; the Expo plugin doesn't run RN-core codegen (Gate-C-clean).
- UNPROVEN (verify first on device, Gate A): that the module's startup init fires the Nitro
  registration before the smoke runs. There is no published Nitro-in-Expo-module precedent — this is
  the one bespoke piece (see "If Gate A is still empty" below).

## Step 0 — env + device
```bash
export ANDROID_HOME=/var/home/anna/Android/Sdk
export ANDROID_NDK_HOME=/var/home/anna/Android/Sdk/ndk/27.1.12297006
export PATH="$ANDROID_HOME/platform-tools:$PATH"
adb devices            # ✓ your Pixel listed as "<serial>   device"
```

## Step 1 — build the Rust staticlib into the module's cpp/ (idempotent; survives prebuild)
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
npx expo prebuild --platform android --clean       # autolinks modules/lumi-vault into settings.gradle
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
# ✓ app launches showing a LUMI_SLICE_SMOKE line
```

## Step 4 — Gates A + B (second terminal)
```bash
adb logcat -c
adb logcat | grep --line-buffered -iE "HybridObjectRegistry|lumivaultOnLoad|LUMI_SLICE_SMOKE"
```
- ✓ GATE A: `Nitro.HybridObjectRegistry: Successfully registered HybridObject "LumiVault"`
  (you should also see `lumivaultOnLoad: Successfully loaded lumivault C++ library!`).
- ✓ GATE B: `LUMI_SLICE_SMOKE {"pass":true,"roundtrip":true,"destroyed":true,"afterShred":true}`.

## Step 5 — Gate C (release dex)
```bash
cd /var/home/anna/Lumi/android
./gradlew assembleRelease 2>&1 | tee /tmp/lumi-assembleRelease.log
grep -i "defined multiple times" /tmp/lumi-assembleRelease.log     # ✓ MUST be empty (no com.facebook.fbreact.specs collision)
grep -iE ":app:mergeDexRelease|BUILD SUCCESSFUL" /tmp/lumi-assembleRelease.log
```
(Dex-merge runs before signing, so if it only fails later at signing, Gate C still passed.)

## If GATE A is still empty (`registered HybridObjects: []`)
The lib didn't load before the smoke. The module already calls `lumivaultOnLoad.initializeNative()`
from both a companion `init` (class-load) and `OnCreate`. If that's too late, force it earlier — pick one:
- **(a) MainApplication hook:** in `android/app/src/main/java/com/annazez/lumi/MainApplication.kt`,
  add `com.margelo.nitro.lumivault.lumivaultOnLoad.initializeNative()` in `onCreate()` after
  `super.onCreate()` — BUT `lumivaultOnLoad` is `internal` to the lumi-vault module, so instead call
  `System.loadLibrary("lumivault")` directly (same effect: load -> JNI_OnLoad -> register). (This
  edit is wiped by `prebuild --clean`; if it's the fix, we capture it as a `withMainApplication`
  config-plugin afterward.)
- **(b) JS touch:** make the wrapper `requireNativeModule('LumiVault')` (forces the Expo module to
  instantiate) before `NitroModules.createHybridObject`.
Paste me the logcat + which fix you tried and I'll fold it in.

## Restore after the gates
```bash
cd /var/home/anna/Lumi
npm pkg set main=expo-router/entry
rm -f smoke-entry.js package.json.bak
```

## Report back
Gate A / B / C results + any build or logcat errors (full text + file/line). Then step 4b = repoint
the real check-in screen + full e2e.
