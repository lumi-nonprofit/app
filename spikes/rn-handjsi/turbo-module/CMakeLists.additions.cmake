# THROWAWAY spike #1b — add these lines to the scaffolded library's
# android/CMakeLists.txt (the one create-react-native-library generated), AFTER the
# module target is defined. They link the hand-written Rust C-ABI staticlib that
# scripts/build-rust-android.sh produced (per-ABI), and expose lumi_ffi.h.
#
# Replace <MODULE_TARGET> with the actual target name in the generated CMakeLists
# (often `react_codegen_<name>` or the add_library() target the scaffold defines —
# grep the file for add_library).

# Where build-rust-android.sh copied the per-ABI staticlibs + the cbindgen header.
# Adjust the relative path to wherever you placed spikes/rn-handjsi/turbo-module.
set(LUMI_FFI_DIR ${CMAKE_CURRENT_SOURCE_DIR}/../cpp)            # contains lumi_ffi.h + LumiCryptoImpl.*
set(LUMI_RUST_LIBS ${CMAKE_CURRENT_SOURCE_DIR}/../cpp/rust-libs) # contains <ABI>/liblumi_ffi_cabi.a

add_library(lumi_ffi_cabi STATIC IMPORTED)
set_target_properties(lumi_ffi_cabi PROPERTIES
  IMPORTED_LOCATION ${LUMI_RUST_LIBS}/${ANDROID_ABI}/liblumi_ffi_cabi.a)

target_include_directories(<MODULE_TARGET> PRIVATE ${LUMI_FFI_DIR})
# Rust's Android staticlib references the platform log/dl/m libs; link them too.
target_link_libraries(<MODULE_TARGET> lumi_ffi_cabi log dl m)
