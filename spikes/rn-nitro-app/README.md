# Step 4a kit — app-integrated Nitro module + on-device smoke (guided Pixel run)

> **Note (2026-10-18):** Rewritten in Simplified Technical English on 2026-10-18; decisions and section numbering unchanged.

This kit is the production app-integration of the **LumiVault** Nitro Hybrid Object over the
`lumi-ffi-cabi` C ABI. ADR 0004 (a) says: integrate directly into the current root app as a local
Expo module, with no separate library package. Thus the release-dex collision dissolves by
construction. This step is the **native integration and the on-device smoke ONLY**. It does NOT
repoint the real check-in screen, and it does not connect the full e2e (that is step 4b).

**Start with `RUNBOOK.md`.** As in spike #1b, the gates run on the device: you run the kit on your
Pixel, and we iterate on the errors.

## Layout

- `nitro/LumiVault.nitro.ts` — the Nitro spec (validated with Nitrogen 0.35.9).
- `nitro/nitro.json` — autolinking -> C++ `HybridLumiVault` (`androidCxxLibName: lumivault`).
- `cpp/HybridLumiVault.{hpp,cpp}` — the C++ implementation over the C ABI; error codes -> thrown JS
  exceptions.
- `cpp/CMakeLists.additions.cmake` — links `liblumi_ffi_cabi.a` per ABI and adds the 16 KB linker
  flag (NDK 27).
- `ts/LumiVault.ts` — the typed wrapper; it decodes the list payload twice.
- `ts/smoke.tsx` — the minimal JS smoke (NOT the real screen); it emits `LUMI_SLICE_SMOKE`.
- `scripts/build-lumi-rust-android.sh` — the cargo-ndk build of `lumi-ffi-cabi` and the cbindgen
  header.
- `plugins/withLumiVault.js` — the Expo config plugin (best-effort prebuild integration).

## Verified in the sandbox (device-independent)

- **Cross-compile PASS:** `lumi-ffi-cabi` (with the **bundled SQLite** of lumi-store) compiles for
  `aarch64-linux-android` through the NDK clang. This closes the SQLite-through-NDK risk.
- **Nitro spec PASS:** Nitrogen generates `HybridLumiVaultSpec`, `lumivault+autolinking.cmake` and
  `lumivaultOnLoad.*`; the CMake target is `lumivault`.

## The 3 gates (run on the Pixel — see RUNBOOK)

- **A.** logcat shows `Successfully registered HybridObject "LumiVault"`.
- **B.** `LUMI_SLICE_SMOKE {"pass":true,...}` (the full JS→Nitro→C++→Rust→SQLite round-trip).
- **C.** `./gradlew assembleRelease` clears `:app:mergeDexRelease` without the duplicate-class
  collision (the first empirical test of the dex-dissolution-by-construction claim of ADR 0004).

Not committed; not the real screen; iterate on the device.
