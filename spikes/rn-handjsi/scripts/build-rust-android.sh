#!/usr/bin/env bash
# THROWAWAY spike #1b — build the Rust C-ABI staticlib for the two ABIs we run on
# (Pixel = arm64-v8a, emulator = x86_64) and generate the C header. Run inside the
# toolbox that has rustup + cargo-ndk + cbindgen + the Android NDK on PATH/ENV.
#
# Prereqs (once):
#   rustup target add aarch64-linux-android x86_64-linux-android
#   cargo install cargo-ndk cbindgen
#   export ANDROID_NDK_HOME=/path/to/ndk/27.x.x   (or ANDROID_NDK_ROOT)
set -euo pipefail

HERE="$(cd "$(dirname "$0")" && pwd)"
CRATE="$HERE/../rust/lumi-ffi-cabi"
DEST="$HERE/../turbo-module/cpp/rust-libs"   # CMakeLists.additions.cmake reads <ABI>/ here
HEADER="$HERE/../turbo-module/cpp/lumi_ffi.h"

cd "$CRATE"

echo "==> cargo-ndk build (arm64-v8a + x86_64, release)"
# cargo-ndk picks the NDK clang as linker; builds the crate-types incl. staticlib.
cargo ndk -t arm64-v8a -t x86_64 build --release

echo "==> copy staticlibs into per-ABI dirs"
mkdir -p "$DEST/arm64-v8a" "$DEST/x86_64"
cp "target/aarch64-linux-android/release/liblumi_ffi_cabi.a" "$DEST/arm64-v8a/"
cp "target/x86_64-linux-android/release/liblumi_ffi_cabi.a"  "$DEST/x86_64/"

echo "==> generate C header (cbindgen)"
cbindgen --config cbindgen.toml --crate lumi-ffi-cabi --output "$HEADER"

echo "==> done:"
find "$DEST" -name '*.a' -print
echo "header: $HEADER"
