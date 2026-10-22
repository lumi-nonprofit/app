# M1 — Vertical-slice proposal (mood check-in, end-to-end through the production stack)

> **Note (2026-10-18):** Rewritten in Simplified Technical English on 2026-10-18; decisions and section numbering unchanged.
>
> **STATUS: COMPLETE (2026-06-15) — M1 shipped and verified end-to-end.** The foundational decisions
> are in [ADR 0004](adr/0004-m1-vertical-slice-foundational-decisions.md). This document stays as
> the _analysis + options_ behind them (the record of the reasons): module structure, storage engine,
> post-quantum timing, the `apps/` decision, and the `created_at` hardened-index follow-up.
>
> **Verified end-to-end chain (2026-06-15):** at-rest crypto (`core/lumi-vault`) → encrypted
> persistence (`core/lumi-store`) → unsafe C ABI (`core/lumi-ffi-cabi`) → RN↔Rust binding (Nitro
> `modules/lumi-vault`) → on-device mood check-in screen (`/m1-checkin`: captures → persists →
> survives a cold restart) → **green CI** (host Rust matrix on ubuntu/macos/windows + musl
> portability guard + JS typecheck/lint/jest). A re-check of the §1 FFI boundary found it clean
> (only handles / PIN input / plaintext records / record ids / ciphertext / error codes cross), and
> `panic=unwind` stays as it was.
>
> - **Date:** 2026-06-14
> - **Inputs read:** ADR 0001 (§1 invariant, §3 key hierarchy, §4 storage/crypto-shred, §5 wire
>   format, §6 migration, §7 monorepo, §14 tests), ADR 0002 (interop = stub only), ADR 0003 +
>   `spikes/rn-nitro/SPIKE-REPORT.md` (RN→Nitro→C++→Rust C ABI validated, GO; the 2 deferred
>   hygiene items), and the repo (`core/`, `src/`, `app.json`, tests).
> - **Method:** parallel repo digests + live crate-maturity research (versions verified on
>   crates.io / npm / the IETF data tracker, 2026-06-14), then adversarial review.

---

## 0. TL;DR — the decisions, recommended

| #     | Decision                                                   | Recommendation                                                                                                                                                                                                                                     | Already constrained by ADR 0001?                                                               |
| ----- | ---------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| **a** | Where the RN app, the Nitro binding, and the Rust core sit | **Extend the current root app.** Integrate the Nitro Hybrid Object **directly into the app (local Expo module), NOT a separate library package**. Put crypto in a new `core/lumi-vault` crate and the C ABI in a dedicated `unsafe` crate          | Partially — the §7 monorepo tree is CMP-shaped and explicitly "finalised at M3"                |
| **b** | Local encrypted storage                                    | **App-layer per-record AEAD for content** (the locked design) + a queryable index. Engine = **rusqlite-owned SQLite** (recommended) or **pure-Rust `redb`** (if the musl dev-loop matters most). SQLCipher only as **core-owned** defence-in-depth | **Yes** — §0/§3 lock "SQLite + app-layer per-record encryption (SQLCipher = defence-in-depth)" |
| **c** | X25519 + ML-KEM-768 (X-Wing) hybrid                        | **Keep the versioned envelope ready. Leave it out of M1.** Add one ADR line that pins the flip-on criteria. Off the slice's critical path entirely                                                                                                 | **Yes** — §3 says "Ship X25519-only"; `WrapAlg=2` already reserved "do not ship until audited" |
| **—** | `apps/` empty until M3 (+ spike #1)                        | **Run the slice in the current root app. Leave the new `apps/` dir empty until the M3 reshape.** This needs Anna's explicit decision either way                                                                                                    | Ratification line 89 — see §4                                                                  |

**The single genuinely new design decision is (a).** (b) and (c) are mostly _confirmations_ of
locks already in ADR 0001. This proposal re-verifies them against mid-2026 crate reality and
surfaces only the residual sub-choices. Each decision states that distinction honestly.

**Reconciliation note** (not a task item, but a flag for the ADR step). ADR 0001 still names the
binding as `uniffi-bindgen-react-native`/UniFFI throughout (lines 142–144, 226–227, 702). Its §7
`apps/` tree is CMP-shaped. ADR 0003 + spike #1b superseded this with **Nitro + a hand-written C ABI
(cbindgen)**. Fix 2 stale in-repo comments when the slice lands: `core/lumi-ffi/src/lib.rs:5-7`
(names UniFFI) and `core/lumi-core/Cargo.toml:6` (advertises "crypto" that does not exist in that
crate yet).

---

## 1. Foundational decisions

### (a) App / module structure — **the new decision**

**What is fixed already.** The production app is a **single Expo Router app at the repo root**
(`package.json` name `lumi-app`), and the Rust core is a separate cargo workspace at `core/`. The
app has **no `workspaces` key, no `apps/` dir and no `android/`/`ios/` dirs**: it is a CNG /
prebuild app with `expo-dev-client` + EAS configured. The monorepo tree of ADR 0001 §7
(`apps/<broad-surface>` …) is CMP-shaped and predates the D-rn ratification. The ADR explicitly
says it is _"finalised at the §2 sign-off + M3"_ (line 548). So the ADR does **not** pin the RN
app's path.

2 sub-questions: **(a1)** the package form of the Nitro binding, and **(a2)** the home of the Rust
crypto and the C ABI.

#### (a1) Nitro package form — separate library package vs app-integrated

The decisive factor is **SPIKE-REPORT deferred item 1** (release-APK dex duplicate-class). Root
cause, traced to source: the `create-react-native-library` template applies `com.facebook.react`
_inside the library module_ (`native-common/android/build.gradle:41`). RN's Gradle plugin in a
**library** runs RN codegen there. That codegen regenerates `com.facebook.fbreact.specs` /
`com.facebook.react.viewmanagers` into the library's own dex. The app's React Native **already
ships** these classes → `defined multiple times` at `:app:mergeDexRelease`.

(Upstream `react-native-builder-bob` #774, maintainer-reproduced, **still open** 2026-06-14. It
bites only at the _release_ dex-merge. That is exactly why the spike reached GO on the debug
dev-loop, but `assembleRelease` failed downstream.)

| Option                                                                                        | Dex item-1 verdict                                                                                                                                                                                     | Expo fit (CNG / RN 0.85.3)                                                                                                                                              | Solo-maintainability                                                                                                                                                                                   |
| --------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **1. Separate Nitro _library_ package** (the cra `--type nitro-module` layout the spike used) | **RECURS by default.** It needs a maintained gradle workaround (delete the `apply plugin "com.facebook.react"` block) against an open upstream bug. Re-verify the workaround on every RN/template bump | Works, but expects an installed package. A _local_ workspace package needs Expo monorepo autolinking. The Rust `staticlib`/CMake lives awkwardly inside a `node_module` | More parts for a one-app, one-consumer project. It has its own `package.json`/`podspec`/`gradle`/`CMake`, a publish-or-link lifecycle, and the autolinked-package-path trap that the spike already hit |
| **2. Hybrid Object integrated into the app** (local Expo module)                              | **DISAPPEARS by construction.** There is no library module ⇒ the app applies `com.facebook.react` once, as always ⇒ no second codegen pass ⇒ the duplicated specs never appear                         | Most Expo-native: a local Expo module uses Expo autolinking, survives `expo prebuild`, and uses the dev/EAS build the app already has                                   | Fewest parts. The Rust C-ABI crate sits beside the app and can graduate into `core/`. `nitrogen` runs exactly as validated in the spike                                                                |

**Recommendation: Option 2 — integrate the Hybrid Object directly into the app as a local Expo
module.** It resolves the spike's #1 deferred blocker _by construction_, not through a maintained
workaround. It is the lowest-surprise shape for this CNG app.

Carry over the spike's `LumiCrypto.nitro.ts` pattern, the C++ Hybrid Object,
`CMakeLists.additions.cmake`, and the `rust/lumi-ffi-cabi/` **FFI marshal structure** as the start
point for the app-integrated layout. (The crypto _content_ changes: Argon2id + XChaCha20-Poly1305
are new, see §2.1.) Keep the spike's `nitro-module` kit as **reference only**. It proved the
_mechanism_; we deliberately do not ship its _package form_.

**Honest caveat (the slice's primary integration risk):** the spike validated Nitro on **bare RN
0.81.4**, not in an Expo CNG app. The unproven step is the **Expo config-plugin / prebuild setup**
of the C++ code + `externalNativeBuild` + the per-ABI Rust `staticlib`. (An Expo+Nitro app that
works exists, but with Swift/OpenCV, not with a Rust C ABI + pure-C++ Hybrid Object.) If the
config-plugin proves fragile, the fallback is to commit the prebuilt `android/`/`ios/` dirs (bare
workflow, still Option 2). **Step 3 of the build plan must re-verify this on real Android first.**

**16 KB alignment (deferred item 2):** required only for _our_ `liblumicrypto.so`. Prefer **NDK
r28+** (its default output is 16 KB-aligned → the item disappears). Otherwise set
`target_link_options(<lib> PRIVATE -Wl,-z,max-page-size=16384)` on the app/local-module CMake
target. Either way it lives on the one CMake target we own.

#### (a2) Where the Rust crypto + C ABI live

`lumi-core` is deliberately **dependency-free + `forbid(unsafe)`**, so it builds in the
no-C-compiler musl dev-loop. Real crypto crates (curve25519/argon2 build scripts) and the `unsafe`
C ABI **cannot** go there without damage to that loop. Recommended split:

- **New crate `core/lumi-vault`**: the vetted at-rest crypto (Argon2id + XChaCha20-Poly1305 + HKDF
  - zeroize) + the vault/per-record-key tree + the in-Rust key registry. **Crypto-only**: it keeps
    `lumi-core` dep-free. (`lumi-core` remains the **only truly toolchain-free** crate: it builds in
    a no-C-compiler musl loop.) `lumi-vault` itself is **musl-green but NOT toolchain-free**. It
    cross-compiles to musl, but its `argon2`/`generic-array`/`libc` build scripts invoke a host `cc`.
    So it builds only where a C compiler is present (CI runners + this dev box), not in a truly
    no-cc loop.
- **Storage engine in a thin `core/lumi-store` crate** (or a feature-gated module that `lumi-vault`
  calls). It isolates the SQLite/`redb` dependency, so its C/musl consequences do not spread. See
  b1/b2 in §1(b) and the per-engine musl note in §2.1.
- **The C ABI in a dedicated `unsafe` crate.** Promote `spikes/rn-nitro/rust/lumi-ffi-cabi`: either
  _replace_ the `core/lumi-ffi` stub (and accept that this crate drops `forbid(unsafe)`), or add a
  new `core/lumi-ffi-cabi` so that `lumi-ffi` stays a safe facade. The C ABI **depends on
  `lumi-vault`** and only marshals (handles/pointers/CStr). It duplicates no crypto logic from the
  spike.
- **The musl dev-loop command becomes:** cross-build `lumi-core`/`lumi-crdt` (truly toolchain-free)
  and `lumi-vault` (musl-green, but its build scripts need a host `cc`) on musl. The bundled-SQLite
  crates (`lumi-store`, `lumi-ffi-cabi`) need a _musl_ C cross-compiler that we do not install. So
  the loop `--exclude`s them, and only the host/NDK toolchain tests them (the CI matrix uses the
  host target, not musl). Under b2 (`redb`) even `lumi-store` stays musl-green.

**Downstream implications of (a):** nobody creates an `apps/` dir (see §4). `core/` gains 2
crates. CI path-filters/excludes need a small update (§3). We re-point the persistence layer of the
current root app; we do not rewrite it.

---

### (b) Local encrypted storage — **mostly a confirmation of an ADR 0001 lock**

**What is already locked (not open):** ADR 0001 §0 (line 104) and §3 "Storage posture" (lines
388–390) lock this:

> _"all authoritative encryption is **app-layer per-record content keys + wrapped envelopes**;
> SQLCipher is **optional at-rest defence-in-depth, not the security boundary**."_

§4 (lines 432–439) names **crypto-shred** (destroy the per-record content key) as the **Article
17** erasure mechanism. So the _crypto model_ (per-record content keys under a vault key) is a
settled decision. The slice must implement it, not re-choose it.

The current app does the **opposite** of the locked design: `app.json:24-28` enables
`useSQLCipher`, and `src/db/connect.ts:23` sets the whole-DB key through `PRAGMA key` **from JS**.
That is a single-whole-DB-key model (no per-record keys, no per-record shred). It is **also** the
exact §1 violation that the rebuild exists to remove. So "keep what the app does now" is not an
option.

What is genuinely **open** for the slice:

- the **storage engine** for ciphertext + the queryable index;
- whether SQLCipher stays as defence-in-depth;
- who owns the DB connection.

| Dimension                                   | (A) SQLCipher whole-DB                                          | (B) plain SQLite + app-layer AEAD                       | (C) `redb` (pure-Rust) + app-layer AEAD                                                      |
| ------------------------------------------- | --------------------------------------------------------------- | ------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| Per-record keys + crypto-shred (Article 17) | **No** (one whole-DB key; only per-attached-_file_ granularity) | **Yes** (destroy the record's wrapped content key)      | **Yes**                                                                                      |
| Matches the ADR 0001 lock                   | No (it is the _defence-in-depth_ layer, not the boundary)       | **Yes** (this IS the locked design)                     | Yes (locked model, different engine)                                                         |
| Query/index on sensitive fields             | Full SQL (fields are plaintext in memory)                       | No (blobs opaque) — index plaintext metadata only       | No — only plaintext-key range/point scans                                                    |
| Builds in musl sandbox dev-loop             | No (C + crypto)                                                 | No (SQLite C; the AEAD itself is pure-Rust)             | **Yes — fully pure-Rust**                                                                    |
| §1 fit (keys never reach JS)                | rusqlite OK / **expo-sqlite VIOLATES** (JS sets PRAGMA key)     | **Best**                                                | **Best**                                                                                     |
| Maturity (mid-2026)                         | Highest                                                         | SQLite highest; AEAD = RustCrypto, already in the spike | `redb` 4.1.0 stable but younger, **no third-party audit**; **`sled` = beta/stalled, reject** |

Live versions (2026-06-14): `rusqlite` **0.40.1** (features `bundled-sqlcipher`,
`bundled-sqlcipher-vendored-openssl`); `redb` **4.1.0**; `sled` 0.34.7 (2021, eliminate).

On the crypto crates, be precise about what is _validated_ and what is _new_. The spike crate pins
`chacha20poly1305 0.10.1`, `x25519-dalek 2.0.1`, `hkdf 0.12.4`, `sha2 0.10.9`, `getrandom 0.2.17`
(current stable). **But it has no `argon2`, and it sealed with ChaCha20-Poly1305 (12-byte nonce),
not the XChaCha20-Poly1305 (24-byte nonce) that the §3 lock mandates.**

So the at-rest slice adds 2 **net-new** pieces that the spike did not cover. One is **Argon2id**
(`argon2 0.5.3`, current stable): the memory-hard KDF, with on-device cost/timing unproven. The
other is the **XChaCha20-Poly1305 variant**. Validate both fresh in `core/lumi-vault` (step 1);
only the X25519/AEAD _FFI marshal pattern_ carries over from the spike.

**Recommendation:** implement the **locked design (B)**: per-record content sealed with
XChaCha20-Poly1305 under a per-record content key, which the vault key wraps. Choose the engine
deliberately:

- **(b1) recommended: `rusqlite`-owned SQLite.** The Rust core owns the connection. The encrypted
  body is a blob column. A small set of **non-secret index columns** (record id, a coarse
  `created_at` for timeline order) stay queryable. Optionally wrap that DB in **SQLCipher for
  defence-in-depth, but with the _core_ as the issuer of `PRAGMA key`, never JS**. This both
  honours §1 and reuses the current SQLCipher investment. It keeps the team's SQLite/Drizzle muscle
  memory.
- **(b2) alternative: pure-Rust `redb`.** It is the _only_ engine that runs the **entire** at-rest
  slice (storage + crypto) in the fast musl/`cargo test` loop. It needs no C toolchain and no
  OpenSSL-for-Android cross-compile: a real dev-velocity/CI win. The cost: no SQL and no secondary
  indexes, so queries go through plaintext keys like `checkin/<ts>/<id>`. The store is also
  younger and has no audit.

**Fallback:** `rusqlite` + `bundled-sqlcipher`, **core-owned**. It approximates the shred at
per-attached-DB-file granularity: explicitly weaker (coarse, no per-record key). Flag it as a
compliance compromise if app-layer AEAD cannot ship in the slice window.

**The honest tradeoff to put in front of Anna:** app-layer per-record encryption makes sensitive
fields **opaque to SQL**. You trade queries on secrets for genuine per-record keys + crypto-shred +
a clean §1 boundary. For a mood check-in (fetch-by-id, order-by-time, payload never
server-filtered) that trade is cheap and correct. It is the design that ADR 0001 already locked.
**Residual question:** how much metadata can be plaintext-queryable without a breach of the privacy
bar? (A plaintext `created_at` reveals usage cadence even with the body sealed.)

**Downstream implications:** records no longer use `key.ts` (the single secure-store DB key). The
current SQLCipher DB needs a one-shot migration (ADR 0001 §6). That is _out of slice scope_, but
the slice's record format must be migration-compatible. Drizzle can continue to drive the plaintext
index schema while the core handles sealed content.

---

### (c) X25519 + ML-KEM-768 (X-Wing) hybrid — **confirmation: keep versioned-ready, not in M1**

**Already locked:** ADR 0001 §3 says **"Ship X25519-only"**. `core/lumi-sync-client/src/lib.rs:33-35`
already reserves `WrapAlg = 2` for the hybrid, with the comment _"do not ship until audited,"_ plus
`HEADER_RESERVED = 6` bytes and a length-flexible `wrapped_key`. So the hybrid is **purely additive
later, with no migration**. The mid-2026 evidence strongly confirms the hold:

| Component                                     | Version (2026-06-14)      | Pure-Rust      | Audit                                                                | Verdict                                                                                                                                                                             |
| --------------------------------------------- | ------------------------- | -------------- | -------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| X-Wing spec (`draft-connolly-cfrg-xwing-kem`) | **draft-10** (2026-03-02) | n/a            | n/a                                                                  | **Unadopted individual Internet-Draft**: not CFRG-adopted, no RFC, no formal status                                                                                                 |
| `x-wing` crate                                | **0.1.0-rc.0**            | Yes            | **never audited**                                                    | Pre-1.0. It **implements draft-06: 4 revisions behind**. **Draft-08 changed the decapsulation-key encoding and broke compatibility** ⇒ adoption now persists an orphaned key format |
| `ml-kem` (RustCrypto)                         | **0.3.2** (2026-05-10)    | Yes            | **never audited**                                                    | FIPS-203-aligned but API churn 6 weeks old, pre-1.0                                                                                                                                 |
| `libcrux-ml-kem` (verified)                   | 0.0.9                     | Yes            | formally verified, **but** IACR 2026/192 questioned the verification | Highest pedigree, still 0.0.x                                                                                                                                                       |
| `aws-lc-rs` / `pqclean`                       | —                         | **No (C/asm)** | aws-lc-rs FIPS 140-3                                                 | Off-limits (breaks pure-Rust + `forbid(unsafe)` core); also ships **X25519MLKEM768**, a _different_ construction from X-Wing                                                        |

**Recommendation: leave it out of M1.** It is **off the slice's critical path entirely**.
Enrolment/sync (M2) uses the KEM. The at-rest slice needs **no KEM**: the vault key wraps content
keys through symmetric AEAD key-wrap, not X25519. The "ship X25519-only, reserve the field" middle
path is **already done in the repo**; M1 needs no more code for it. The one zero-risk M1 action is
**documentation**: add an ADR line that pins the _flip-on criteria_ for M2. For example:

- (i) X-Wing reaches CFRG adoption/RFC, **or** you accept a non-standard combiner;
- (ii) `ml-kem`/`x-wing` reach an audited ≥1.0;
- (iii) re-verify that the crate tracks the then-current draft before you persist any key bytes.

One-line note worth a record: the PQ hybrid in wide use today is **X25519MLKEM768** (the TLS
combiner, which can get FIPS validation). It is a _different_ wire format from X-Wing. It is
relevant only if FIPS procurement ever becomes a requirement.

**Downstream implications:** none for the slice. The seam stays exactly as shipped.

---

## 2. The vertical slice, scoped precisely

**Goal (a thin end-to-end skeleton):** one real feature end-to-end through the **production**
stack. Capture a mood check-in `{mood, intensity, note}` → **encrypt at rest with the real vault /
per-record-key scheme** → persist locally → read back → decrypt → render. (Vetted crates, never
hand-rolled.) The core can then grow _along_ a proven spine.

**What the slice REUSES (almost everything) and what it ADDS (only the crypto spine):**

| Concern                              | Reuse (exists today)                                                                              | Add                                                                                                                                             |
| ------------------------------------ | ------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| Domain model `{mood,intensity,note}` | `Entry`/`CheckinDraft`, `MoodId`/`Intensity` enums, `MOODS` (`src/model.ts:12,14,30-39,84-121`)   | —                                                                                                                                               |
| Capture UI                           | `Step1/Step2/ConfirmScreen` + the expo-router modal stack (`app/checkin/*`)                       | —                                                                                                                                               |
| Read-back + render                   | `useEntries`, `MoodShape`, the DS                                                                 | —                                                                                                                                               |
| Persistence shell                    | Drizzle schema, repo `insertEntry`/`listEntries` (`src/db/repo.ts`), `DbProvider` version-counter | **Rust-core seal/open under the repo API**                                                                                                      |
| At-rest crypto                       | —                                                                                                 | **Replace** SQLCipher PRAGMA-key (`connect.ts:23`) + secure-store key (`key.ts`) **with Rust per-record content keys (handle-based, §1-clean)** |
| Validators                           | `asEntry` (`src/db/backup.ts:47-68`) after decrypt                                                | —                                                                                                                                               |
| Tests                                | `connectDb` mock → better-sqlite3 (`test/setup.ts:15`); `app.test.tsx:82-89` check-in round-trip  | **mock the Nitro Hybrid Object**                                                                                                                |

The only genuinely new runtime path is the swap of the SQLCipher transparent-encryption persistence
for a Rust-core encrypt/decrypt path. The other new piece is the Nitro integration in the Expo
build.

### 2.1 Minimal Rust core API (in `core/lumi-vault`, built test-first)

Just enough to exercise the real per-record-key scheme at rest. **No KEM, no X25519** (those are M2
enrolment/sync). At rest needs Argon2id + XChaCha20-Poly1305 + HKDF + zeroize only.

```text
// core/lumi-vault — vetted crates only (argon2 [NEW], chacha20poly1305, hkdf, sha2, zeroize); never hand-rolled.
unlock_vault(pin: &str) -> Result<VaultHandle>
    // Argon2id over the PIN -> PIN key; on first run: generate a random VAULT key,
    // wrap it under the PIN key, persist the wrapped vault key. On unlock: unwrap it.
    // The vault key + all derived keys stay in an in-Rust registry behind the opaque handle.
    // Argon2id cost = ADR 0001 §3 floor (m=64MiB, t=3, p=1), auto-tuned/benchmarked on
    // low-end Android in M1 (§3 line 354) — a recommended starting point, not a fixed decision.
put_checkin(h: VaultHandle, record_json: &str) -> Result<RecordId>
    // record_json = the Entry payload (representatively {mood,intensity,note}; the reused Step2
    // screen also yields words/tags/time, so the blob carries the full Entry — see §2.3).
    // generate a per-record CONTENT key; seal the payload with XChaCha20-Poly1305 [NEW variant:
    // 24-byte nonce, vs the spike's 12-byte ChaCha20-Poly1305]; AAD = record_id||format_version (§3);
    // wrap the content key under the vault key; persist (record_id, wrapped_content_key, nonce, ciphertext, index meta).
list_checkins(h: VaultHandle) -> Result<Vec<Checkin>>
    // read rows, unwrap each content key with the vault key, open each payload, return plaintext records.
// (stretch, proves Art. 17) shred_checkin(h, record_id) -> destroy the wrapped content key -> record unreadable.
```

- **Built test-first** (ADR 0001 §14 frames the Jest suite as the behavioural spec that the core
  must satisfy). Host `cargo test` covers: the seal→open round-trip; wrong PIN fails closed;
  **crypto-shred makes a record permanently unreadable**; **NIST KAT** vectors for the AEAD/KDF.
- **Where it lives:** `core/lumi-vault` (keeps `lumi-core` dep-free). **It reuses the spike's FFI
  marshal pattern + the X25519/ChaCha20/HKDF crates. But the Argon2id KDF and the
  XChaCha20-Poly1305 (24-byte-nonce) variant are NEW; validate them fresh in step 1. They were never
  in the spike.** All crate pins are at current stable (2026-06-14, verified).
- **Where storage I/O lives (resolves the a2 ambiguity):** keep `lumi-vault` _crypto-only_. Put the
  engine binding in a thin **`core/lumi-store`** crate (or a feature-gated module) that
  `lumi-vault` calls. Musl consequence per engine: under **b1 (`rusqlite`-SQLite)** `lumi-store` is
  C-dependent → `--exclude` it (and the integration tests of `lumi-vault`) from the musl loop. Under
  **b2 (`redb`)** the whole at-rest stack stays musl-green.

### 2.2 Nitro spec surface (handles only — §1 discipline)

A pure-C++ Hybrid Object that mirrors the validated spike pattern. **No key/secret bytes in any
signature**: only an opaque handle, the plaintext domain fields inbound, and the record id /
plaintext records outbound. The PIN crosses **inbound** as user-entered passphrase text (not a
stored key). Argon2id runs in Rust. The derived keys and the vault key **never leave Rust**.

```ts
// LumiVault.nitro.ts — HybridObject<{ ios:'c++', android:'c++' }>
interface LumiVault extends HybridObject {
  unlockVault(pin: string): VaultHandle; // -> { handle: number }   (opaque)
  putCheckin(handle: number, recordJson: string): string; // recordJson = serialized Entry -> recordId
  listCheckins(handle: number): string[]; // -> serialized Entry records (plaintext domain objects)
}
```

The record crosses as a **serialized plaintext domain object**: the Entry, representatively
`{mood,intensity,note}`, plus the `words`/`tags`/`time` that the reused screens produce. This is
consistent with §1 (plaintext domain objects _do_ cross; only key bytes do not). A structured Nitro
record type instead of a JSON string is equally fine. The point is that no key-shaped field
appears.

> **§1 check to enforce at step 6** (mirrors the SPIKE-REPORT check): grep the spec + C++ for
> `secret|private|key bytes`. Nothing key-shaped can appear in any signature; the vault/content
> keys live only in the Rust registry behind `handle`. **Flag for Anna's confirmation:** the
> interpretation that a _user-entered PIN passphrase_ that crosses inbound is consistent with §1
> ("never raw key _bytes_"; the PIN is input, derived to a key inside Rust). Recommended: yes, but
> it is a §1 interpretation that deserves her explicit sign-off.

### 2.3 At-rest record format + where per-record keys land

Per chosen engine (b1 `rusqlite`-SQLite shown; `redb` stores the same fields keyed by
`checkin/<ts>/<id>`):

```text
record row:
  record_id        : 16 opaque random bytes (NEVER time-derived — removes the Date.now()-prefix leak, §4)
  hlc_stamp        : SEPARATE HLC stamp field for ordering (lumi-crdt HLC exists) — distinct from record_id
  wrapped_content_key : content key sealed under the VAULT key      <- per-record key lands HERE
  nonce            : 24-byte XChaCha20-Poly1305 nonce
  ciphertext       : AEAD-sealed Entry payload {mood,intensity,note,words,tags,time}  (AAD = record_id||version)
  created_at       : plaintext index column for timeline ordering   <- the queryability/leakage knob
vault row (singleton):
  format_version    : so the row can gain fields without reformatting persisted vaults
  wrapped_vault_key_pin : VAULT key wrapped under the Argon2id PIN key
  // forward-compat (NOT in the slice): a second wrapped_vault_key_recovery and a biometric/OS-keystore
  // copy (ADR §3) must be addable later WITHOUT reformatting existing vaults — shape the row for that now.
```

Per-record content keys land in `wrapped_content_key`. **Crypto-shred = delete that one wrapped
key** (the row's ciphertext becomes permanently unrecoverable: the §4 Article 17 mechanism). The
layout deliberately mirrors the §5 _wire_ envelope (`record_id`, `wrapped_key`, `stamp`,
`ciphertext` as distinct fields; the id never embeds the clock). So at-rest and on-wire stay
structurally aligned for M2 sync.

**Forward-compatibility discipline (mirrors the §4-item-7 migration caveat):** the slice ships only
the PIN-wrap. But version and shape both the vault row and the record row for later additions. The
recovery-key wrap, the biometric copy, and sync metadata must slot in later without a reformat of
persisted data.

### 2.4 Minimal accessible RN UI

**Reuse the current check-in screens.** They already carry the a11y commitments that justified the
choice to keep RN (109 annotations across 23 files; `react-native-a11y/all` lint-gated). The slice
must honour these, and gets them for free by reuse:

- **colour + shape** mood encoding (`MoodShape`, never colour alone);
- **≥44 pt** touch targets;
- `role`/`state`/`hint` on every interactive element;
- hint-explained disabled states;
- a **reduce-motion gate** on any animation.

The render-back leg uses `useEntries` + `MoodShape` exactly as the Confirm/Home cards do today.

### 2.5 Build setup that carries the deferred hygiene

- **Structure chosen to avoid the release-dex recurrence:** an app-integrated Hybrid Object (local
  Expo module) means no library module. So the `:app:mergeDexRelease` duplicate-class issue
  **cannot occur** (decision a1).
- **16 KB alignment:** pin **NDK r28+** (preferred; removes the item) or set
  `-Wl,-z,max-page-size=16384` on our CMake target.
- **Rust libs:** `cargo-ndk` builds `liblumi_*` for `arm64-v8a` + `x86_64` into the app/module
  `cpp/`. `nitrogen` generates the C++ spec + `+autolinking.cmake` as in the spike. An **Expo
  config plugin** applies the native setup at `expo prebuild` (the unproven step: step 3).
- `reactNativeArchitectures=arm64-v8a,x86_64` (carried from the spike).

---

## 3. Ordered build plan

Each step is independently verifiable. **Deliberate deviation from the brief's nominal order.**
The brief orders the Rust core, Nitro, the RN shell, the wire end-to-end and the on-device check.
The Nitro/on-device _smoke_ moves ahead of the UI step (step 3, before step 4's screen). The
reason: the Expo+Nitro+Rust integration is the **primary integration risk**, and it must fail fast
if it fails at all.

So "on-device verify" is 2 distinct checks. The **step-3 binding/dex sentinel** asks: does the
Hybrid Object register, and does `assembleRelease` clear the dex-merge? The **step-5 full-slice
sentinel** asks: does a real check-in round-trip encrypted?

The step-3 release-dex result is also the **first empirical confirmation of the Option-2 "dex
disappears by construction" claim. Until step 3 passes on the real Expo CNG build, that resolution
is a prediction, not a proven fact.**

| Step  | Work                                                                                                                                                          | Verification                                                                                                                                                                                            |
| ----- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **0** | (plan gate) Anna's decisions on §1 + the `apps/` decision (§4)                                                                                                | this doc signed off                                                                                                                                                                                     |
| **1** | `core/lumi-vault` crypto API (`unlock_vault`/`put_checkin`/`list_checkins`/`shred`), **test-first**                                                           | host `cargo test`: round-trip, wrong-PIN fails, shred makes a record unreadable, NIST KATs (AEAD/KDF)                                                                                                   |
| **2** | C ABI crate (promote `lumi-ffi-cabi`; depends on `lumi-vault`; `panic=abort`; cbindgen; handle registry)                                                      | host `cargo test` C-ABI round-trip; cbindgen header generated                                                                                                                                           |
| **3** | Nitro binding **app-integrated** + Expo config plugin; build a dev client (**the primary integration risk — do this before UI**)                              | on-device debug: `LumiVault` registers (logcat `Successfully registered HybridObject`), a smoke round-trip returns; `assembleRelease` reaches dex-merge **without** the item-1 collision                |
| **4** | RN app shell + the one screen: repoint persistence from `connectDb`/SQLCipher to the Nitro vault under the repo API (`insertEntry`/`listEntries` → seal/open) | the current `app.test.tsx:82-89` check-in round-trip passes against the new path (with the Nitro mock)                                                                                                  |
| **5** | Wire e2e + on-device verify                                                                                                                                   | a real check-in captured on the Pixel persists **encrypted** (per-record key), reads back, decrypts, renders with `MoodShape`; emit `LUMI_SLICE_RESULT {"pass":true,...}` (echoes the spike's sentinel) |
| **6** | §1 + CI                                                                                                                                                       | §1 grep clean; CI updated (below) green                                                                                                                                                                 |

**CI + workspace fit:** the 2 new C-dependent crates compile on the current full-toolchain matrix
(`ci.yml`: ubuntu/macos/windows, host target). The **musl sandbox loop must `--exclude lumi-vault`
and the C-ABI crate** (or, if you choose b2, `redb` keeps `lumi-vault` musl-buildable). There are
**no path filters** in CI today. To add them is a cheap hygiene win as the slice broadens the tree
(run `core/` jobs on `core/**`, `js` on `src/**`/`app/**`).

The Jest suite keeps the single `connectDb` mock and **adds a Nitro Hybrid Object mock**. That mock is a thin JS reference
implementation of seal/open, or an identity for round-trip tests. No test restructure is needed, because `connectDb`
is the only native touch-point and every repo function takes `db` as a parameter.

**"Slice done" =** on a real Pixel, the Rust core seals a mood check-in from the current UI with a
**per-record content key**. The core persists it, reads it back, decrypts it, and renders it
(colour+shape). Also: **§1 verified** (no key bytes cross; registry handles only). **Crypto-shred**
demonstrably destroys a single record. The current check-in round-trip test passes against the new
core path. The core can then grow (measurements, WHO-5, recovery code, biometric release, sync)
_along_ this proven spine.

---

## 4. Open questions / risks for Anna

**★ HEADLINE DECISION NEEDED — the slice does real M1 work in the RN app, which the milestone plan
appears to defer.** ADR 0001 ratification line 89: _"`apps/` stays **empty** until spike #1 passes
and M3."_ (Spike #1b passed GO 2026-06-14, so the spike precondition holds; the M3 one does not.)

**The key fact that dissolves most of this:** _there is currently no `apps/` directory at all_. The
production RN app lives at the **repo root**. `apps/` is only a node in the _future_ monorepo tree
of ADR §7 (line 535), never created. So "`apps/` stays empty" is a constraint about a directory
that does not exist yet, not about the current root app. 3 readings; Anna must pick:

- **(A) recommended: run the slice in the current root app and do NOT create `apps/` at all this
  milestone.** (It is "kept empty" only in the sense of "not created".) This delivers a real
  vertical slice through the production stack. It defers the §7 monorepo reshape (and the
  CMP-versus-RN directory question) to M3 exactly as planned. The contradiction largely dissolves:
  the slice touches the root app + `core/`, never `apps/`.
- **(B) create `apps/mobile` now** (move the root app in): a genuine deviation from the plan. It
  needs an explicit override and front-loads the M3 reshape into M1.
- **(C) keep the slice core-only** (no app this milestone). But that abandons the "through the
  production stack" intent of the end-to-end skeleton; not recommended.

Other open questions / risks:

1. **Expo + prebuild + Nitro + Rust C-ABI is unproven** (the spike was bare RN 0.81.4). The
   config-plugin setup is the slice's primary integration risk; de-risk it first (build-plan step
   3). Fallback: commit prebuilt `android/`/`ios/` (bare workflow), still app-integrated.
2. **Storage engine residual (b1 or b2):** SQL ergonomics + reuse (`rusqlite`) compared with a
   fully musl-testable pure-Rust loop (`redb`, younger, no audit). Anna's call on the audit-gap
   tolerance and on how much the in-sandbox dev loop matters.
3. **Index leakage budget:** which metadata can be plaintext-queryable? (A plaintext `created_at`
   reveals usage cadence even with the body sealed.) This sets the privacy/query line.
4. **§1 interpretation:** confirm that a user-entered **PIN passphrase that crosses inbound** is
   consistent with the §1 invariant. Rust derives the key from it; no key bytes ever leave Rust.
5. **Test double for Nitro:** is a JS reference seal/open mock acceptable? With it, the RTL flows
   continue to run headless (next to the better-sqlite3 mock).
6. **HLC order is a behavioural change** (ADR 0001 §4: HLC replaces the `Date.now()`-prefix order).
   Some current tests assert creation order; expect to update those assertions.
7. **Migration of the SQLCipher data of current users** (ADR 0001 §6) is **out of slice scope**.
   But the slice's record format must be migration-compatible (do not paint M1 into a corner).
8. **Stale-doc cleanup** to bundle with the slice: `core/lumi-ffi/src/lib.rs:5-7` (UniFFI →
   Nitro/cbindgen) and `core/lumi-core/Cargo.toml:6` ("crypto" not yet present).
9. **ADR reconciliation (later step):** ADR 0001 still describes UniFFI + a CMP-shaped `apps/`.
   Once Anna decides the above, fold the decisions + the 0001↔0003 reconciliation into ADR(s).

---

**Recommendations, not decisions.** I have built nothing, and I start nothing until Anna decides on
§1 (a/b/c) and the headline `apps/` question. After her decision, these become ADR(s). Then M1
implementation begins test-first at build-plan step 1.
