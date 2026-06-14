// Step 4a — HybridLumiVault impl: marshals to/from the lumi-ffi-cabi C ABI and surfaces every
// non-OK error code as a JS exception (Nitro converts a thrown std::exception into a JS error).
// §1: only handles/PIN/JSON/record-id/createdAt cross; keys stay in lumi-vault behind the handle.
#include "HybridLumiVault.hpp"

#include "lumi_ffi_cabi.h" // cbindgen header, copied next to this file by build-lumi-rust-android.sh

#include <cstdint>
#include <stdexcept>
#include <string>

namespace margelo::nitro::lumivault {

namespace {

void check(int32_t code, const char* what) {
  if (code != LUMI_OK) {
    throw std::runtime_error(std::string("LumiVault.") + what + " failed (code " + std::to_string(code) + ")");
  }
}

std::string to_hex(const uint8_t* b, size_t n) {
  static const char* H = "0123456789abcdef";
  std::string out;
  out.reserve(n * 2);
  for (size_t i = 0; i < n; i++) {
    out.push_back(H[b[i] >> 4]);
    out.push_back(H[b[i] & 0x0f]);
  }
  return out;
}

int nibble(char c) {
  if (c >= '0' && c <= '9') return c - '0';
  if (c >= 'a' && c <= 'f') return c - 'a' + 10;
  if (c >= 'A' && c <= 'F') return c - 'A' + 10;
  return -1;
}

} // namespace

void HybridLumiVault::open(const std::string& dbPath) {
  check(lumi_vault_open(dbPath.c_str()), "open");
}

void HybridLumiVault::close() {
  check(lumi_vault_close(), "close");
}

double HybridLumiVault::unlock(const std::string& pin) {
  uint64_t handle = 0;
  check(lumi_unlock_vault(pin.c_str(), &handle), "unlock");
  return static_cast<double>(handle); // small monotonic counter, exactly representable
}

std::string HybridLumiVault::putCheckin(double handle, const std::string& recordJson, double createdAtMs) {
  uint8_t rid[LUMI_RECORD_ID_LEN];
  check(lumi_put_checkin(static_cast<uint64_t>(handle), recordJson.c_str(),
                         static_cast<int64_t>(createdAtMs), rid),
        "putCheckin");
  return to_hex(rid, LUMI_RECORD_ID_LEN);
}

std::string HybridLumiVault::listCheckinsJson(double handle) {
  char* json = nullptr;
  check(lumi_list_checkins(static_cast<uint64_t>(handle), &json), "listCheckins");
  std::string out = (json != nullptr) ? std::string(json) : std::string("[]");
  lumi_string_free(json); // free the Rust-allocated string (NULL is ignored)
  return out;
}

bool HybridLumiVault::shredCheckin(double handle, const std::string& recordId) {
  if (recordId.size() != static_cast<size_t>(LUMI_RECORD_ID_LEN) * 2) {
    throw std::runtime_error("LumiVault.shredCheckin: record id must be 32 hex chars");
  }
  uint8_t rid[LUMI_RECORD_ID_LEN];
  for (size_t i = 0; i < LUMI_RECORD_ID_LEN; i++) {
    int hi = nibble(recordId[2 * i]);
    int lo = nibble(recordId[2 * i + 1]);
    if (hi < 0 || lo < 0) {
      throw std::runtime_error("LumiVault.shredCheckin: invalid hex record id");
    }
    rid[i] = static_cast<uint8_t>((hi << 4) | lo);
  }
  bool destroyed = false;
  check(lumi_shred_checkin(static_cast<uint64_t>(handle), rid, &destroyed), "shredCheckin");
  return destroyed;
}

} // namespace margelo::nitro::lumivault
