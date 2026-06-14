# M1 — Vertical-slice proposal (mood check-in, end-to-end through the production stack)

> **STATUS: DECIDED (2026-06-14) — ratified; foundational decisions recorded in
> [ADR 0004](adr/0004-m1-vertical-slice-foundational-decisions.md).** This document is retained as
> the *analysis + options* behind those decisions (the reasoning record); the ratified choices —
> module structure, storage engine, post-quantum timing, the `apps/` ruling, and the `created_at`
> hardening follow-up — live in ADR 0004. **Implementation has not started**; build-plan step 1
> (test-first `lumi-vault` crypto) is the next step, after Anna reviews ADR 0004.
>
> - **Date:** 2026-06-14
> - **Inputs read:** ADR 0001 (§1 invariant, §3 key hierarchy, §4 storage/crypto-shred,
>   §5 wire format, §6 migration, §7 monorepo, §14 tests), ADR 0002 (interop = stub only),
>   ADR 0003 + `spikes/rn-nitro/SPIKE-REPORT.md` (RN→Nitro→C++→Rust C ABI validated, GO;
>   the two deferred hygiene items), and the repo (`core/`, `src/`, `app.json`, tests).
> - **Method:** parallel repo digests + live crate-maturity research (versions verified on
>   crates.io / npm / IETF datatracker, 2026-06-14), then adversarial review.

---

## 0. TL;DR — the decisions, recommended

| # | Decision | Recommendation | Already constrained by ADR 0001? |
|---|---|---|---|
| **a** | Where the RN app, the Nitro binding, and the Rust core sit | **Extend the existing root app**; integrate the Nitro Hybrid Object **directly into the app (local Expo module), NOT a separate library package**; crypto in a new `core/lumi-vault` crate + the C ABI in a dedicated `unsafe` crate | Partially — §7 monorepo tree is CMP-shaped and explicitly "finalised at M3" |
| **b** | Local encrypted storage | **App-layer per-record AEAD for content** (the locked design) + a queryable index; engine = **rusqlite-owned SQLite** (recommended) or **pure-Rust redb** (if the musl dev-loop matters most); SQLCipher only as **core-owned** defence-in-depth | **Yes** — §0/§3 lock "SQLite + app-layer per-record encryption (SQLCipher = defence-in-depth)" |
| **c** | X25519 + ML-KEM-768 (X-Wing) hybrid | **Keep the versioned envelope ready; do NOT include in M1.** Add one ADR line pinning the flip-on criteria. Off the slice's critical path entirely | **Yes** — §3 says "Ship X25519-only"; `WrapAlg=2` already reserved "do not ship until audited" |
| **—** | `apps/` empty until M3 (+ spike #1) | **Run the slice in the existing root app; leave the new `apps/` dir empty until the M3 reshape.** Needs Anna's explicit ruling either way | Ratification line 89 — see §4 |

**The single genuinely-new design decision is (a).** (b) and (c) are mostly *confirmations* of
locks already in ADR 0001 — this proposal re-verifies them against mid-2026 crate reality and
surfaces only the residual sub-choices. That distinction is called out honestly per decision.

**Reconciliation note (not a task item, but flag for the ADR step):** ADR 0001 still names the
binding as `uniffi-bindgen-react-native`/UniFFI throughout (lines 142–144, 226–227, 702) and its
§7 `apps/` tree is CMP-shaped; ADR 0003 + spike #1b superseded this with **Nitro + a hand-written
C ABI (cbindgen)**. Two stale in-repo comments should be fixed when the slice lands:
`core/lumi-ffi/src/lib.rs:5-7` (names UniFFI) and `core/lumi-core/Cargo.toml:6` (advertises
"crypto" that doesn't exist in that crate yet).

---

## 1. Foundational decisions

### (a) App / module structure — **the new decision**

**What's fixed already.** The production app is a **single Expo Router app at the repo root**
(`package.json` name `lumi-app`; **no `workspaces` key, no `apps/` dir, no `android/`/`ios/`
dirs** — it's a CNG / prebuild app with `expo-dev-client` + EAS configured). The Rust core is a
separate cargo workspace at `core/`. ADR 0001 §7's monorepo tree (`apps/<broad-surface>` …) is
CMP-shaped, predates the D-rn ratification, and is explicitly *"finalised at the §2 sign-off +
M3"* (line 548) — so the RN app's path is **not** pinned by the ADR.

Two sub-questions: **(a1)** how the Nitro binding is packaged, and **(a2)** where the Rust crypto
and C ABI live.

#### (a1) Nitro packaging — separate library package vs app-integrated

The decisive factor is **SPIKE-REPORT deferred item 1** (release-APK dex duplicate-class). Root
cause, traced to source: the `create-react-native-library` template applies `com.facebook.react`
*inside the library module* (`native-common/android/build.gradle:41`). Applying RN's Gradle plugin
in a **library** runs RN codegen there, regenerating `com.facebook.fbreact.specs` /
`com.facebook.react.viewmanagers` into the library's own dex — classes the app's React Native
**already ships** → `defined multiple times` at `:app:mergeDexRelease`. (Upstream
`react-native-builder-bob` #774, maintainer-reproduced, **still open** 2026-06-14; it bites only at
*release* dex-merge, which is exactly why the spike reached GO on the debug dev-loop but
`assembleRelease` failed downstream.)

| Option | Dex item-1 verdict | Expo fit (CNG / RN 0.85.3) | Solo-maintainability |
|---|---|---|---|
| **1. Separate Nitro *library* package** (the cra `--type nitro-module` layout the spike used) | **RECURS by default** — needs a maintained gradle workaround (delete the `apply plugin "com.facebook.react"` block) against an open upstream bug, re-verified on every RN/template bump | Works, but expects an installed package; a *local* workspace pkg needs Expo monorepo autolinking, and the Rust staticlib/CMake lives awkwardly inside a `node_module` | More moving parts (own package.json/podspec/gradle/CMake, publish-or-link lifecycle, the autolinked-package-path footgun the spike already hit) for a one-app, one-consumer project |
| **2. Hybrid Object integrated into the app** (local Expo module) | **DISAPPEARS by construction** — no library module ⇒ `com.facebook.react` applied once (by the app, as always) ⇒ no second codegen pass ⇒ the duplicated specs are never generated | Most Expo-native: a local Expo module autolinks, survives `expo prebuild`, uses the dev/EAS build the app already has | Fewest moving parts; the Rust C-ABI crate sits beside the app and can graduate into `core/`; `nitrogen` runs exactly as validated in the spike |

**Recommendation: Option 2 — integrate the Hybrid Object directly into the app as a local Expo
module.** It resolves the spike's #1 deferred blocker *by construction* rather than by a maintained
workaround, and it's the lowest-surprise shape for this CNG app. Carry over the spike's
`LumiCrypto.nitro.ts` pattern, the C++ Hybrid Object, `CMakeLists.additions.cmake`, and the
`rust/lumi-ffi-cabi/` **FFI-marshalling structure** as the starting point for the app-integrated
layout (the crypto *content* changes — Argon2id + XChaCha20-Poly1305 are new, see §2.1); keep the
spike's `nitro-module` kit as **reference only** (it proved the *mechanism*; we're deliberately not
shipping its *packaging*).

**Honest caveat (the slice's primary integration risk):** the spike validated Nitro on **bare RN
0.81.4**, not inside an Expo CNG app. The unproven step is the **Expo config-plugin / prebuild
wiring** of the C++ + `externalNativeBuild` + the per-ABI Rust staticlib (a working Expo+Nitro app
exists, but with Swift/OpenCV, not a Rust C ABI + pure-C++ Hybrid Object). If the config-plugin
proves fragile, the fallback is committing the prebuilt `android/`/`ios/` dirs (bare workflow,
still Option 2). **This is what step 3 of the build plan must re-verify on real Android first.**

**16 KB alignment (deferred item 2):** required only for *our* `liblumicrypto.so`. Prefer **NDK
r28+** (defaults to 16 KB-aligned output → the item disappears); otherwise
`target_link_options(<lib> PRIVATE -Wl,-z,max-page-size=16384)` on the app/local-module CMake
target. Either way it lives on the one CMake target we own.

#### (a2) Where the Rust crypto + C ABI live

`lumi-core` is deliberately **dependency-free + `forbid(unsafe)`** so it builds in the no-C-compiler
musl dev-loop. Real crypto crates (curve25519/argon2 build scripts) and the `unsafe` C ABI **cannot**
go there without poisoning that loop. Recommended split:

- **New crate `core/lumi-vault`** — the vetted at-rest crypto (Argon2id + XChaCha20-Poly1305 +
  HKDF + zeroize) + the vault/per-record-key tree + the in-Rust key registry. **Crypto-only** —
  keeps `lumi-core` dep-free (the crisis logic stays musl-green), and stays musl-green *itself*
  except for its storage-integration tests.
- **Storage engine in a thin `core/lumi-store` crate** (or a feature-gated module `lumi-vault`
  calls) — isolates the SQLite/redb dependency so its C/musl consequences don't spread (see b1/b2
  in §1(b) and the per-engine musl note in §2.1).
- **The C ABI in a dedicated `unsafe` crate** (promote `spikes/rn-nitro/rust/lumi-ffi-cabi` →
  either *replace* the `core/lumi-ffi` stub, accepting that this crate drops `forbid(unsafe)`, or a
  new `core/lumi-ffi-cabi` so `lumi-ffi` stays a safe facade). The C ABI **depends on `lumi-vault`**
  and only marshals (handles/pointers/CStr) — no crypto logic duplicated from the spike.
- **musl dev-loop command becomes:** test `lumi-core`/`lumi-crdt` (and `lumi-vault`'s pure-crypto
  unit tests) on musl as today; test the C-dep crates (`lumi-store` under b1, the C-ABI crate) on a
  full toolchain (CI already does this — the matrix uses the host toolchain, not musl). The sandbox
  loop `--exclude`s the C-dep crates; under b2 (redb) even `lumi-store` stays musl-green.

**Downstream implications of (a):** no `apps/` dir is created (see §4); `core/` gains 2 crates;
CI path-filters/excludes need a small update (§3); the existing root app's persistence layer is
repointed, not rewritten.

---

### (b) Local encrypted storage — **mostly a confirmation of an ADR 0001 lock**

**What's already locked (not open):** ADR 0001 §0 (line 104) and §3 "Storage posture" (lines
388–390) lock *"all authoritative encryption is **app-layer per-record content keys + wrapped
envelopes**; SQLCipher is **optional at-rest defence-in-depth, not the security boundary**."* §4
(lines 432–439) names **crypto-shredding** (destroy the per-record content key) as the **Art. 17**
erasure mechanism. So the *crypto model* — per-record content keys under a vault key — is decided;
the slice must implement it, not re-choose it.

The current app does the **opposite** of the locked design: `app.json:24-28` enables
`useSQLCipher`, and `src/db/connect.ts:23` sets the whole-DB key via `PRAGMA key` **from JS** —
which is both a single-whole-DB-key model (no per-record keys, no per-record shredding) **and** the
exact §1 violation the rebuild exists to remove. So "keep doing what the app does" is not an option.

What's genuinely **open** for the slice is the **storage engine** for ciphertext + the queryable
index, whether SQLCipher stays as defence-in-depth, and who owns the DB connection.

| Dimension | (A) SQLCipher whole-DB | (B) plain SQLite + app-layer AEAD | (C) redb (pure-Rust) + app-layer AEAD |
|---|---|---|---|
| Per-record keys + crypto-shredding (Art. 17) | **No** (one whole-DB key; only per-attached-*file* granularity) | **Yes** (destroy the record's wrapped content key) | **Yes** |
| Matches the ADR 0001 lock | No (it's the *defence-in-depth* layer, not the boundary) | **Yes** (this IS the locked design) | Yes (locked model, different engine) |
| Query/index on sensitive fields | Full SQL (fields are plaintext in memory) | No (blobs opaque) — index plaintext metadata only | No — only plaintext-key range/point scans |
| Builds in musl sandbox dev-loop | No (C + crypto) | No (SQLite C; the AEAD itself is pure-Rust) | **Yes — fully pure-Rust** |
| §1 fit (keys never reach JS) | rusqlite OK / **expo-sqlite VIOLATES** (JS sets PRAGMA key) | **Best** | **Best** |
| Maturity (mid-2026) | Highest | SQLite highest; AEAD = RustCrypto, already in the spike | redb 4.1.0 stable but younger, **no third-party audit**; **sled = beta/stalled, reject** |

Live versions (2026-06-14): rusqlite **0.40.1** (features `bundled-sqlcipher`,
`bundled-sqlcipher-vendored-openssl`); redb **4.1.0**; sled 0.34.7 (2021, eliminate). On the
crypto crates, be precise about what is *validated* vs *new*: the spike crate pins
`chacha20poly1305 0.10.1`, `x25519-dalek 2.0.1`, `hkdf 0.12.4`, `sha2 0.10.9`, `getrandom 0.2.17`
(current stable) — **but it has no `argon2`, and it sealed with ChaCha20-Poly1305 (12-byte nonce),
not the XChaCha20-Poly1305 (24-byte nonce) the §3 lock mandates.** So the at-rest slice adds two
**net-new, unspiked** pieces: **Argon2id** (`argon2 0.5.3`, current stable — the memory-hard KDF,
on-device cost/timing unproven) and the **XChaCha20-Poly1305 variant**. Both must be validated
fresh in `core/lumi-vault` (step 1); only the X25519/AEAD *FFI-marshalling pattern* carries over
from the spike.

**Recommendation:** implement the **locked design (B)** — per-record content sealed with
XChaCha20-Poly1305 under a per-record content key, wrapped by the vault key — and choose the engine
deliberately:

- **(b1) recommended: rusqlite-owned SQLite.** The Rust core owns the connection; the encrypted
  body is a blob column; a small set of **non-secret index columns** (record id, a coarse
  `created_at` for timeline ordering) stay queryable. Optionally wrap that DB in **SQLCipher for
  defence-in-depth — but with the *core* issuing `PRAGMA key`, never JS** (this both honours §1 and
  reuses the existing SQLCipher investment). Keeps the team's SQLite/Drizzle muscle memory.
- **(b2) alternative: pure-Rust redb.** The *only* engine that runs the **entire** at-rest slice
  (storage + crypto) inside the fast musl/`cargo test` loop with no C toolchain and no
  OpenSSL-for-Android cross-compile — a real dev-velocity/CI win — at the cost of no SQL/secondary
  indexes (queries must be encoded into plaintext keys like `checkin/<ts>/<id>`) and a younger,
  unaudited store.

**Fallback:** rusqlite + `bundled-sqlcipher` **core-owned**, approximating shredding at
per-attached-DB-file granularity — explicitly weaker (coarse, no per-record key); flag as a
compliance compromise if app-layer AEAD can't ship in the slice window.

**The honest tradeoff to put in front of Anna:** app-layer per-record encryption makes sensitive
fields **opaque to SQL** — you trade queryability-on-secrets for genuine per-record keys +
crypto-shredding + a clean §1 boundary. For a mood check-in (fetch-by-id, order-by-time, payload
never server-filtered) that trade is cheap and correct, and it's the design ADR 0001 already
locked. **Residual question:** how much metadata may be plaintext-queryable without breaching the
privacy bar (a plaintext `created_at` reveals usage cadence even with the body sealed)?

**Downstream implications:** `key.ts` (the single secure-store DB key) is superseded for records;
the existing SQLCipher DB needs a one-shot migration (ADR 0001 §6 — *out of slice scope*, but the
slice's record format must be migration-compatible); Drizzle can continue to drive the plaintext
index schema while the core handles sealed content.

---

### (c) X25519 + ML-KEM-768 (X-Wing) hybrid — **confirmation: keep versioned-ready, not in M1**

**Already locked:** ADR 0001 §3 says **"Ship X25519-only"**; `core/lumi-sync-client/src/lib.rs:33-35`
already reserves `WrapAlg = 2` for the hybrid with the comment *"do not ship until audited,"* plus
`HEADER_RESERVED = 6` bytes and a length-flexible `wrapped_key` — so the hybrid is **purely
additive later, with no migration**. The mid-2026 evidence strongly confirms holding:

| Component | Version (2026-06-14) | Pure-Rust | Audit | Verdict |
|---|---|---|---|---|
| X-Wing spec (`draft-connolly-cfrg-xwing-kem`) | **draft-10** (2026-03-02) | n/a | n/a | **Unadopted individual Internet-Draft** — not CFRG-adopted, no RFC, "no formal standing" |
| `x-wing` crate | **0.1.0-rc.0** | Yes | **never audited** | Pre-1.0; **implements draft-06 — 4 revisions behind**, and **draft-08 made a breaking decap-key encoding change** ⇒ adopting now persists an orphaned key format |
| `ml-kem` (RustCrypto) | **0.3.2** (2026-05-10) | Yes | **never audited** | FIPS-203-aligned but API churn 6 weeks old, pre-1.0 |
| `libcrux-ml-kem` (verified) | 0.0.9 | Yes | formally verified, **but** IACR 2026/192 questioned the verification | Highest pedigree, still 0.0.x |
| `aws-lc-rs` / pqclean | — | **No (C/asm)** | aws-lc-rs FIPS 140-3 | Off-limits (breaks pure-Rust + `forbid(unsafe)` core); also ships **X25519MLKEM768**, a *different* construction from X-Wing |

**Recommendation: do NOT include in M1.** It is **off the slice's critical path entirely** — the
KEM is used at enrolment/sync (M2); the at-rest slice needs **no KEM** (the vault key wraps content
keys via symmetric AEAD key-wrap, not X25519). The "ship X25519-only, reserve the field" middle
path is **already done in the repo** — no further M1 code is required. The one zero-risk M1 action
is **documentation**: add an ADR line pinning the *flip-on criteria* for M2 — e.g. (i) X-Wing
reaches CFRG adoption/RFC **or** you accept a non-standard combiner; (ii) `ml-kem`/`x-wing` reach
an audited ≥1.0; (iii) re-verify the crate tracks the then-current draft before persisting any key
bytes. One-line note worth recording: the deployed-in-the-wild PQ hybrid is **X25519MLKEM768**
(TLS combiner, FIPS-validatable), a *different* wire format from X-Wing — relevant only if FIPS
procurement ever becomes a requirement.

**Downstream implications:** none for the slice. The seam stays exactly as shipped.

---

## 2. The vertical slice, scoped precisely

**Goal (walking skeleton):** one real feature end-to-end through the **production** stack —
capture a mood check-in `{mood, intensity, note}` → **encrypt at rest with the real vault /
per-record-key scheme (vetted crates, never hand-rolled)** → persist locally → read back →
decrypt → render — so the core can then be fleshed out *along* a proven spine.

**What the slice REUSES (almost everything) vs ADDS (only the crypto spine):**

| Concern | Reuse (exists today) | Add |
|---|---|---|
| Domain model `{mood,intensity,note}` | `Entry`/`CheckinDraft`, `MoodId`/`Intensity` enums, `MOODS` (`src/model.ts:12,14,30-39,84-121`) | — |
| Capture UI | `Step1/Step2/ConfirmScreen` + the expo-router modal stack (`app/checkin/*`) | — |
| Read-back + render | `useEntries`, `MoodShape`, the DS | — |
| Persistence shell | Drizzle schema, repo `insertEntry`/`listEntries` (`src/db/repo.ts`), `DbProvider` version-counter | **Rust-core seal/open under the repo API** |
| At-rest crypto | — | **Replace** SQLCipher PRAGMA-key (`connect.ts:23`) + secure-store key (`key.ts`) **with Rust per-record content keys (handle-based, §1-clean)** |
| Validators | `asEntry` (`src/db/backup.ts:47-68`) after decrypt | — |
| Tests | `connectDb` mock → better-sqlite3 (`test/setup.ts:15`); `app.test.tsx:82-89` check-in round-trip | **mock the Nitro Hybrid Object** |

The only genuinely new runtime path is swapping the SQLCipher transparent-encryption persistence
for a Rust-core encrypt/decrypt path, plus wiring Nitro into the Expo build.

### 2.1 Minimal Rust core API (in `core/lumi-vault`, built test-first)

Just enough to exercise the real per-record-key scheme at rest. **No KEM, no X25519** (those are
M2 enrolment/sync); at-rest needs Argon2id + XChaCha20-Poly1305 + HKDF + zeroize only.

```
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

- **Built test-first** (ADR 0001 §14 frames the Jest suite as the behavioural spec the core must
  satisfy): host `cargo test` for seal→open round-trip, wrong-PIN fails closed, **crypto-shred
  renders a record permanently unreadable**, plus **NIST KAT** vectors for the AEAD/KDF.
- **Where it lives:** `core/lumi-vault` (keeps `lumi-core` dep-free). **Reuses the spike's FFI
  marshalling pattern + the X25519/ChaCha/HKDF crates, but the Argon2id KDF and the
  XChaCha20-Poly1305 (24-byte-nonce) variant are NEW and must be validated fresh in step 1 — they
  were never in the spike.** All crate pins verified at current stable (2026-06-14).
- **Where storage I/O lives (resolves the a2 ambiguity):** keep `lumi-vault` *crypto-only* and put
  the engine binding in a thin **`core/lumi-store`** crate (or a feature-gated module) that
  `lumi-vault` calls. Musl consequence per engine: under **b1 (rusqlite-SQLite)** `lumi-store` is
  C-dependent → `--exclude` it (and `lumi-vault`'s integration tests) from the musl loop; under
  **b2 (redb)** the whole at-rest stack stays musl-green.

### 2.2 Nitro spec surface (handles only — §1 discipline)

Pure-C++ Hybrid Object, mirroring the validated spike pattern; **no key/secret bytes in any
signature** — only an opaque handle, the plaintext domain fields inbound, and the record id /
plaintext records outbound. The PIN crosses **inbound** as user-entered passphrase text (not a
stored key); Argon2id runs in Rust; the derived keys and vault key **never leave Rust**.

```ts
// LumiVault.nitro.ts — HybridObject<{ ios:'c++', android:'c++' }>
interface LumiVault extends HybridObject {
  unlockVault(pin: string): VaultHandle              // -> { handle: number }   (opaque)
  putCheckin(handle: number, recordJson: string): string   // recordJson = serialized Entry -> recordId
  listCheckins(handle: number): string[]             // -> serialized Entry records (plaintext domain objects)
}
```

The record crosses as a **serialized plaintext domain object** (the Entry — representatively
`{mood,intensity,note}`, plus the `words`/`tags`/`time` the reused screens produce), consistent
with §1 (plaintext domain objects *do* cross; only key bytes do not). A structured Nitro record
type instead of a JSON string is equally fine — the point is no key-shaped field appears.

> **§1 check to enforce at step 6** (mirrors SPIKE-REPORT's): grep the spec + C++ for
> `secret|private|key bytes` — nothing key-shaped may appear in any signature; the vault/content
> keys live only in the Rust registry behind `handle`. **Flag for Anna's confirmation:** the
> reading that a *user-entered PIN passphrase* crossing inbound is consistent with §1 ("never raw
> key *bytes*"; the PIN is input, derived to a key inside Rust). Recommended: yes, but it's a §1
> interpretation worth her explicit sign-off.

### 2.3 At-rest record format + where per-record keys land

Per chosen engine (b1 rusqlite-SQLite shown; redb stores the same fields keyed by `checkin/<ts>/<id>`):

```
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

Per-record content keys land in `wrapped_content_key`; **crypto-shredding = delete that one
wrapped key** (the row's ciphertext becomes permanently unrecoverable — the §4 Art. 17 mechanism).
The layout deliberately mirrors the §5 *wire* envelope (`record_id`, `wrapped_key`, `stamp`,
`ciphertext` — kept as distinct fields, id never embedding the clock) so at-rest and on-wire stay
structurally aligned for M2 sync. **Forward-compatibility discipline (mirrors the §4-item-7
migration caveat):** the slice ships only the PIN-wrap, but both the vault row and the record row
must be versioned/shaped so the recovery-key wrap, the biometric copy, and sync metadata slot in
later without reformatting persisted data.

### 2.4 Minimal accessible RN UI

**Reuse the existing check-in screens** — which already carry the a11y commitments that justified
keeping RN (109 annotations across 23 files; `react-native-a11y/all` lint-gated). The slice must
honour, and gets for free by reuse: **colour + shape** mood encoding (`MoodShape` — never colour
alone), **≥44 pt** touch targets, `role`/`state`/`hint` on every interactive element,
hint-explained disabled states, and **reduce-motion gating** on any animation. The render-back leg
uses `useEntries` + `MoodShape` exactly as the Confirm/Home cards do today.

### 2.5 Build setup carrying the deferred hygiene

- **Structure chosen to avoid the release-dex recurrence:** app-integrated Hybrid Object (local
  Expo module) → no library module → the `:app:mergeDexRelease` duplicate-class issue **cannot
  occur** (decision a1).
- **16 KB alignment:** pin **NDK r28+** (preferred; removes the item) or set
  `-Wl,-z,max-page-size=16384` on our CMake target.
- **Rust libs:** `cargo-ndk` builds `liblumi_*` for `arm64-v8a` + `x86_64` into the app/module
  `cpp/`; `nitrogen` generates the C++ spec + `+autolinking.cmake` as in the spike; an **Expo
  config plugin** applies the native wiring at `expo prebuild` (the unproven step — step 3).
- `reactNativeArchitectures=arm64-v8a,x86_64` (carried from the spike).

---

## 3. Ordered build plan

Each step is independently verifiable. **Deliberate deviation from the brief's nominal order**
(Rust core → Nitro → RN shell → wire e2e → on-device verify): the Nitro/on-device *smoke* is
pulled ahead of the UI step (step 3, before step 4's screen) because the Expo+Nitro+Rust wiring is
the **primary integration risk** and must fail fast if it's going to. So "on-device verify" is two
distinct checks: a **step-3 binding/dex sentinel** (does the Hybrid Object register; does
`assembleRelease` clear dex-merge) and the **step-5 full-slice sentinel** (does a real check-in
round-trip encrypted). The step-3 release-dex result is also the **first empirical confirmation of
the Option-2 "dex disappears by construction" claim — until step 3 passes on the real Expo CNG
build, that resolution is a prediction, not a proven fact.**

| Step | Work | Verification |
|---|---|---|
| **0** | (planning gate) Anna's decisions on §1 + the `apps/` ruling (§4) | this doc signed off |
| **1** | `core/lumi-vault` crypto API (`unlock_vault`/`put_checkin`/`list_checkins`/`shred`), **test-first** | host `cargo test`: round-trip, wrong-PIN fails, shred makes a record unreadable, NIST KATs (AEAD/KDF) |
| **2** | C ABI crate (promote `lumi-ffi-cabi`; depends on `lumi-vault`; `panic=abort`; cbindgen; handle registry) | host `cargo test` C-ABI round-trip; cbindgen header generated |
| **3** | Nitro binding **app-integrated** + Expo config plugin; build a dev client (**the primary integration risk — do this before UI**) | on-device debug: `LumiVault` registers (logcat `Successfully registered HybridObject`), a smoke round-trip returns; `assembleRelease` reaches dex-merge **without** the item-1 collision |
| **4** | RN app shell + the one screen: repoint persistence from `connectDb`/SQLCipher to the Nitro vault under the repo API (`insertEntry`/`listEntries` → seal/open) | the existing `app.test.tsx:82-89` check-in round-trip passes against the new path (with the Nitro mock) |
| **5** | Wire e2e + on-device verify | a real check-in captured on the Pixel persists **encrypted** (per-record key), reads back, decrypts, renders with `MoodShape`; emit `LUMI_SLICE_RESULT {"pass":true,...}` (echoes the spike's sentinel) |
| **6** | §1 + CI | §1 grep clean; CI updated (below) green |

**CI + workspace fit:** the two new C-dep crates compile on the existing full-toolchain matrix
(`ci.yml` — ubuntu/macos/windows, host target). The **musl sandbox loop must `--exclude
lumi-vault` and the C-ABI crate** (or redb keeps `lumi-vault` musl-buildable if b2 is chosen).
There are **no path filters** in CI today; adding them (run `core/` jobs on `core/**`, `js` on
`src/**`/`app/**`) is a cheap hygiene win as the slice broadens the tree. The Jest suite keeps the
single `connectDb` mock and **adds a Nitro Hybrid Object mock** (a thin JS reference impl of
seal/open, or identity for round-trip tests) — no test restructuring needed because `connectDb` is
the only native touch-point and every repo fn takes `db` as a parameter.

**"Slice done" =** on a real Pixel, a mood check-in entered through the existing UI is sealed with a
**per-record content key** by the Rust core, persisted, read back, decrypted, and rendered
(colour+shape); **§1 verified** (no key bytes cross — registry handles only); **crypto-shred**
demonstrably destroys a single record; and the existing check-in round-trip test passes against the
new core path. The core can then be fleshed out (measurements, WHO-5, recovery code, biometric
release, sync) *along* this proven spine.

---

## 4. Open questions / risks for Anna

**★ HEADLINE RULING NEEDED — the slice does real M1 work in the RN app, which the milestone plan
appears to defer.** ADR 0001 ratification line 89: *"`apps/` stays **empty** until spike #1 passes
and M3."* (Spike #1b passed GO 2026-06-14, so the spike precondition is met; the M3 one is not.)
**The key fact that dissolves most of this:** *there is currently no `apps/` directory at all* —
the production RN app lives at the **repo root**, and `apps/` is only a node in ADR §7's *future*
monorepo tree (line 535) that has never been created. So "`apps/` stays empty" is a constraint
about a directory that doesn't exist yet, not about the existing root app. Three readings — Anna
must pick:

- **(A) recommended — run the slice in the existing root app; do NOT create `apps/` at all this
  milestone** (it's "kept empty" only in the sense of "not created"). This delivers a real vertical
  slice through the production stack while deferring the §7 monorepo reshape (and the CMP-vs-RN
  directory question) to M3 exactly as planned. The contradiction largely dissolves — the slice
  touches the root app + `core/`, never `apps/`.
- **(B) create `apps/mobile` now** (move the root app in) — a genuine deviation from the plan;
  needs explicit override and front-loads the M3 reshape into M1.
- **(C) keep the slice core-only** (no app this milestone) — but that abandons the walking-skeleton
  "through the production stack" intent; not recommended.

Other open questions / risks:

1. **Expo + prebuild + Nitro + Rust C-ABI is unproven** (spike was bare RN 0.81.4). The config-plugin
   wiring is the slice's primary integration risk — de-risked first (build-plan step 3). Fallback:
   commit prebuilt `android/`/`ios/` (bare workflow), still app-integrated.
2. **Storage engine residual (b1 vs b2):** SQL ergonomics + reuse (rusqlite) vs a fully
   musl-testable pure-Rust loop (redb, younger/unaudited). Anna's call on the audit-gap tolerance
   and how much the in-sandbox dev loop matters.
3. **Index leakage budget:** which metadata may be plaintext-queryable (a plaintext `created_at`
   reveals usage cadence even with the body sealed)? Sets the privacy/queryability line.
4. **§1 interpretation:** confirm a user-entered **PIN passphrase crossing inbound** (derived to a
   key inside Rust; no key bytes ever leave Rust) is consistent with the §1 invariant.
5. **Test double for Nitro:** acceptable to add a JS reference seal/open mock so the RTL flows keep
   running headless (alongside the better-sqlite3 mock)?
6. **HLC ordering is a behavioural change** (ADR 0001 §4: HLC replaces `Date.now()`-prefix
   ordering) — some existing tests assert creation-order; expect to update those assertions.
7. **Migration of existing users' SQLCipher data** (ADR 0001 §6) is **out of slice scope**, but the
   slice's record format must be migration-compatible (don't paint M1 into a corner).
8. **Stale-doc cleanup** to bundle with the slice: `core/lumi-ffi/src/lib.rs:5-7` (UniFFI →
   Nitro/cbindgen) and `core/lumi-core/Cargo.toml:6` ("crypto" not yet present).
9. **ADR reconciliation (later step):** ADR 0001 still describes UniFFI + a CMP-shaped `apps/`;
   once Anna decides the above, fold the decisions + the 0001↔0003 reconciliation into ADR(s).

---

**Recommendations, not decisions.** I've built nothing and will start nothing until Anna rules on
§1 (a/b/c) and the headline `apps/` question. Once decided, these become ADR(s), then M1
implementation begins test-first at build-plan step 1.
