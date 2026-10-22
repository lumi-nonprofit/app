# ADR 0005 — M2 key model for zero-knowledge sync (hybrid unlock)

> **Note (2026-10-18):** Rewritten in Simplified Technical English on 2026-10-18; decisions and section numbering unchanged.

- **Status:** **Proposed (2026-06-15)** — **NOT accepted; do not implement.** The ADR waits for
  **(i)** an **independent crypto review** (this is the highest-stakes decision in the project) and
  **(ii)** Anna's ratification. This document records the proposal for review.
- **Date:** 2026-06-15
- **Decision owner:** Anna (clinical / product / final architecture sign-off). Her decision waits
  for the independent crypto review.
- **Builds on:** ADR 0004 and the **M2 canonical data-model assessment (2026-06-15)**. ADR 0004
  gives the M1 vault and per-record-key hierarchy, and the §1 PIN-passphrase interpretation. That
  assessment
  makes the vault the system of record and the sync unit. It demotes the drizzle/SQLCipher store to
  a **derived local query index**, not a second source of truth. This ADR is the **key-model
  foundation** for the transport / server ADR (next).
- **Locks relied on (ADR 0001):** §1, §3 and §4. §1: the FFI returns handles, plaintext or
  ciphertext only, never raw key bytes. §3: the vault key wraps per-record content keys;
  XChaCha20-Poly1305; Argon2id. §4: crypto-shred is the Article 17 erasure.

## Context

M2 adds **zero-knowledge sync**: the encrypted records of the user sync across devices through a
server that can never read them. The M1 key model is **vault key = Argon2id(PIN)**. This model is
**correct for a local-only vault**, but it **cannot carry over into sync**.

A **4-digit PIN cannot protect key material that a server stores.** Zero-knowledge sync exists to
defend against one adversary: _a breach of the sync server itself_. An attacker who breaches that
server gets a **PIN-wrapped key with its salt and Argon2 parameters**. The attacker can then **try
all 10⁴ PINs offline**: each candidate goes through Argon2id on the attacker's machine, in
**minutes**. After that, the attacker can **decrypt all synced data.**

The Argon2id cost floor (m=64 MiB / t=3 / p=1) makes a _single online_ unlock acceptable on a
phone. It does **not** make a keyspace of 10⁴ elements safe against an _offline_ attacker who has
the wrapped blob.

Thus the key model must **separate the quick-unlock PIN from all portable or server-held material.**

> **Invariant (the one accuracy guardrail of this ADR).** The PIN is a **local quick-unlock only.**
> It **never** appears as a server-side or cross-device unlock, and **nothing the server can hold may
> be crackable down to the 4-digit PIN.** Any design that lets a server-held blob be reduced to the
> PIN is out of scope and rejected (see _Rejected alternative_).

## Decision — Option 3 (hybrid)

There is **one random 256-bit vault key (VK)**. VK is the root of the per-record content-key
hierarchy from M1. The core seals each record with its own XChaCha20-Poly1305 content key, and VK
wraps that content key. **That hierarchy is unchanged.** What changes is **the wrap and the
delivery of VK**, through **3 independent paths.**

### (a) The vault key (VK) and the per-record hierarchy — unchanged

- **VK is a random 256-bit key**, not a key derived from the PIN. **This is already true in M1.**
  VK is a random 32-byte key. Only the _key that wraps VK_ comes from the PIN (the Argon2id PIN
  key → `wrapped_vault_key`). VK is the root under which the M1 per-record scheme already wraps the
  content keys. **The per-record AEAD seal (XChaCha20-Poly1305, per-record content key, AAD,
  crypto-shred) stays untouched.**

### (b) Path 1 — Local unlock (keystore-held, PIN-gated)

- **A device key in the OS keystore wraps VK** — **Android Keystore / StrongBox**, **iOS Keychain /
  Secure Enclave**.
- **The PIN gates keystore _access_, not the data:** **PIN → the keystore releases the device key →
  the core unwraps VK.** The **PIN never leaves the device**, and it **never wraps material that
  goes to the server.**
- **The intent is that the hardware rate limit of the keystore makes a 4-digit PIN acceptable
  here** — not Argon2id. The rate limit applies **on the device only.** **This acceptability is
  conditional, not settled.** On Android, the hardware rate limit of the Keystore binds to the
  **device lock-screen credential** (`setUserAuthenticationRequired`), **not to an arbitrary PIN
  that the app defines.** So the claim holds **only after the resolution of the PIN→keystore gate
  mechanism** (see _Headline question for the crypto review_ below).

### (c) Path 2 — Add a device (authenticated device-to-device transfer)

- **There is no stored wrap; the transfer is an authenticated device-to-device transfer.** The
  **new device makes an ephemeral X-Wing (X25519 + ML-KEM-768) keypair.** The **current device uses
  the X-Wing KEM with the ephemeral public key of the new device to get a shared secret.** It then
  **wraps VK under that shared secret.**
- A **short authentication string (SAS) or a QR code** confirms the **key of the receiver.** That
  key must belong to the **genuine device, not to a man-in-the-middle.**
- **The server never sees VK.** At most, it **relays PQ-protected blobs that it cannot read.**
- **PQ sequence (a dependency, not only a default).** The **ML-KEM-768 layer of this path cannot
  fully ship before the PQ maturity gate of ADR 0004 (c) clears.** The gate needs audited `ml-kem` /
  `x-wing` crates at version ≥ 1.0 and a new check of the draft. This is a **real dependency in
  the sequence.** **The likely interim is classical X25519 first; the ML-KEM layer comes when the
  crates mature.** This is acceptable because the PQ benefit on this path is one thing: protection
  against **harvest-now-decrypt-later on a _captured handshake_**. That is a **bounded risk over an
  authenticated (SAS/QR) channel.** This **shapes the sequence of the slice and the transport.**

### (d) Path 3 — Recovery (optional)

- **A high-entropy recovery key (RK) wraps VK.** The app makes RK for the user as a **BIP39-style
  mnemonic**. The **server stores the RK-wrapped-VK.** This is **safe because RK has high entropy;
  it is not a crackable PIN.**
- **A fresh device with no other device available: the user enters RK, and the device fetches and
  unwraps VK.**
- **If the user declines recovery, no RK-wrapped-VK exists anywhere.** The server then holds **zero
  key material** (pure device-to-device). The **explicit trade-off: the loss of all devices makes
  the data unrecoverable.** **The user chooses.**

### (e) Server-side key material — the posture that results

- **Per-record ciphertext: always.** The records are the sync unit; VK wraps their content keys,
  never the PIN.
- **RK-wrapped-VK: only if recovery is enabled.**
- **No PIN-crackable material, ever.**

### (f) Scope of "zero-knowledge" — keys and content, not metadata

- **"Zero-knowledge" in this ADR means confidentiality of the keys and of the record _content_, not
  of the metadata.** The synced records still show the server **`record_id`, the nonces, the
  ciphertext length, `wrapped_content_key` and — notably — a plaintext `created_at`** (the leak that
  ADR 0004 (e) accepts). That **`created_at` leak compounds when every record type shares one
  synced timeline** (per-record timing and cardinality across all record types).
- **Metadata minimisation is the concern of the transport / server ADR; it is explicitly out of
  scope here.** Thus "zero-knowledge" in this ADR does **not** mean "the server learns nothing."

## Headline question for the crypto review — how the PIN gates the keystore (UNRESOLVED)

**This is the single most important open question for the independent crypto review.** In Path 1,
the acceptability of a 4-digit PIN rests entirely on the **hardware rate limit of the keystore.**
But that rate limit **is not automatically available to a PIN that the app defines.** On Android,
the hardware-backed user authentication of the Keystore (`setUserAuthenticationRequired`) **binds
to the device lock-screen credential or biometric.** It does **not bind to an arbitrary 4-digit app
PIN.** So **"the
4-digit PIN is acceptable" holds only after the resolution of the PIN→keystore gate mechanism.**

There is a **product / UX dimension that Anna must weigh**, because the 2 candidate meanings of
"the PIN" have different trade-offs:

- **A Lumi-specific app PIN** gives an **app-level lock even on a phone that is already unlocked.**
  That is valuable for a mood journal that a user can hand over unlocked. **But the app PIN has no
  hardware rate limit of its own.**
- **The device lock-screen credential has a hardware rate limit** (the crypto-strength path). **But
  it has no app-level granularity:** anyone past the lock screen is in.

**The likely resolution is a combination.** A **keystore key that is auth-bound to the lock
screen** gives crypto strength. **An app lock** adds privacy granularity. **Path 1 is
implementable only after Anna's product input and the resolution of the crypto review.** For
exactly this reason, this ADR promotes the question out of the implementation-level sub-decisions.

## Rejected alternative — cross-device / server-held PIN-derived key

An earlier draft leaned on **"cross-device PIN unlock"**. That is: keep the M1 **VK =
Argon2id(PIN)**, and treat the **PIN-wrapped VK as portable / server-held**. A second device can
then derive VK again from the same PIN. **This ADR rejects that design.**

**Why rejected.** It places **PIN-crackable key material exactly where the zero-knowledge adversary
sits.** A server breach yields the **PIN-wrapped VK, the salt and the Argon2 parameters.** The
attacker then tries the **10⁴-PIN keyspace offline through Argon2id in minutes** and decrypts all
synced data. That defeats the entire point of zero-knowledge sync.

The small keyspace of the PIN is acceptable only **behind a hardware rate limit on the device**
(Path 1). It is **never** acceptable behind a wrap that an offline attacker can attack. The hybrid above exists
specifically to remove every PIN-derived blob from all material that the server or another device
can hold.

## Change vs M1

- **The _wrap / unlock_ layer of the vault key changes, but VK itself does not.** In M1, VK is
  already a **random 32-byte key**. Only the **key that wraps VK** comes from the PIN (Argon2id PIN
  key → AEAD wrap of VK → `wrapped_vault_key`). Under M2, the **PIN stops its wrap of VK; instead
  it gates the keystore** that holds the device key. That device key wraps VK (Path 1). M2 adds
  device-to-device transfer (Path 2) and optional recovery (Path 3). **VK is unchanged, so the core
  does _not_ wrap the per-record content keys again — only the _outer_ wrap of VK changes.**
- **The per-record AEAD seal is unchanged** (per-record content keys under VK, XChaCha20-Poly1305,
  AAD, crypto-shred).
- **The current vault crypto needs a new test pass after the rework of this layer.** (M1 ships only
  the PIN wrap. The vault row has a deliberate version field. So the keystore copy and the recovery
  wrap fit later without a reformat of persisted data — ADR 0004 Deferred item 5.)
- **No M1→M2 data migration is required:** the M1 vault is a **dev skeleton with no real user
  data.** For a _real_ vault, the change would be **to add a keystore wrap (and an optional
  recovery wrap) of the _same_ VK.** The change would not mint a new VK, and it would not seal the
  records again. But
  because the skeleton holds nothing, a **fresh start** under the new key layer is fine here. (This
  is distinct from, and compatible with, the _format_ forward-compatibility of ADR 0004 Deferred
  item 5, which still holds.)
- **A PIN change gates the keystore again (device-key access), but it does _not_ rotate VK.** A PIN
  change is thus **cheap: no new wrap of the records, no new seal.**

## Consequences

**Benefits.**

- **Maximal zero-knowledge:** **no PIN-crackable material on the server, ever.** The M1 model could
  not give this property for sync.
- **Optional recovery** that the user controls (high-entropy RK). The default posture stays as
  strong.
- **PQ-hardened device transfer** (X-Wing: X25519 + ML-KEM-768) to add a device.
- **The M1 per-record hierarchy stays as it is**: per-record keys and per-record crypto-shred
  (Article 17) carry straight into sync.

**Costs / downsides (recorded honestly).**

- **More to build:** a **device-to-device channel**, the **recovery-key UX** and **keystore key
  management** across 2 platforms. This is much more than the M1 PIN wrap.
- **The recovery-key UX is genuinely hard:** users lose codes. It needs a **deliberate
  save-and-verify flow**: generate → the user records it → verify that the user has it. That check
  must come before RK becomes the only recovery path. Without that flow, recovery fails silently when the user needs
  it most.
- **Total loss without recovery = data loss:** if the user declines recovery and loses every device,
  the data is **unrecoverable**. That is the price of a server that holds zero key material.
- **The rework of the M1 key layer** and the **new test pass** of the current vault crypto.
- **The posture gives up a sliver when recovery is _on_:** the server then holds a **strongly
  wrapped key (RK-wrapped-VK)** instead of nothing. This is safe (RK has high entropy), but it is
  not the absolute "server holds zero key material" of the recovery-off path.

## Sub-decisions (implementation-level — recommended defaults; the build and the crypto review make them final)

Each item below has a **recommended default**. But all items are **implementation-level**: the
**build and the independent crypto review make them final**; this ADR does not lock them.

1. **Device-to-device KEM: X-Wing (X25519 + ML-KEM-768) — confirmed.** _(Subject to the PQ flip-on
   maturity gate of ADR 0004 (c). The gate needs audited `ml-kem` / `x-wing` crates at version
   ≥ 1.0, and draft tracking, before any ML-KEM key bytes go over the wire. See **Path 2** for the
   classical-X25519-first interim and the explicit dependency in the sequence.)_
2. **Recovery-key format / entropy:** the recommendation is a **256-bit value shown as a BIP39-style
   mnemonic.**
3. **Per-platform keystore specifics** (Android Keystore / StrongBox, or iOS Keychain / Secure
   Enclave). _(The **mechanism by which the PIN gates the keystore** is **not** an implementation
   detail: this ADR promotes it to the crypto-review **Headline question** above.)_
4. **The SAS / QR pairing-authentication details** (string length / format, QR contents, the
   confirmation UX that defeats MITM).

## Deferred / open items (to resolve before implementation)

1. **Device revocation / VK rotation — unspecified, and security-relevant _for Lumi
   specifically_.** The design covers **add-device** and **recovery**, but **not the revocation of
   a lost or stolen device when recovery is off.** For this app, this is **not an edge case but a
   real harm.** If nobody can revoke a lost or stolen device, **an abuser or an ex keeps access
   through the old phone.** That access covers a mood journal and clinical scores.

   Revocation is **feasible**: **VK rotation = wrap every per-record content key again under a new
   VK, with _no_ new seal of the records.** The ciphertext is unchanged; only the content-key wraps
   and the VK-delivery paths rotate. But the **trigger, the redistribution to the other good
   devices, and the server-side cleanup are currently unspecified.** This needs real design,
   **likely in the transport / server ADR or in a dedicated follow-up.**

_See also, recorded above as open before implementation:_ (1) the **mechanism by which the PIN
gates the keystore**, the crypto-review **Headline question**. (2) The **PQ dependency in the
sequence of Path 2**: the ML-KEM layer waits for the gate of ADR 0004 (c).

## Relationship to other decisions

- **Data model — already settled** (M2 canonical data-model assessment, 2026-06-15): the **vault is
  the system of record and the sync unit.** The **drizzle/SQLCipher store becomes a derived local
  query index**, which the app rebuilds from decrypted vault records. It is not a second source of
  truth, and not a sync source.
- **This ADR is the foundation on which the transport / server ADR (next) builds.** This ADR fixes
  what the server stores and relays. The server holds per-record ciphertext always, and
  RK-wrapped-VK only if recovery is on. It relays PQ blobs that it cannot read.
- **This design needs an independent crypto review before implementation.** It is the
  **highest-stakes decision in the project**, and `Status: Proposed` holds until that review and
  Anna's ratification.

## References

- ADR 0004 — M1 vertical-slice foundational decisions. It holds the vault / per-record-key
  hierarchy and the §1 PIN-passphrase interpretation. Its item (c) gives the PQ flip-on criteria.
  Its Deferred item 5 is the forward-compatible vault-row shape for the keystore and recovery
  wraps.
- ADR 0001 §1 / §3 / §4 — the FFI handles-only invariant; vault key → per-record content keys
  (XChaCha20-Poly1305; Argon2id); crypto-shred = Article 17 erasure.
- M2 canonical data-model assessment (2026-06-15) — vault = system of record + sync unit; drizzle
  demoted to a derived local query index.
