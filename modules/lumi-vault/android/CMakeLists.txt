cmake_minimum_required(VERSION 3.13)
project(lumivault)

set(CMAKE_CXX_STANDARD 20)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

# The `lumivault` SHARED target. It must exist BEFORE the +autolinking.cmake include (that file does
# target_sources/target_link_libraries/target_compile_definitions against `lumivault`).
#   - cpp-adapter.cpp : our JNI_OnLoad -> margelo::nitro::lumivault::initialize(vm) (fires registration)
#   - HybridLumiVault.cpp : our C++ impl over the lumi-ffi-cabi C ABI (in ../cpp/)
add_library(lumivault SHARED
  ${CMAKE_SOURCE_DIR}/src/main/cpp/cpp-adapter.cpp
  ${CMAKE_SOURCE_DIR}/../cpp/HybridLumiVault.cpp
)

# Nitrogen autolinking: compiles lumivaultOnLoad.cpp + HybridLumiVaultSpec.cpp into `lumivault`,
# sets -DBUILDING_LUMIVAULT_WITH_GENERATED_CMAKE_PROJECT, adds the generated include dirs, and
# find_package(fbjni / ReactAndroid / react-native-nitro-modules) + links them (via prefab).
include(${CMAKE_SOURCE_DIR}/../nitrogen/generated/android/lumivault+autolinking.cmake)

# Our headers: HybridLumiVault.hpp + the cbindgen lumi_ffi_cabi.h live in ../cpp/.
target_include_directories(lumivault PRIVATE ${CMAKE_SOURCE_DIR}/../cpp)

# The Rust C-ABI staticlib (contains lumi-vault + lumi-store's bundled SQLite), per ABI. Built by
# spikes/rn-nitro-app/scripts/build-lumi-rust-android.sh into ../cpp/rust-libs/<ABI>/.
add_library(lumi_ffi_cabi STATIC IMPORTED)
set_target_properties(lumi_ffi_cabi PROPERTIES
  IMPORTED_LOCATION ${CMAKE_SOURCE_DIR}/../cpp/rust-libs/${ANDROID_ABI}/liblumi_ffi_cabi.a)

find_library(LOG_LIB log)
target_link_libraries(lumivault lumi_ffi_cabi ${LOG_LIB} dl m android)

# 16 KB ELF page alignment for our own .so (NDK 27.x is not 16KB-aligned by default; NDK r28+ would be).
target_link_options(lumivault PRIVATE "-Wl,-z,max-page-size=16384")
