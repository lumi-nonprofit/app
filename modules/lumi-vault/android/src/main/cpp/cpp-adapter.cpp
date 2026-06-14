// JNI entry point: when liblumivault.so is loaded (System.loadLibrary("lumivault") via the Kotlin
// OnLoad), the JVM calls JNI_OnLoad, which runs nitrogen's initialize(vm) -> registerAllNatives()
// -> HybridObjectRegistry::registerHybridObjectConstructor("LumiVault", make_shared<HybridLumiVault>()).
// (nitrogen generates initialize()/registerAllNatives() in lumivaultOnLoad.cpp but expects the host
// to provide JNI_OnLoad — see lumivaultOnLoad.hpp.)
#include <jni.h>

#include "lumivaultOnLoad.hpp" // generated; on the include path + guarded by the autolinking define

extern "C" JNIEXPORT jint JNICALL JNI_OnLoad(JavaVM* vm, void* /*reserved*/) {
  return margelo::nitro::lumivault::initialize(vm);
}
