#!/usr/bin/env bash
# Step 4a — build the lumi-ffi-cabi Rust staticlib (which links lumi-vault + lumi-store's bundled
# SQLite) for the Android ABIs via cargo-ndk, and copy the .a + cbindgen header into the local
# Nitro module's cpp/ dir (where HybridLumiVault.* live and CMakeLists.additions expects
# rust-libs/<ABI>/ + lumi_ffi_cabi.h).
#
# Usage:
#   export ANDROID_NDK_HOME=~/Android/Sdk/ndk/27.1.12297006
#   bash build-lumi-rust-android.sh /abs/path/to/<local-nitro-module>/cpp
#
# VERIFIED IN-SANDBOX (2026-06-14): `cargo ndk -t arm64-v8a build --release -p lumi-ffi-cabi`
# compiles cleanly — the bundled SQLite cross-compiles via the NDK clang. arm64-v8a is the Pixel
# target; x86_64 is included for the emulator (optional). cargo-ndk 4.x: plain build, no --no-strip.
set -euo pipefail

DEST="${1:?usage: build-lumi-rust-android.sh <local-nitro-module>/cpp}"
mkdir -p "$DEST/rust-libs/arm64-v8a" "$DEST/rust-libs/x86_64"
DEST="$(cd "$DEST" && pwd)"

# core/ workspace root (this script lives in spikes/rn-nitro-app/scripts/).
HERE="$(cd "$(dirname "$0")" && pwd)"
CORE="$(cd "$HERE/../../../core" && pwd)"

: "${ANDROID_NDK_HOME:?set ANDROID_NDK_HOME, e.g. ~/Android/Sdk/ndk/27.1.12297006}"

cd "$CORE"
echo "==> cargo-ndk build lumi-ffi-cabi (arm64-v8a + x86_64, release)"
cargo ndk -t arm64-v8a -t x86_64 build --release -p lumi-ffi-cabi

echo "==> copy staticlibs into $DEST/rust-libs/<ABI>/"
cp "target/aarch64-linux-android/release/liblumi_ffi_cabi.a" "$DEST/rust-libs/arm64-v8a/"
cp "target/x86_64-linux-android/release/liblumi_ffi_cabi.a"  "$DEST/rust-libs/x86_64/"

echo "==> generate the C header -> $DEST/lumi_ffi_cabi.h"
cbindgen --config "$CORE/lumi-ffi-cabi/cbindgen.toml" --crate lumi-ffi-cabi --output "$DEST/lumi_ffi_cabi.h"

echo "==> done:"
find "$DEST/rust-libs" -name '*.a' -print
echo "header: $DEST/lumi_ffi_cabi.h"
