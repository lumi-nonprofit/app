#!/usr/bin/env bash
# THROWAWAY spike #1b (Nitro) — build the Rust C-ABI staticlib for the two ABIs we run
# on (Pixel = arm64-v8a, emulator = x86_64) + the cbindgen header, and copy them into
# the scaffolded Nitro library's cpp/ dir (where HybridLumiCrypto.* live and the
# CMake additions expect rust-libs/<ABI>/ + lumi_ffi.h).
#
# Usage:
#   export ANDROID_NDK_HOME=~/Android/Sdk/ndk/27.1.12297006   # already set in your toolbox
#   bash build-rust-android.sh /abs/path/to/react-native-lumi-crypto/cpp
#
# Env already-present in the toolbox: cargo-ndk 4.1.2, cbindgen 0.29.4, rust targets
# aarch64-linux-android + x86_64-linux-android. (cargo-ndk 4.x is fine here — we do a
# plain build, no --no-strip, so the ubrn cargo-ndk breakage does not apply.)
set -euo pipefail

DEST="${1:?usage: build-rust-android.sh <scaffolded-lib>/cpp}"
mkdir -p "$DEST/rust-libs/arm64-v8a" "$DEST/rust-libs/x86_64"
DEST="$(cd "$DEST" && pwd)"

HERE="$(cd "$(dirname "$0")" && pwd)"
CRATE="$HERE/../rust/lumi-ffi-cabi"
cd "$CRATE"

: "${ANDROID_NDK_HOME:?set ANDROID_NDK_HOME to your NDK, e.g. ~/Android/Sdk/ndk/27.1.12297006}"

echo "==> cargo-ndk build (arm64-v8a + x86_64, release)"
cargo ndk -t arm64-v8a -t x86_64 build --release

echo "==> copy staticlibs into $DEST/rust-libs/<ABI>/"
cp "target/aarch64-linux-android/release/liblumi_ffi_cabi.a" "$DEST/rust-libs/arm64-v8a/"
cp "target/x86_64-linux-android/release/liblumi_ffi_cabi.a"  "$DEST/rust-libs/x86_64/"

echo "==> generate C header -> $DEST/lumi_ffi.h"
cbindgen --config cbindgen.toml --crate lumi-ffi-cabi --output "$DEST/lumi_ffi.h"

echo "==> done:"
find "$DEST/rust-libs" -name '*.a' -print
echo "header: $DEST/lumi_ffi.h"
