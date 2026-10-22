package expo.modules.lumivault

import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

// nitrogen-generated, package com.margelo.nitro.lumivault; `internal` but in THIS gradle module
// (lumivault+autolinking.gradle adds its kotlin srcDir), so it is accessible here.
import com.margelo.nitro.lumivault.lumivaultOnLoad

/**
 * The Expo module exists ONLY to load liblumivault.so + fire Nitro registration at startup. The load
 * of the lib (System.loadLibrary("lumivault")) triggers JNI_OnLoad (cpp-adapter.cpp) ->
 * registerAllNatives() -> registers the "LumiVault" HybridObject, which JS then gets through
 * NitroModules.createHybridObject('LumiVault'). It exposes no JS surface (Nitro is the API).
 *
 * initializeNative() is idempotent (guards `didLoad`), so a call from both the class-load
 * companion init (earliest) and OnCreate is safe. **This startup-trigger is the one piece with no
 * published Nitro-in-Expo-module precedent — verify the registration fires before the smoke at
 * Gate A; if it is too late, move the call to an Application/onCreate hook.**
 */
class LumiVaultModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("LumiVault")
    OnCreate {
      lumivaultOnLoad.initializeNative()
    }
  }

  companion object {
    init {
      // Fires on class load (during Expo module registration) — earliest reliable trigger.
      lumivaultOnLoad.initializeNative()
    }
  }
}
