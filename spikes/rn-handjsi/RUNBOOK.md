# Spike #1b runbook — hand-written RN JSI binding on real Android

**Goal / GO criterion:** a **live JS→Rust→JS round-trip on real Android** (x86_64
emulator AND your arm64 Pixel) — `sealCheckin` then `openCheckin` round-trips, the
throwing fn surfaces its error in JS — with **§1 intact** (no secret bytes cross).
**NO ubrn, NO UniFFI** — a hand-written C++/JSI TurboModule over a Rust C ABI.

**iOS is deferred** (no reliable macOS). Everything is throwaway under `spikes/`;
`apps/` stays empty. **This is a debugging loop: run a step, paste me the error, I fix,
repeat.** If it genuinely can't be tamed, that's the NO-GO signal → fall back to
CMP-uniffi (I'll say so honestly).

Files referenced live in `spikes/rn-handjsi/`:
`rust/lumi-ffi-cabi/` (the C ABI), `turbo-module/` (spec, C++ impl, App, CMake),
`scripts/build-rust-android.sh`.

---

## Step 0 — Host sanity (no Android needed): does the Rust crypto work?

```bash
cd spikes/rn-handjsi/rust/lumi-ffi-cabi
cargo test          # runs the C-ABI host round-trip + throwing-path test
```
Expect `test result: ok`. If this fails, paste it — it's a pure-Rust bug, fastest to fix.

---

## Step 1 — Toolchain (Fedora + toolbox)

Do the SDK/NDK + builds in a toolbox; use your Pixel over adb; emulator via Android
Studio (Flatpak) or the command line (you have `/dev/kvm`).

```bash
toolbox create lumi-android && toolbox enter lumi-android
# inside the toolbox:
sudo dnf install -y nodejs npm java-17-openjdk-devel unzip which android-tools  # android-tools = adb
# Rust + mobile bits
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y
. "$HOME/.cargo/env"
rustup target add aarch64-linux-android x86_64-linux-android
cargo install cargo-ndk cbindgen
```

Android SDK + NDK (command-line tools; or point at Android Studio's SDK):
```bash
export ANDROID_HOME="$HOME/Android/Sdk"
mkdir -p "$ANDROID_HOME/cmdline-tools"
# download "command line tools" from developer.android.com, unzip to $ANDROID_HOME/cmdline-tools/latest
yes | "$ANDROID_HOME/cmdline-tools/latest/bin/sdkmanager" --licenses
"$ANDROID_HOME/cmdline-tools/latest/bin/sdkmanager" \
  "platform-tools" "platforms;android-35" "build-tools;35.0.0" \
  "ndk;27.1.12297006" "cmake;3.22.1" \
  "system-images;android-35;google_apis;x86_64"   # for the emulator
export ANDROID_NDK_HOME="$ANDROID_HOME/ndk/27.1.12297006"
export PATH="$ANDROID_HOME/platform-tools:$PATH"
```
> Put the `export` lines in `~/.bashrc` inside the toolbox so every shell has them.
> If you prefer Android Studio (Flatpak) for the SDK/NDK/emulator, set `ANDROID_HOME`
> to its SDK path (often `~/Android/Sdk`) and skip the sdkmanager installs.

Sanity: `node -v` (≥20), `java -version` (17), `adb version`, `cargo ndk --version`,
`cbindgen --version`, `echo $ANDROID_NDK_HOME`.

---

## Step 2 — Scaffold the throwaway RN New-Arch C++ turbo-module + example app

```bash
cd "$HOME"   # anywhere OUTSIDE the Lumi repo — this scaffold is throwaway
npm_config_yes=true npx create-react-native-library@0.49.10 lumi-crypto-spike \
  --react-native-version 0.81.4 \
  --slug react-native-lumi-crypto \
  --description "spike1b" --author-name you --author-email you@example.com \
  --author-url https://example.com \
  --repo-url https://github.com/lumi-nonprofit/app \
  --languages cpp --type turbo-module --example vanilla
cd lumi-crypto-spike && yarn
```
This generates a C++ TurboModule (New Arch) with a sample `multiply` method, a spec
`src/NativeLumiCrypto.ts` (module name `LumiCrypto`), a C++ class, and an `example/`
app. **Note the exact generated names** (spec file, C++ class, the codegen base class
`NativeLumiCryptoCxxSpec`, and the `add_library()` target in `android/CMakeLists.txt`).
The provided files assume the slug above yields module `LumiCrypto` /
`NativeLumiCryptoCxxSpec`; if your version differs, align the names (tell me what it
generated and I'll match).

---

## Step 3 — Drop in the spike files

Let `SPIKE=<abs path>/Lumi/spikes/rn-handjsi`. From the scaffold root:
```bash
# 1) Rust crate -> into the library so the build script's relative paths work
mkdir -p rust && cp -R "$SPIKE/rust/lumi-ffi-cabi" rust/

# 2) TS spec (overwrite the generated one; keep its filename)
cp "$SPIKE/turbo-module/NativeLumiCrypto.ts" src/NativeLumiCrypto.ts

# 3) C++ impl: replace the generated cpp class body with ours (multiply -> our 3 methods).
#    Open the generated cpp/*.h and cpp/*.cpp and the provided LumiCryptoImpl.{h,cpp};
#    copy the 3 method decls/bodies + base64 helpers in, drop `multiply`. Keep the
#    constructor + the codegen base class the scaffold generated.
cp "$SPIKE/turbo-module/cpp/LumiCryptoImpl.h"   cpp/
cp "$SPIKE/turbo-module/cpp/LumiCryptoImpl.cpp" cpp/

# 4) export the right name from the lib (src/index.tsx should export LumiCrypto)
#    Make sure src/index re-exports: export { default } from './NativeLumiCrypto';

# 5) round-trip app
cp "$SPIKE/turbo-module/App.tsx" example/src/App.tsx
cp "$SPIKE/turbo-module/NativeLumiCrypto.ts" example/src/NativeLumiCrypto.ts  # or import from the lib pkg
```
Wire the CMake link: open `android/CMakeLists.txt`, find the `add_library(<target> ...)`
the scaffold defines, and append the lines from `$SPIKE/turbo-module/CMakeLists.additions.cmake`
(replace `<MODULE_TARGET>` with that target name). Make `LUMI_FFI_DIR` / `LUMI_RUST_LIBS`
point at where you placed `cpp/` and `cpp/rust-libs/`.

---

## Step 4 — Build the Rust C-ABI libs (per ABI) + header

```bash
# from the scaffold root, with ANDROID_NDK_HOME set:
bash "$SPIKE/scripts/build-rust-android.sh"
# but point its CRATE/DEST at the copy you placed under ./rust — simplest: run it from
# inside ./rust/lumi-ffi-cabi after copying the script, or edit the HERE/CRATE paths.
```
This produces `cpp/rust-libs/arm64-v8a/liblumi_ffi_cabi.a`,
`cpp/rust-libs/x86_64/liblumi_ffi_cabi.a`, and `cpp/lumi_ffi.h`.

---

## Step 5 — Restrict ABIs to what we built

In `example/android/gradle.properties` add:
```
reactNativeArchitectures=arm64-v8a,x86_64
```
(Prevents gradle building armeabi-v7a/x86, for which we have no Rust lib — this is the
multi-ABI mismatch that bit the ubrn spike.)

---

## Step 6 — Run it

**Fast dev loop (for iterating on errors):**
```bash
cd example
npx react-native start            # terminal 1 (Metro)
npx react-native run-android      # terminal 2: emulator (start one first) or Pixel via USB
adb logcat -c && adb logcat | grep -i LUMI_SPIKE_RESULT
```
Start an emulator first: `"$ANDROID_HOME/emulator/emulator" -avd <name>` (create one in
Android Studio or `avdmanager`). For the Pixel: enable USB debugging, `adb devices`
shows it, `run-android` installs to it.

**Offline release (the GO proof — no Metro):**
```bash
# in example/android/app/build.gradle add (DEV-ONLY signing):
#   buildTypes { release { signingConfig signingConfigs.debug } }
cd example/android && ./gradlew assembleRelease
adb install -r app/build/outputs/apk/release/app-release.apk
PKG=$(aapt dump badging app/build/outputs/apk/release/app-release.apk | sed -n "s/package: name='\([^']*\)'.*/\1/p")
adb shell am start -n "$PKG/.MainActivity"
adb logcat -c && adb logcat | grep -i LUMI_SPIKE_RESULT
```

**Expected (GO):** `LUMI_SPIKE_RESULT {"pass":true,"roundtrip":true,"threw":true}`
and the app shows that line. Run it on BOTH the x86_64 emulator and the arm64 Pixel.

---

## Step 7 — §1 verification (no secret crosses)

```bash
grep -RniE "secret|private[_-]?key|staticsecret" \
  "$SPIKE/turbo-module/NativeLumiCrypto.ts" "$SPIKE/turbo-module/cpp/LumiCryptoImpl."*
```
Expect **nothing in any signature** — the only data crossing is `handle`,
`publicKeyB64`, `mood`, `intensity`, `note`, `sealedB64`. The private key stays in the
Rust `SECRETS` registry behind the handle.

---

## Likely failure points (and the fixes we'll iterate)

- **Codegen base-class / method-name mismatch** → align `LumiCryptoImpl.h/.cpp` to the
  exact generated `Native…CxxSpec` name (paste me the generated header).
- **`undefined reference` to `lumi_*`** → CMake isn't linking the staticlib; check the
  `<MODULE_TARGET>` name + the `rust-libs/${ANDROID_ABI}/` path.
- **`undefined reference` to `__android_log_*` / `dl*` / `expf`** → add `log dl m` to
  `target_link_libraries` (already in the snippet).
- **`buildCMakeDebug[armeabi-v7a/x86] FAILED`** → the `reactNativeArchitectures` line
  (Step 5) wasn't applied; only arm64-v8a + x86_64 are built.
- **`lumi_ffi.h` not found** → `target_include_directories(... ${LUMI_FFI_DIR})` path.
- **New Arch not on** → RN 0.81 defaults to New Arch; confirm
  `newArchEnabled=true` in `example/android/gradle.properties`.
- **App red screen / can't connect to Metro** → use the offline release APK path.

Paste whatever breaks (full error + the file it points at) and I'll fix it.
