# ADR 0005 — M2 key model for zero-knowledge sync (hybrid unlock)

- **Status:** **Proposed (2026-06-15)** — **NOT accepted; do not implement.** Pending **(i)** an
  **independent crypto review** (this is the highest-stakes decision in the project) and **(ii)**
  Anna's ratification. Recorded here for review.
- **Date:** 2026-06-15
- **Decision owner:** Anna (clinical / product / final architecture sign-off), pending the
  independent crypto review.
- **Builds on:** ADR 0004 (M1 vault / per-record-key hierarchy + the §1 PIN-passphrase reading) and
  the **M2 canonical data-model assessment (2026-06-15)** — vault = system of record and sync unit;
  the drizzle/SQLCipher store is demoted to a **derived local query index** (not a second source of
  truth). This ADR is the **key-model foundation** the transport / server ADR (next) builds on.
- **Locks relied on (ADR 0001):** §1 (FFI returns handles / plaintext / ciphertext only, never raw
  key bytes), §3 (vault key → per-record content keys; XChaCha20-Poly1305; Argon2id), §4
  (crypto-shredding = Art. 17 erasure).

## Context

M2 introduces **zero-knowledge sync**: the user's encrypted records sync across devices through a
server that can never read them. M1's key model — **vault key = Argon2id(PIN)** — is **correct for a
local-only vault** but **cannot be carried into sync**.

A **4-digit PIN cannot protect key material stored on a server.** The adversary zero-knowledge sync
exists to defend against is *a breach of the sync server itself*. An attacker who breaches that
server and obtains a **PIN-wrapped key plus its salt and Argon2 parameters** can **brute-force all
10⁴ PINs offline** — running each candidate through Argon2id locally, in **minutes** — and then
**decrypt everything that was synced.** Argon2id's cost floor (m=64 MiB / t=3 / p=1) is tuned to
make a *single online* unlock acceptable on a phone; it does **not** turn a 10⁴-element keyspace into
something safe against an *offline* attacker with the wrapped blob in hand.

Therefore the key model must **decouple the quick-unlock PIN from anything portable or server-held.**

> **Invariant (the one accuracy guardrail of this ADR).** The PIN is a **local quick-unlock only.**
> It **never** appears as a server-side or cross-device unlock, and **nothing the server can hold may
> be crackable down to the 4-digit PIN.** Any design that lets a server-held blob be reduced to the
> PIN is out of scope and rejected (see *Rejected alternative*).

## Decision — Option 3 (hybrid)

There is **one random 256-bit vault key (VK)**, the root of the existing per-record content-key
hierarchy from M1 — each record sealed with its own XChaCha20-Poly1305 content key, the content key
wrapped under VK. **That hierarchy is unchanged.** What changes is **how VK is wrapped and
delivered**, via **three independent paths.**

### (a) The vault key (VK) and the per-record hierarchy — unchanged

- **VK is a random 256-bit key** (not derived from the PIN) — **as it already is in M1**, where VK is
  a random 32-byte key and only the *key that wraps it* is PIN-derived (the Argon2id PIN key →
  `wrapped_vault_key`). It is the root the M1 per-record scheme already wraps content keys under;
  **per-record AEAD sealing (XChaCha20-Poly1305, per-record content key, AAD, crypto-shredding) is
  untouched.**

### (b) Path 1 — Local unlock (keystore-held, PIN-gated)

- **VK is wrapped under a device key held in the OS keystore** — **Android Keystore / StrongBox**,
  **iOS Keychain / Secure Enclave**.
- **The PIN gates keystore *access*, not the data:** **PIN → keystore releases the device key →
  unwrap VK.** The **PIN never leaves the device** and **never wraps server-bound material.**
- **What is *intended* to make a 4-digit PIN acceptable here is the keystore's hardware
  rate-limiting** — not Argon2id — applied **on-device only.** **This acceptability is conditional,
  not settled:** on Android, Keystore hardware rate-limiting binds to the **device lockscreen
  credential** (`setUserAuthenticationRequired`), **not an arbitrary app-defined PIN** — so the claim
  holds **only once the PIN→keystore gating mechanism is resolved** (see *Headline question for the
  crypto review*, below).

### (c) Path 2 — Add a device (authenticated device-to-device transfer)

- **No stored wrap; an authenticated device-to-device transfer.** The **new device generates an
  ephemeral X-Wing (X25519 + ML-KEM-768) keypair**; the **existing device uses the X-Wing KEM to
  establish a shared secret with the new device's ephemeral public key, then wraps VK under that
  shared secret.**
- A **short authentication string (SAS) or QR** confirms the **receiving key is the genuine device,
  not a man-in-the-middle.**
- **The server never sees VK** — at most it **relays PQ-protected blobs it cannot read.**
- **PQ sequencing (a dependency, not just a default):** the **ML-KEM-768 layer of this path cannot
  fully ship until ADR 0004 (c)'s PQ maturity gate clears** (audited ≥ 1.0 `ml-kem` / `x-wing`
  crates, draft re-verified) — a **real sequencing dependency.** **Likely interim: classical X25519
  first, the ML-KEM layer added once the crates mature** — acceptable because the PQ benefit on this
  path is **harvest-now-decrypt-later on a *captured handshake***, a **bounded risk over an
  authenticated (SAS/QR) channel.** This **shapes the slice and transport sequencing.**

### (d) Path 3 — Recovery (optional)

- **VK wrapped under a high-entropy recovery key (RK)** generated for the user (**BIP39-style
  mnemonic**). The **RK-wrapped-VK is stored server-side** — **safe because RK is high-entropy, not a
  crackable PIN.**
- **Fresh device with no other device available → enter RK → fetch and unwrap VK.**
- **If the user declines recovery, no RK-wrapped-VK is stored anywhere** → the server holds **zero
  key material** (pure device-to-device), with the **explicit tradeoff that total device loss means
  the data is unrecoverable.** **The user chooses.**

### (e) Server-side key material — the resulting posture

- **Per-record ciphertext: always** (the records are the sync unit; their content keys are wrapped
  under VK, never under the PIN).
- **RK-wrapped-VK: only if recovery is enabled.**
- **Nothing PIN-crackable, ever.**

### (f) Scope of "zero-knowledge" — keys and content, not metadata

- **"Zero-knowledge" in this ADR means confidentiality of keys and record *content*, not metadata.**
  The synced records still expose to the server **`record_id`, the nonces, ciphertext length,
  `wrapped_content_key`, and — notably — plaintext `created_at`** (the leak accepted in ADR 0004 (e)).
  That **`created_at` leak compounds once every record type shares one synced timeline** (per-record
  timing + cardinality across all record types).
- **Metadata-minimisation is the transport / server ADR's concern — explicitly out of scope here**,
  so "zero-knowledge" is **not** over-read as "the server learns nothing."

## Headline question for the crypto review — the PIN→keystore gating (UNRESOLVED)

**This is the single most important open question for the independent crypto review.** Path 1's
acceptability of a 4-digit PIN rests entirely on **keystore hardware rate-limiting** — but that
rate-limiting **is not automatically available to an app-defined PIN.** On Android, Keystore
hardware-backed user authentication (`setUserAuthenticationRequired`) **binds to the device
lockscreen credential / biometric, not an arbitrary 4-digit app PIN.** So **"the 4-digit PIN is
acceptable" holds only once the PIN→keystore gating mechanism is resolved.**

There is a **product / UX dimension Anna must weigh**, because the two candidate meanings of "the
PIN" trade off differently:

- **A Lumi-specific app PIN** — gives an **app-level lock even on an already-unlocked phone**
  (valuable for a mood journal that might be handed over unlocked), **but is not itself
  hardware-rate-limited.**
- **The device lockscreen credential** — **is hardware-rate-limited** (the crypto-strength path),
  **but has no app-level granularity** (anyone past the lockscreen is in).

**The likely resolution is a combination:** a **keystore key auth-bound to the lockscreen** for
crypto strength, **plus an app lock** for privacy granularity. **This needs Anna's product input and
the crypto review's resolution before Path 1 is implementable** — it is promoted out of the
implementation-level sub-decisions for exactly this reason.

## Rejected alternative — cross-device / server-held PIN-derived key

An earlier draft leaned on **"cross-device PIN unlock"** — i.e. keeping M1's **VK = Argon2id(PIN)**
and treating the **PIN-wrapped VK as portable / server-held** so a second device could re-derive VK
from the same PIN. **This is rejected.**

**Why rejected.** It places **PIN-crackable key material exactly where the zero-knowledge adversary
sits.** A server breach yields the **PIN-wrapped VK + salt + Argon2 params**; the attacker
brute-forces the **10⁴-PIN keyspace offline through Argon2id in minutes** and decrypts all synced
data — defeating the entire point of zero-knowledge sync. The PIN's small keyspace is only ever
acceptable **behind hardware rate-limiting on the device** (Path 1), **never** behind an offline-
attackable wrap. The hybrid above exists specifically to remove any PIN-derived blob from anything
the server or another device can hold.

## Change vs M1

- **The vault-key *wrapping / unlock* layer changes — but VK itself does not.** In M1, VK is already
  a **random 32-byte key**; what is PIN-derived is only the **key that wraps it** (Argon2id PIN key →
  AEAD-wraps VK → `wrapped_vault_key`). Under M2 the **PIN stops wrapping VK and instead gates the
  keystore** that holds the device key wrapping VK (Path 1), with device-to-device (Path 2) and
  optional recovery (Path 3) added. **VK is unchanged, so the per-record content keys are *not*
  re-wrapped — only VK's *outer* wrap changes.**
- **The per-record AEAD sealing is unchanged** (per-record content keys under VK, XChaCha20-Poly1305,
  AAD, crypto-shredding).
- **The existing vault crypto will need re-testing after this layer is reworked.** (M1 ships only the
  PIN-wrap; the vault row was deliberately versioned to admit the keystore copy + recovery wrap
  without reformatting persisted data — ADR 0004 Deferred item 5.)
- **No M1→M2 data migration is required:** the M1 vault is a **dev skeleton with no real user data.**
  For a *real* vault the change would be **adding a keystore (and optional recovery) wrap of the
  *same* VK** — not minting a new VK and not re-sealing records; but because the skeleton holds
  nothing, simply **starting fresh** under the new key layer is fine here. (Distinct from, and
  compatible with, ADR 0004 Deferred-5's *format* forward-compatibility, which still holds.)
- **Changing the PIN re-gates the keystore (device-key access) but does *not* rotate VK** — a PIN
  change is therefore **cheap: no record re-wrap, no re-sealing.**

## Consequences

**Benefits.**
- **Maximal zero-knowledge:** **no PIN-crackable material on the server, ever** — the property M1's
  model could not provide for sync.
- **Optional recovery** the user controls (high-entropy RK), without weakening the default posture.
- **PQ-hardened device transfer** (X-Wing: X25519 + ML-KEM-768) for adding a device.
- **The M1 per-record hierarchy is preserved** — per-record keys + per-record crypto-shredding
  (Art. 17) carry straight into sync.

**Costs / downsides (recorded honestly).**
- **More to build:** a **device-to-device channel**, **recovery-key UX**, and **keystore key
  management** across two platforms — substantially more than the M1 PIN-wrap.
- **The recovery-key UX is genuinely hard:** users lose codes. It needs a **deliberate
  save-and-verify flow** (generate → user records it → verify they have it before it becomes the only
  recovery path), or recovery silently fails when it's needed most.
- **Total loss without recovery = data loss:** if the user declines recovery and loses every device,
  the data is **unrecoverable** (the price of the server holding zero key material).
- **The M1 key-layer rework** + the **re-test** of the existing vault crypto.
- **A sliver of posture is traded when recovery is *on*:** the server then holds a **strongly-wrapped
  key (RK-wrapped-VK)** rather than nothing. Safe (RK is high-entropy), but not the absolute
  "server holds zero key material" of the recovery-off path.

## Sub-decisions (implementation-level — recommended defaults, to be finalized during build + the crypto review)

Each below has a **recommended default**, but all are **implementation-level** and **finalized during
build and the independent crypto review**, not locked by this ADR:

1. **Device-to-device KEM: X-Wing (X25519 + ML-KEM-768) — confirmed.** *(Subject to ADR 0004 (c)'s
   PQ flip-on maturity gate — audited ≥ 1.0 `ml-kem` / `x-wing` crates, draft tracking — before any
   ML-KEM key bytes are transmitted; see **Path 2** for the classical-X25519-first interim and the
   explicit sequencing dependency.)*
2. **Recovery-key format / entropy:** recommend a **256-bit value rendered as a BIP39-style
   mnemonic.**
3. **Per-platform keystore specifics** (Android Keystore / StrongBox vs iOS Keychain / Secure
   Enclave). *(The PIN→keystore **gating mechanism** is **not** an implementation detail — it is
   promoted to the crypto-review **Headline question** above.)*
4. **The SAS / QR pairing-authentication details** (string length / format, QR contents, the
   confirmation UX that defeats MITM).

## Deferred / open items (to resolve before implementation)

1. **Device revocation / VK rotation — unspecified, and security-relevant *for Lumi specifically*.**
   The design covers **add-device** and **recovery** but **not revoking a lost or stolen device when
   recovery is off.** For this app this is **not an edge case but a real harm:** a lost or stolen
   device that cannot be revoked means **an abuser or an ex retains access through the old phone** to
   a mood journal and clinical scores. It is **feasible** — **VK rotation = re-wrap every per-record
   content key under a new VK, with *no* record re-sealing** (the ciphertext is unchanged; only the
   content-key wraps and the VK-delivery paths rotate) — but the **trigger, the re-distribution to
   the remaining good devices, and the server-side cleanup are currently unspecified.** Needs real
   design, **likely in the transport / server ADR or a dedicated follow-up.**

*See also, recorded above as open before implementation:* the **PIN→keystore gating mechanism** (the
crypto-review **Headline question**) and the **PQ sequencing dependency** on **Path 2** (the ML-KEM
layer gated on ADR 0004 (c)).

## Relationship to other decisions

- **Data model — already settled** (M2 canonical data-model assessment, 2026-06-15): the **vault is
  the system of record and the sync unit**; the **drizzle/SQLCipher store is demoted to a derived
  local query index**, rebuilt from decrypted vault records (not a second source of truth, not a
  sync source).
- **This ADR is the foundation the transport / server ADR (next) builds on** — what the server stores
  and relays (per-record ciphertext always; RK-wrapped-VK only if recovery is on; PQ blobs it cannot
  read) is fixed here.
- **This design warrants an independent crypto review before implementation** — it is the
  **highest-stakes decision in the project**, and `Status: Proposed` holds until that review and
  Anna's ratification.

## References

- ADR 0004 — M1 vertical-slice foundational decisions (vault / per-record-key hierarchy; §1
  PIN-passphrase reading; (c) PQ flip-on criteria; Deferred item 5 = forward-compatible vault-row
  shape for the keystore + recovery wraps).
- ADR 0001 §1 / §3 / §4 — FFI handles-only invariant; vault key → per-record content keys
  (XChaCha20-Poly1305; Argon2id); crypto-shredding = Art. 17 erasure.
- M2 canonical data-model assessment (2026-06-15) — vault = system of record + sync unit; drizzle
  demoted to a derived local query index.
