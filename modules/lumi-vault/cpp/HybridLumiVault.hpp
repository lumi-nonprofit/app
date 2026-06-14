// Step 4a — the C++ Hybrid Object implementing the Nitrogen-generated HybridLumiVaultSpec
// over the lumi-ffi-cabi C ABI. Lives in the local Nitro module's cpp/ (on the include path,
// alongside the generated HybridLumiVaultSpec.hpp and the cbindgen lumi_ffi_cabi.h).
#pragma once

#include "HybridLumiVaultSpec.hpp" // Nitrogen-generated (nitrogen/generated/shared/c++)

namespace margelo::nitro::lumivault {

class HybridLumiVault : public HybridLumiVaultSpec {
public:
  // Default ctor required by the generated lumivaultOnLoad auto-registration.
  HybridLumiVault() : HybridObject(TAG) {}

  void open(const std::string& dbPath) override;
  void close() override;
  double unlock(const std::string& pin) override;
  std::string putCheckin(double handle, const std::string& recordJson, double createdAtMs) override;
  std::string listCheckinsJson(double handle) override;
  bool shredCheckin(double handle, const std::string& recordId) override;
};

} // namespace margelo::nitro::lumivault
