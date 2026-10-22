# ADR 0004 — M1 vertical-slice foundational decisions

> **Note (2026-10-18):** Rewritten in Simplified Technical English on 2026-10-18; decisions and section numbering unchanged.

- **Status:** **Decided (2026-06-14).** Anna ratified these decisions from
  `docs/m1-vertical-slice-proposal.md`. This ADR records the foundational decisions for the M1
  vertical slice (a thin end-to-end skeleton). **Implementation has NOT started.** Review this
  record before build-plan step 1 (the test-first `lumi-vault` crypto).
- **Date:** 2026-06-14
- **Decision owner:** Anna (clinical / product / final architecture sign-off).
- **Builds on:** ADR 0003 (v1 binding = RN + Nitro, recommended) and
  `spikes/rn-nitro/SPIKE-REPORT.md` (spike #1b **GO**, real arm64 hardware). This ADR **partially
  supersedes ADR 0001**: its UniFFI binding references and its CMP-shaped §7 `apps/` tree. ADR 0001
  carries a note at each superseded point.
- **Locks relied on (ADR 0001):**
  - §1: the FFI returns handles and plaintext only, never raw key bytes.
  - §3: vault key → per-record content keys; XChaCha20-Poly1305; Argon2id; "Ship X25519-only".
  - §4: crypto-shred = the Article 17 erasure.
  - §7: monorepo intent.

## Context

ADR 0003 and spike #1b validated the v1 binding end-to-end on a real Pixel. The validated chain is
**React Native → Nitro Modules → C++ HybridObject → Rust C ABI**, with §1 intact. M1 ("core: data +
crypto") now starts as a thin end-to-end skeleton. The skeleton is one real feature: a single mood
check-in `{mood, intensity, note}` through the **production** stack. The chain is: capture → encrypt
at rest with the real vault and per-record-key scheme → persist → read back → decrypt → render. The
core then grows _along_ that proven spine.

`docs/m1-vertical-slice-proposal.md` holds the analysis behind these decisions (recommendations,
options and live-verified crate facts, 2026-06-14). This ADR records what Anna ratified.

## Decisions

### (a) Module / app structure

- **Nitro binding: integrate the Hybrid Object directly into the current root app as a local Expo
  module.** It is **NOT** a separate published library package.
- **Crate split (Rust):**
  - New **`core/lumi-vault`**: crypto only. It holds the vault / per-record-key tree and the in-Rust
    key registry. This keeps `lumi-core` dependency-free.
  - New **`core/lumi-store`**: the storage-engine binding. It isolates the SQLite dependency.
  - The **C ABI in a dedicated `unsafe` crate, `core/lumi-ffi-cabi`**. Thus **`lumi-ffi` stays a
    safe (`forbid(unsafe)`) re-export facade.** The C ABI depends on `lumi-vault` and only marshals
    (handles / pointers / CStr).

**Why (binding):** The app-integrated shape makes the SPIKE-REPORT **release-dex duplicate-class
blocker disappear by construction**. With **no library module**, the app applies
`com.facebook.react` once, as always. There is no second codegen pass, so the duplicate never
appears.

Root cause (traced to source): the `create-react-native-library` template applies
`com.facebook.react` _inside the library module_. This re-runs RN codegen there. The codegen
regenerates `com.facebook.fbreact.specs` / `com.facebook.react.viewmanagers` into the library's own
dex. The app's React Native already ships these classes → `defined multiple times` at
`:app:mergeDexRelease` (upstream `react-native-builder-bob` #774, still open).

**Why (crate split):** The split keeps `lumi-core` dep-free and musl-green. It isolates the `unsafe`
C ABI. It is the lowest-maintenance shape for a solo maintainer.

**Trade-offs / downstream:**

- App-integrated native code only materializes after `expo prebuild` (this is a CNG app). Thus an
  **Expo config plugin** applies the native setup. This is the unproven step (see Deferred).
- `core/lumi-ffi-cabi` drops `forbid(unsafe)`, because the C ABI needs `unsafe`. The other crates
  keep it.
- The sandbox musl dev-loop **excludes** the C-dependent crates (`lumi-store` under the chosen
  engine, `lumi-ffi-cabi`). CI already builds everything on the host-toolchain matrix.

### (b) Local encrypted storage

- **App-layer per-record AEAD**: the ADR 0001 §3 locked design. The core seals each record with its
  own **per-record content key** (XChaCha20-Poly1305) and wraps that key with the **vault key**.
  **Crypto-shred** (destroy the wrapped content key) = the Article 17 erasure mechanism.
- **Engine: rusqlite-owned SQLite. The Rust core (never JS) owns the connection.**
- **SQLCipher only as optional, core-owned defence-in-depth** (see the `created_at` decision).

**Why:** Only app-layer per-record AEAD gives per-record keys, per-record crypto-shred and a clean
§1 boundary. It is also what §0/§3 already lock (whole-DB
SQLCipher gives one key and no per-record shred). The **core owns the connection**, and this fixes
the current §1 violation. Today `src/db/connect.ts:23` sets `PRAGMA key` from JS, which leaks the DB
key into the JS heap. Under this decision the key never crosses the FFI.

**Trade-offs / downstream:** Sealed fields are opaque to SQL. Thus the slice keeps a small queryable
plaintext index (a `created_at` for timeline order). The body is never server-filtered, so the trade
is cheap. Records no longer use the single secure-store DB key in `key.ts`. The current SQLCipher DB
needs a one-shot migration (ADR 0001 §6). That migration is **out of slice scope**, but the slice's
record/vault row format must stay migration-compatible.

### (c) Post-quantum (X25519 + ML-KEM-768 / X-Wing)

- **Ship X25519-only in v1.** Keep the versioned envelope's reserved hybrid seam
  (`lumi-sync-client` `WrapAlg = 2`, "do not ship until audited"). **No KEM in M1.**
- **M2 flip-on criteria (recorded now):** enable the hybrid only when all 3 criteria hold:
  - **(i)** X-Wing reaches CFRG adoption or an RFC, **or** the project explicitly accepts a
    non-standard combiner.
  - **(ii)** The pure-Rust `ml-kem` / `x-wing` crates reach an **audited ≥ 1.0**.
  - **(iii)** Re-verify that the crate tracks the then-current draft **before the app persists any
    key bytes**.

**Why:** This matches ADR 0001 §3 ("Ship X25519-only") and is **off the slice's critical path**. The
at-rest slice uses symmetric AEAD key-wrap and needs no KEM (the KEM is M2 enrolment/sync).

The ecosystem is not at the maturity bar for a clinical app:

- X-Wing is an **unadopted individual Internet-Draft (draft-10, 2026-03-02)**.
- The `x-wing` crate is **0.1.0-rc.0, never audited, and implements draft-06**. That is 4 revisions
  behind, across a **decapsulation-key encoding change at draft-08 that breaks compatibility**.
- `ml-kem` 0.3.2 has no audit and recent API churn.

The envelope is already additive-by-design, so the wait costs **zero migration**. (Note: the PQ
hybrid in wide use today is **X25519MLKEM768**, a _different_ construction from X-Wing. This is
relevant only if FIPS procurement ever becomes a requirement.)

### (d) `apps/` — decision (A): no `apps/` this milestone

- **Run the slice in the current root app. Do NOT create `apps/` this milestone.**

**Why:** There is **no `apps/` directory**. The production RN app lives at the **repo root**, and
`apps/` is only a node in the _future_ monorepo tree of ADR 0001 §7 (never created). So the
ratification constraint _"`apps/` stays empty until spike #1 passes and M3"_ (ADR 0001 line 89)
concerns a directory that does not exist yet. It does not concern the current root app.

The slice **reuses the current root-app shell as the integration proof** (the accessible check-in
screens, the test seam, the repo API). It touches the root app and `core/` only, never `apps/`.
This is a **deliberate, justified deviation**: a sliver of app work in the root app = _integration
proof_, **not** the M3 monorepo build-out. The §7 reshape (and the CMP-versus-RN directory question)
stays deferred to M3.

### (e) `created_at` leakage — accepted for the slice; hardened index committed pre-ship

- **The slice keeps a plaintext `created_at`** (queryable timeline index). This is acceptable
  because the slice is a **dev proof on a personal device: no real users, no real-world leakage.**
- **Committed pre-ship hardened index (NOT built in the slice):** **core-owned SQLCipher over the
  (b1) store**, which encrypts the queryable index at rest. This closes the plaintext-cadence leak
  before any real user.

**Why deferred from the slice:** SQLCipher-in-Rust adds an **OpenSSL-for-Android cross-compile** on
top of cbindgen. That would add risk to the _integration proof_, which is the slice's whole point.
This is a **committed follow-up**, not an option.

## The §1 interpretation relied on (recorded)

A **user-entered PIN passphrase that crosses the FFI inbound is consistent with §1.** §1 forbids raw
**key bytes** across the boundary. The PIN is **user input, not a key**. The Argon2id derivation
(PIN → PIN key) happens **in Rust**. The derived keys, the vault key and the per-record content keys
**never leave Rust** (they live in the in-Rust registry behind opaque handles).

Across the FFI go **handles, plaintext domain objects (the Entry record), and ciphertext**. No
key-shaped field appears in any signature (the same discipline that
`spikes/rn-nitro/SPIKE-REPORT.md` verified).

## Deferred / risk items (committed to track)

1. **Expo + prebuild + Nitro + Rust C-ABI integration = the PRIMARY integration risk.** The spike
   validated Nitro on **bare RN 0.81.4**, not in an Expo CNG app. The config-plugin / prebuild setup
   of the C++ code, `externalNativeBuild` and the per-ABI Rust `staticlib` is unproven. De-risk it
   **first** (build-plan step 3, before the UI). Fallback: commit the prebuilt `android/`/`ios/`
   dirs (bare workflow), still app-integrated.
2. **16 KB ELF page alignment** for our `liblumicrypto.so`: prefer **NDK r28+** (its default output
   is 16 KB-aligned, so the item disappears). Otherwise set `-Wl,-z,max-page-size=16384` on our
   CMake target.
3. **`created_at` index protection** (decision e): core-owned SQLCipher over the index, pre-ship.
4. **Net-new crypto that the spike did not cover:** **Argon2id** and the **XChaCha20-Poly1305
   (24-byte nonce)** variant were **not** in the spike. The spike used ChaCha20-Poly1305 with a
   12-byte nonce and no KDF. Validate both fresh in `lumi-vault` (step 1). Benchmark the §3 Argon2id cost
   floor (m=64 MiB / t=3 / p=1) **on low-end Android** (ADR 0001 §3).
5. **Forward-compatibility:** the slice ships only the PIN-wrap. Version and shape the vault row and
   the record row for later additions. The **recovery-key wrap**, the **biometric/OS-keystore copy**
   and sync metadata must slot in later **without a reformat of persisted data**.
6. **Migration** of the SQLCipher data of current users (ADR 0001 §6) is out of slice scope. The
   slice's record format must not paint that migration into a corner.

## References

- ADR 0003 — v1 UI + binding (RN + Nitro), validated.
- `spikes/rn-nitro/SPIKE-REPORT.md` — spike #1b GO (real arm64 round-trip, §1 intact).
- `docs/m1-vertical-slice-proposal.md` — the analysis and options behind these decisions.
- ADR 0001 §1 / §3 / §4 / §6 / §7 — the locked invariants this ADR implements (with a note where
  superseded).
