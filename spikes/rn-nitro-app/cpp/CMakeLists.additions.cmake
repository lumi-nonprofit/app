# Step 4a — append to the local Nitro module's android/CMakeLists.txt, AFTER the
# `include(.../nitrogen/generated/android/lumivault+autolinking.cmake)` line. The CMake
# project/target is `lumivault` (from nitro.json androidCxxLibName); HybridLumiVault.{hpp,cpp}
# and the cbindgen lumi_ffi_cabi.h live in the module's cpp/ (already on the include path).

# 1) Our hand-written C++ Hybrid Object impl.
target_sources(lumivault PRIVATE ${CMAKE_SOURCE_DIR}/../cpp/HybridLumiVault.cpp)

# 2) The Rust C-ABI staticlib (built per-ABI by scripts/build-lumi-rust-android.sh into
#    <module>/cpp/rust-libs/<ABI>/liblumi_ffi_cabi.a). This staticlib already contains the
#    bundled SQLite (lumi-store) compiled by the NDK — verified to cross-compile for arm64.
add_library(lumi_ffi_cabi STATIC IMPORTED)
set_target_properties(lumi_ffi_cabi PROPERTIES
  IMPORTED_LOCATION ${CMAKE_SOURCE_DIR}/../cpp/rust-libs/${ANDROID_ABI}/liblumi_ffi_cabi.a)

# 3) Link it. dl/m/log are needed by the Rust Android staticlib; android/log come from the template.
target_link_libraries(lumivault lumi_ffi_cabi dl m log)

# 4) 16 KB ELF page alignment for our own .so. NDK 27.x does NOT default to 16 KB-aligned output
#    (NDK r28+ would), so set the linker flag explicitly (Android-15+ / Play requirement; harmless
#    for the smoke). Prebuilt deps (Hermes/jsi/fbjni/NitroModules/Fresco) are handled by upstream.
target_link_options(lumivault PRIVATE "-Wl,-z,max-page-size=16384")
