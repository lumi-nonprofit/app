# Security Policy

Lumi is a privacy-first, local-first mental-wellbeing app. Health data
(special-category, GDPR Art. 9) stays on the device; the optional sync server is
zero-knowledge (ciphertext + wrapped-key envelopes only). Security is a core
product property — see `docs/adr/0001-cross-platform-architecture.md` (§3 crypto,
§5 sync, §9 the S1–S12 requirement mapping).

## Supported versions

Lumi is pre-release (0.x). Only the latest `main` receives security fixes.

| Version | Supported |
| ------- | --------- |
| latest `main` (0.x) | ✅ |
| older 0.x | ❌ |

## Reporting a vulnerability

**Please report privately — do not open a public issue for a security problem.**

- **Preferred:** GitHub *private vulnerability reporting* — repository **Security**
  tab → **Report a vulnerability**. (Maintainers: enable this under Settings →
  Code security.)
- **Email fallback:** `TODO(Anna)` — confirm a dedicated security contact address.

What to expect: acknowledgement within ~7 days; an assessment and, if accepted, a
fix plan with a coordinated disclosure timeline. We do not run a paid bug bounty
(nonprofit), but we credit reporters who wish to be named.

Please include: affected component (app / Rust core / sync server), version or
commit, reproduction steps, and impact. For data-exposure issues, **do not include
real personal/health data** in the report.

## Cryptography & audit-gap disclosure

The shared Rust core uses well-regarded but **not independently audited** crates.
We disclose this rather than imply assurance we don't have:

- **KDF:** `argon2` (Argon2id, RFC 9106) — unaudited.
- **AEAD:** `chacha20poly1305` (XChaCha20-Poly1305) / `aes-gcm` (AES-256-GCM) —
  RustCrypto, not independently audited.
- **Key agreement / wrapping:** `x25519-dalek` 2.x, HPKE (RFC 9180) — unaudited.
- **Post-quantum:** **not shipped.** X25519-only today; a versioned `wrap_alg`
  seam reserves space for a future X25519 + ML-KEM hybrid. We will **not** depend
  on `ml-kem` / PQ-HPKE in production until at least one independent audit lands.

Mitigations: pinned + reviewed dependency versions, `cargo-audit` / `cargo-deny`
(RUSTSEC) and `npm audit` in CI, a CycloneDX SBOM per release, no `unsafe` in the
core (`unsafe_code = "forbid"`), and `zeroize` on key material. The crypto design
and parameters are documented in ADR 0001 §3 for review.

## Scope

In scope: the Rust core (crypto, key hierarchy, sync/merge), the zero-knowledge
sync server, on-device data protection, and the app's handling of secrets. Out of
scope: issues requiring a physical device already unlocked by the user, and
third-party platform vulnerabilities (report those upstream).
