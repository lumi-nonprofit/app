# THROWAWAY spike #1b — append these to the scaffolded library's
# android/CMakeLists.txt (the nitro template's, which already does
# `project(lumicrypto)`, `add_library(lumicrypto SHARED src/main/cpp/cpp-adapter.cpp)`,
# `include(.../nitrogen/generated/android/lumicrypto+autolinking.cmake)`, and
# `include_directories("src/main/cpp" "../cpp")`). Add AFTER that include().

# 1) My hand-written C++ Hybrid Object impl. HybridLumiCrypto.{hpp,cpp} + lumi_ffi.h
#    live in the library's cpp/ dir, which is already on the include path.
target_sources(lumicrypto PRIVATE ${CMAKE_SOURCE_DIR}/../cpp/HybridLumiCrypto.cpp)

# 2) The hand-written Rust C-ABI staticlib, per ABI (built by
#    scripts/build-rust-android.sh into <lib>/cpp/rust-libs/<ABI>/).
add_library(lumi_ffi_cabi STATIC IMPORTED)
set_target_properties(lumi_ffi_cabi PROPERTIES
  IMPORTED_LOCATION ${CMAKE_SOURCE_DIR}/../cpp/rust-libs/${ANDROID_ABI}/liblumi_ffi_cabi.a)

# 3) Link it (+ dl/m that the Rust Android staticlib needs; log/android already linked
#    by the template).
target_link_libraries(lumicrypto lumi_ffi_cabi dl m)
