# ADR 0004 — M1 vertical-slice foundational decisions

- **Status:** **Decided (2026-06-14)** — ratified by Anna from
  `docs/m1-vertical-slice-proposal.md`. Records the foundational decisions for the M1
  walking-skeleton vertical slice. **Implementation has NOT started** — this record is to be
  reviewed before build-plan step 1 (test-first `lumi-vault` crypto).
- **Date:** 2026-06-14
- **Decision owner:** Anna (clinical / product / final architecture sign-off).
- **Builds on:** ADR 0003 (v1 binding = RN + Nitro, recommended) + `spikes/rn-nitro/SPIKE-REPORT.md`
  (spike #1b **GO**, real arm64 hardware). **Partially supersedes ADR 0001** (its UniFFI binding
  references and CMP-shaped §7 `apps/` tree — annotated in-place in 0001).
- **Locks relied on (ADR 0001):** §1 (FFI returns handles/plaintext only, never raw key bytes),
  §3 (vault key → per-record content keys; XChaCha20-Poly1305; Argon2id; "Ship X25519-only"),
  §4 (crypto-shredding = Art. 17 erasure), §7 (monorepo intent).

## Context

ADR 0003 + spike #1b validated the v1 binding end-to-end on a real Pixel:
**React Native → Nitro Modules → C++ HybridObject → Rust C ABI**, §1 intact. M1 ("core: data +
crypto") now begins as a **walking skeleton**: one real feature — a single mood check-in
`{mood, intensity, note}` — driven end-to-end through the **production** stack (capture → encrypt
at rest with the real vault / per-record-key scheme → persist → read back → decrypt → render),
then the core is fleshed out _along_ that proven spine. `docs/m1-vertical-slice-proposal.md` is the
analysis behind these decisions (recommendations + options + live-verified crate facts, 2026-06-14);
this ADR records what was ratified.

## Decisions

### (a) Module / app structure

- **Nitro binding: integrate the Hybrid Object directly into the existing root app as a local
  Expo module** — **NOT** a separate published library package.
- **Crate split (Rust):** new **`core/lumi-vault`** (crypto-only: the vault / per-record-key tree +
  the in-Rust key registry — keeps `lumi-core` dependency-free); new **`core/lumi-store`** (the
  storage-engine binding, isolating the SQLite dependency); the **C ABI in a dedicated `unsafe`
  crate, `core/lumi-ffi-cabi`**, so **`lumi-ffi` stays a safe (`forbid(unsafe)`) re-export facade**.
  The C ABI depends on `lumi-vault` and only marshals (handles / pointers / CStr).

**Why.** The app-integrated shape makes the SPIKE-REPORT **release-dex duplicate-class blocker
disappear by construction**. Root cause (traced to source): the `create-react-native-library`
template applies `com.facebook.react` _inside the library module_, which re-runs RN codegen there
and regenerates `com.facebook.fbreact.specs` / `com.facebook.react.viewmanagers` into the library's
own dex — classes the app's React Native already ships → `defined multiple times` at
`:app:mergeDexRelease` (upstream `react-native-builder-bob` #774, still open). With **no library
module**, `com.facebook.react` is applied once (by the app, as always) → no second codegen pass →
the duplicate is never generated. The crate split keeps `lumi-core` dep-free and musl-green,
isolates the `unsafe` C ABI, and is the lowest-maintenance shape for a solo maintainer.

**Trade-offs / downstream.** App-integrated native code only materializes after `expo prebuild`
(this is a CNG app), so the wiring is applied via an **Expo config plugin** — the unproven step
(see Deferred). `core/lumi-ffi-cabi` drops `forbid(unsafe)` (the C ABI needs `unsafe`); the other
crates keep it. The sandbox musl dev-loop **excludes** the C-dependent crates (`lumi-store` under
the chosen engine, `lumi-ffi-cabi`); CI already builds everything on the host-toolchain matrix.

### (b) Local encrypted storage

- **App-layer per-record AEAD** — the ADR 0001 §3 locked design: each record sealed with its own
  **per-record content key** (XChaCha20-Poly1305), wrapped by the **vault key**; **crypto-shredding**
  (destroy the wrapped content key) = the Art. 17 erasure mechanism.
- **Engine: rusqlite-owned SQLite, with the Rust core (never JS) owning the connection.**
- **SQLCipher only as optional, core-owned defence-in-depth** (see the `created_at` decision).

**Why.** App-layer per-record AEAD is the only design that natively yields per-record keys +
per-record crypto-shredding + a clean §1 boundary, and it is what §0/§3 already lock (whole-DB
SQLCipher gives one key, no per-record shredding). The **core owning the connection** is what fixes
the current §1 violation — today `src/db/connect.ts:23` sets `PRAGMA key` from JS, leaking the DB
key into the JS heap; under this decision the key never crosses the FFI.

**Trade-offs / downstream.** Sealed fields are opaque to SQL, so the slice keeps a small queryable
plaintext index (a `created_at` for timeline ordering); the body is never server-filtered, so the
trade is cheap. `key.ts`'s single secure-store DB key is superseded for records. The existing
SQLCipher DB needs a one-shot migration (ADR 0001 §6) — **out of slice scope**, but the slice's
record/vault row format must stay migration-compatible.

### (c) Post-quantum (X25519 + ML-KEM-768 / X-Wing)

- **Ship X25519-only in v1.** Keep the versioned envelope's reserved hybrid seam
  (`lumi-sync-client` `WrapAlg = 2`, "do not ship until audited"). **No KEM in M1.**
- **M2 flip-on criteria (recorded now):** enable the hybrid only when **(i)** X-Wing reaches CFRG
  adoption / an RFC **or** a non-standard combiner is explicitly accepted; **(ii)** the pure-Rust
  `ml-kem` / `x-wing` crates reach an **audited ≥ 1.0**; and **(iii)** the crate is re-verified to
  track the then-current draft **before any key bytes are persisted**.

**Why.** Matches ADR 0001 §3 ("Ship X25519-only") and is **off the slice's critical path** — the
at-rest slice uses symmetric AEAD key-wrap and needs no KEM (the KEM is M2 enrolment/sync). The
ecosystem is not at the maturity bar for a clinical app: X-Wing is an **unadopted individual
Internet-Draft (draft-10, 2026-03-02)**; the `x-wing` crate is **0.1.0-rc.0, never audited, and
implements draft-06** — four revisions behind, across a **breaking decap-key encoding change at
draft-08**; `ml-kem` 0.3.2 is unaudited with recent API churn. The envelope is already
additive-by-design, so waiting costs **zero migration**. (Note: the deployed-in-the-wild hybrid is
**X25519MLKEM768**, a _different_ construction from X-Wing — relevant only if FIPS procurement ever
becomes a requirement.)

### (d) `apps/` — ruling (A): no `apps/` this milestone

- **Run the slice in the existing root app; do NOT create `apps/` this milestone.**

**Why.** There is **no `apps/` directory** — the production RN app lives at the **repo root**, and
`apps/` is only a node in ADR 0001 §7's _future_ monorepo tree (which has never been created). So
the ratification constraint _"`apps/` stays empty until spike #1 passes and M3"_ (ADR 0001 line 89)
is about a directory that doesn't exist yet, not about the existing root app. The slice **reuses
the existing root-app shell as the integration proof** (the accessible check-in screens, the test
seam, the repo API), touching the root app + `core/` only — never `apps/`. This is a **deliberate,
justified deviation**: a sliver of app work in the root app = _integration proof_, **not** the M3
monorepo buildout. The §7 reshape (and the CMP-vs-RN directory question) stays deferred to M3.

### (e) `created_at` leakage — accepted for the slice; hardening committed pre-ship

- **The slice keeps a plaintext `created_at`** (queryable timeline index). Acceptable because the
  slice is a **dev proof on a personal device — no real users, no real-world leakage.**
- **Committed pre-ship hardening (NOT built in the slice):** **core-owned SQLCipher over the (b1)
  store**, encrypting the queryable index at rest — so the plaintext-cadence leak is closed before
  any real user.

**Why deferred from the slice.** SQLCipher-in-Rust adds an **OpenSSL-for-Android cross-compile**
on top of cbindgen, which would add risk to the _integration proof_ that is the slice's whole
point. It is recorded as a **committed follow-up**, not optional.

## The §1 reading relied on (recorded)

A **user-entered PIN passphrase crossing the FFI inbound is consistent with §1.** §1 forbids raw
**key bytes** crossing the boundary; the PIN is **user input, not a key** — the Argon2id derivation
(PIN → PIN key) happens **in Rust**, and the derived keys + the vault key + per-record content keys
**never leave Rust** (they live in the in-Rust registry behind opaque handles). Across the FFI:
**handles, plaintext domain objects (the Entry record), and ciphertext** — and no key-shaped field
in any signature (the same discipline verified in `spikes/rn-nitro/SPIKE-REPORT.md`).

## Deferred / risk items (committed to track)

1. **Expo + prebuild + Nitro + Rust C-ABI wiring = the PRIMARY integration risk.** The spike
   validated Nitro on **bare RN 0.81.4**, not inside an Expo CNG app; the config-plugin / prebuild
   wiring of the C++ + `externalNativeBuild` + the per-ABI Rust staticlib is unproven and must be
   de-risked **first** (build-plan step 3, before the UI). Fallback: commit the prebuilt
   `android/`/`ios/` dirs (bare workflow), still app-integrated.
2. **16 KB ELF page alignment** for our `liblumicrypto.so`: prefer **NDK r28+** (defaults to
   16 KB-aligned output → item disappears); otherwise `-Wl,-z,max-page-size=16384` on our CMake
   target.
3. **`created_at` index hardening** (decision e) — core-owned SQLCipher over the index, pre-ship.
4. **Net-new, unspiked crypto:** **Argon2id** and the **XChaCha20-Poly1305 (24-byte nonce)** variant
   were **not** in the spike (which used ChaCha20-Poly1305 with a 12-byte nonce and no KDF) — both
   must be validated fresh in `lumi-vault` (step 1), with the §3 Argon2id cost floor
   (m=64 MiB / t=3 / p=1) **benchmarked on low-end Android** (ADR 0001 §3).
5. **Forward-compatibility:** the slice ships only the PIN-wrap; the vault row and record row must
   be versioned/shaped so the **recovery-key wrap**, the **biometric/OS-keystore copy**, and sync
   metadata slot in later **without reformatting persisted data**.
6. **Migration** of existing users' SQLCipher data (ADR 0001 §6) is out of slice scope but must
   not be painted into a corner by the slice's record format.

## References

- ADR 0003 — v1 UI + binding (RN + Nitro), validated.
- `spikes/rn-nitro/SPIKE-REPORT.md` — spike #1b GO (real arm64 round-trip, §1 intact).
- `docs/m1-vertical-slice-proposal.md` — the analysis + options behind these decisions.
- ADR 0001 §1 / §3 / §4 / §6 / §7 — the locked invariants this ADR implements (annotated where
  superseded).
