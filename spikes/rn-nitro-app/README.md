# Step 4a kit — app-integrated Nitro module + on-device smoke (guided Pixel run)

The production app-integration of the **LumiVault** Nitro Hybrid Object over the `lumi-ffi-cabi`
C ABI (ADR 0004 (a): integrate directly into the existing root app as a local Expo module — no
separate library package, so the release-dex collision dissolves by construction). This step is the
**native wiring + on-device smoke ONLY** — it does NOT repoint the real check-in screen or wire the
full e2e (that's step 4b).

**Start with `RUNBOOK.md`.** Like spike #1b, the gates are on-device, so you run it on your Pixel and
we iterate on errors.

## Layout
- `nitro/LumiVault.nitro.ts` — the Nitro spec (validated with Nitrogen 0.35.9).
- `nitro/nitro.json` — autolinking -> C++ `HybridLumiVault` (`androidCxxLibName: lumivault`).
- `cpp/HybridLumiVault.{hpp,cpp}` — the C++ impl over the C ABI; error codes -> thrown JS exceptions.
- `cpp/CMakeLists.additions.cmake` — link `liblumi_ffi_cabi.a` per ABI + the 16 KB linker flag (NDK 27).
- `ts/LumiVault.ts` — typed wrapper; double-decodes the list payload.
- `ts/smoke.tsx` — the minimal JS smoke (NOT the real screen); emits `LUMI_SLICE_SMOKE`.
- `scripts/build-lumi-rust-android.sh` — cargo-ndk build of `lumi-ffi-cabi` + cbindgen header.
- `plugins/withLumiVault.js` — Expo config plugin (best-effort prebuild wiring).

## Verified in-sandbox (device-independent)
- **Cross-compile PASS:** `lumi-ffi-cabi` (incl. lumi-store's **bundled SQLite**) compiles for
  `aarch64-linux-android` via the NDK clang. The SQLite-via-NDK risk is retired.
- **Nitro spec PASS:** Nitrogen generates `HybridLumiVaultSpec` + `lumivault+autolinking.cmake` +
  `lumivaultOnLoad.*`; CMake target `lumivault`.

## The three gates (run on the Pixel — see RUNBOOK)
- **A.** logcat `Successfully registered HybridObject "LumiVault"`.
- **B.** `LUMI_SLICE_SMOKE {"pass":true,...}` (the full JS→Nitro→C++→Rust→SQLite round-trip).
- **C.** `./gradlew assembleRelease` clears `:app:mergeDexRelease` without the duplicate-class collision
  (the first empirical test of ADR 0004's dex-dissolution-by-construction).

Not committed; not the real screen; iterate on device.
