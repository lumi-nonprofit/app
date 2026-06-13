// THROWAWAY spike #1b — hand-written C++ method bodies over the Rust C ABI.
// Ported from reference/LumiCryptoImpl.cpp: same base64 helpers + Rust-C-ABI calls
// and §1 discipline, but returning Nitro structs and throwing std::runtime_error
// (Nitro converts C++ exceptions to JS errors) instead of raw jsi.
#include "HybridLumiCrypto.hpp"

#include <cstdint>
#include <stdexcept>
#include <string>
#include <vector>

// cbindgen header, built by scripts/build-rust-android.sh into <lib>/cpp/ (already
// on the include path). cpp_compat=true wraps the decls in extern "C".
#include "lumi_ffi.h"

namespace margelo::nitro::lumicrypto {
namespace {

constexpr char kB64[] =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";

std::string base64Encode(const uint8_t* data, size_t len) {
  std::string out;
  out.reserve(((len + 2) / 3) * 4);
  size_t i = 0;
  while (i + 3 <= len) {
    uint32_t n = (data[i] << 16) | (data[i + 1] << 8) | data[i + 2];
    out.push_back(kB64[(n >> 18) & 63]);
    out.push_back(kB64[(n >> 12) & 63]);
    out.push_back(kB64[(n >> 6) & 63]);
    out.push_back(kB64[n & 63]);
    i += 3;
  }
  if (len - i == 1) {
    uint32_t n = data[i] << 16;
    out.push_back(kB64[(n >> 18) & 63]);
    out.push_back(kB64[(n >> 12) & 63]);
    out.append("==");
  } else if (len - i == 2) {
    uint32_t n = (data[i] << 16) | (data[i + 1] << 8);
    out.push_back(kB64[(n >> 18) & 63]);
    out.push_back(kB64[(n >> 12) & 63]);
    out.push_back(kB64[(n >> 6) & 63]);
    out.push_back('=');
  }
  return out;
}

int b64val(char c) {
  if (c >= 'A' && c <= 'Z') return c - 'A';
  if (c >= 'a' && c <= 'z') return c - 'a' + 26;
  if (c >= '0' && c <= '9') return c - '0' + 52;
  if (c == '+') return 62;
  if (c == '/') return 63;
  return -1;
}

std::vector<uint8_t> base64Decode(const std::string& s) {
  std::vector<uint8_t> out;
  out.reserve((s.size() / 4) * 3);
  int buf = 0, bits = 0;
  for (char c : s) {
    if (c == '=' || c == '\n' || c == '\r' || c == ' ') continue;
    int v = b64val(c);
    if (v < 0) throw std::runtime_error("invalid base64");
    buf = (buf << 6) | v;
    bits += 6;
    if (bits >= 8) {
      bits -= 8;
      out.push_back(static_cast<uint8_t>((buf >> bits) & 0xFF));
    }
  }
  return out;
}

uint64_t parseHandle(const std::string& h) {
  try {
    return std::stoull(h);
  } catch (...) {
    throw std::runtime_error("invalid handle: " + h);
  }
}

} // namespace

DeviceKey HybridLumiCrypto::newDeviceKey() {
  uint64_t handle = 0;
  uint8_t pub[32];
  int rc = lumi_new_device_key(&handle, pub);
  if (rc != LUMI_OK) {
    throw std::runtime_error("newDeviceKey failed (" + std::to_string(rc) + ")");
  }
  return DeviceKey(std::to_string(handle), base64Encode(pub, 32));
}

std::string HybridLumiCrypto::sealCheckin(
    const std::string& handle,
    const std::string& peerPublicB64,
    const std::string& mood,
    double intensity,
    const std::string& note) {
  uint64_t h = parseHandle(handle);
  std::vector<uint8_t> peer = base64Decode(peerPublicB64);
  if (peer.size() != 32) {
    throw std::runtime_error("peerPublicB64 must decode to 32 bytes");
  }
  uint8_t* out = nullptr;
  size_t outLen = 0;
  int rc = lumi_seal_checkin(
      h, peer.data(), peer.size(), mood.c_str(),
      static_cast<uint8_t>(intensity), note.c_str(), &out, &outLen);
  if (rc != LUMI_OK) {
    throw std::runtime_error("sealCheckin failed (" + std::to_string(rc) + ")");
  }
  std::string b64 = base64Encode(out, outLen);
  lumi_free_buf(out, outLen);
  return b64;
}

CheckinDraft HybridLumiCrypto::openCheckin(
    const std::string& handle,
    const std::string& peerPublicB64,
    const std::string& sealedB64) {
  uint64_t h = parseHandle(handle);
  std::vector<uint8_t> peer = base64Decode(peerPublicB64);
  std::vector<uint8_t> sealed = base64Decode(sealedB64);
  if (peer.size() != 32) {
    throw std::runtime_error("peerPublicB64 must decode to 32 bytes");
  }
  char* mood = nullptr;
  uint8_t intensity = 0;
  char* note = nullptr;
  int rc = lumi_open_checkin(
      h, peer.data(), peer.size(), sealed.data(), sealed.size(),
      &mood, &intensity, &note);
  if (rc != LUMI_OK) {
    // The throwing path: wrong key / tampered / garbage sealed blob.
    throw std::runtime_error("openCheckin failed (" + std::to_string(rc) + ")");
  }
  CheckinDraft d(std::string(mood), static_cast<double>(intensity), std::string(note));
  lumi_free_string(mood);
  lumi_free_string(note);
  return d;
}

} // namespace margelo::nitro::lumicrypto
