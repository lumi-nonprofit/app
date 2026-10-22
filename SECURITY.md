# Security Policy

Lumi is a privacy-first, local-first app for mental wellbeing. Health data (a special category,
GDPR Art. 9) stays on the device. The optional sync server (M2, a design only today) is
zero-knowledge: it holds only ciphertext and wrapped-key envelopes. Security is a core property of
the product. See `docs/adr/0001-cross-platform-architecture.md` (§3 crypto, §5 sync, §9 the
mapping of the requirements S1 to S12).

## Supported versions

Lumi is pre-release (0.x). Only the latest `main` gets security fixes.

| Version             | Supported |
| ------------------- | --------- |
| latest `main` (0.x) | ✅        |
| older 0.x           | ❌        |

## How to report a vulnerability

**Report a security problem in private. Do not open a public issue.**

- **Preferred:** the private vulnerability report on GitHub — repository **Security** tab →
  **Report a vulnerability**. (Maintainers: turn this on under Settings → Code security.)
- **Email fallback:** <anna.zezulka@pm.me>

What to expect: an acknowledgement within about 7 days. Then an assessment follows. If we accept
the report, we make a fix plan with a coordinated disclosure timeline. We do not run a paid bug
bounty (we are a nonprofit), but we credit reporters who want to be named.

Include in the report:

- the affected component (app, Rust core or sync server);
- the version or the commit;
- the steps to reproduce the problem;
- the impact.

For a data-exposure issue, **do not put real personal or health data** into the report.

## Cryptography and audit-gap disclosure

The shared Rust core uses crates with a good reputation, but **nobody has audited them
independently**. We disclose this instead of a claim of assurance that we do not have. The crates
in `core/Cargo.lock` today:

- **KDF:** `argon2` (Argon2id, RFC 9106) — not audited.
- **AEAD:** `chacha20poly1305` (XChaCha20-Poly1305, RustCrypto) — not audited.

**Not shipped:** X25519 key agreement (`x25519-dalek`), HPKE (RFC 9180), AES-GCM and ML-KEM. ADR
0005 plans them for M2, and ADR 0005 is a proposal, not an accepted design. The versioned
`wrap_alg` seam in the envelope reserves space for a future X25519 + ML-KEM hybrid. We will **not**
depend on `ml-kem` or PQ-HPKE in production before at least one independent audit of the crates.

Mitigations:

- pinned and reviewed dependency versions;
- `cargo audit` (the RustSec advisory database) and `npm audit` in CI, as a report-only job
  (there is no `cargo-deny`);
- a CycloneDX SBOM as an artifact of every CI run (it is not a release asset);
- `unsafe` code forbidden in every core crate (`unsafe_code = "forbid"`), except `lumi-ffi-cabi`,
  which has `unsafe` by design (the C ABI);
- `zeroize` on key material.

ADR 0001 §3 documents the crypto design and the parameters for review.

## Scope

In scope:

- the Rust core (crypto, key hierarchy, sync and merge);
- the zero-knowledge sync server;
- the protection of data on the device;
- the way the app handles secrets.

Out of scope:

- an issue that needs a physical device that the user has already unlocked;
- a vulnerability of a third-party platform (report it upstream).
