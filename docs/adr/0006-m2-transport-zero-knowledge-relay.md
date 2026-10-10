# ADR 0006 — M2 transport and relay for zero-knowledge sync

- **Status:** **Draft (2026-10-09)** — **NOT ratified; do not implement.** This ADR records eight
  transport decisions from June 2026. The work stopped before the decisions were written into the
  repository. This text is a reconstruction (see _Provenance_). Anna must confirm each decision
  (see _Confirmation checklist_). The key-model parts also wait for the independent crypto review
  of ADR 0005.
- **Date:** June 2026 (the decisions; the notes have no date, and the proposal that they answer is
  dated 2026-06-15) · 2026-10-09 (written down)
- **Decision owner:** Anna (clinical / product / final architecture sign-off).
- **Builds on:** ADR 0005 (key model — **Proposed, not accepted**) and
  [`docs/m2-transport-proposal.md`](../m2-transport-proposal.md) (the analysis and the options).
- **Locks relied on (ADR 0001):** §1 (no raw key bytes across the FFI), §4 (crypto-shredding is the
  Art. 17 erasure), §5 (ciphertext-only relay, metadata minimisation), §5.1 (relay controllership).

## Provenance — read this first

This ADR has two sources. Each decision names its source.

- **[P]** is `docs/m2-transport-proposal.md`. It is in the repository. It gives the options, a
  recommendation and the reasons.
- **[N]** is the notes that the AI advisor kept of the work on the proposal with Anna. The notes
  give each of the eight outcomes in one line. The notes call the eight points "adjudicated". They
  do not say who made each call, and they have no date. The notes were not in the repository
  before this ADR. The appendix has the eight lines verbatim.

Where [N] only repeats the recommendation of [P], this ADR points to [P] for the reasons. Where [N]
goes further than [P], this ADR says so. This ADR does not intend to add design. Where it
interprets a note, it says so.

If Anna remembers a decision differently, her version is correct. Change this text.

The notes also mention "framing corrections" that were to be written down with the eight
decisions. The notes do not say what the corrections were. They are not in this ADR.

## Context

M2 adds opt-in sync between the devices of one user. The relay (the sync server) must never be able
to read the records. ADR 0005 defines the keys. This ADR records eight decisions about the relay and
the transport. It does not define the push and pull protocol.

The code has these parts on 2026-10-09:

- `core/lumi-sync-client` defines the wire envelope: format version, `WrapAlg`, six reserved header
  bytes and the size buckets. Sealing is a stub. There is no network code.
- `core/lumi-crdt` has the Hybrid Logical Clock (HLC), the op-log set-union, the LWW register and
  the LWW-element set.
- `server/lumi-sync-server` is an axum stub. It keeps blobs in memory. It has no authentication and
  no persistence.

## Decisions

### 1. Build a minimal relay. Do not adopt a replication engine.

- **Decision:** Finish `server/lumi-sync-server` as a small Rust/axum relay that stores opaque
  blobs. Do not adopt CouchDB/PouchDB, libSQL/Turso, Evolu or another engine.
- **Why:** [P] §2, the opaque-blob argument. A replication engine gets its value from reading the
  data. Lumi's data is ciphertext. An engine then adds its conflict model, its delete model and its
  operations cost, and gives no benefit. [P] §4: the envelope, the HLC and the merge primitives
  exist already, so the remaining server is small.
- **Evolu is a different case.** Evolu also has a relay that cannot read the data. [P] §2 gives
  other reasons against it: it puts a second data engine (TypeScript) into the app beside the Rust
  vault, its delete is a soft delete and not a crypto-shred, and the most critical component would
  depend on an external project. [P] keeps Evolu as prior art to read.
- **Source:** [P] §2 (recommendation). [N] confirms it.
- **Fallback named in [P]:** CouchDB, if the security review of the minimal relay is a larger risk
  than the Erlang operations.
- **Still open:** Idempotent push, replay protection and per-account authentication have no
  reference design ([P] §2, ADR 0001 §5 and §13). They need a first-party design and a security
  review before the relay ships.

### 2. Per-key LWW for settings.

- **Decision:** Settings merge with a per-key last-writer-wins (LWW) register.
- **Source:** [P] §3.2. [N]: "Per-key LWW for settings conflicts, awaiting Anna's product
  sign-off on silent lost-update acceptance".
- **Still open (product sign-off):** If two devices change the same key before they sync with each
  other, LWW keeps one change and drops the other change without a notice. Anna must accept or
  reject this behaviour.
- **Related recommendations in [P] §3.2 that the notes do not list:** append-only records (entries,
  measurements) merge by set-union of opaque ids. Custom tags use an LWW-element set keyed on the
  normalised label. Automerge is not used in M2. [P] asks that this ADR records the last point,
  because a comment in `core/lumi-crdt` says that Automerge lands in M2. ADR 0001 §4 also names
  Automerge for the tags and settings track. These three points stay recommendations until Anna
  confirms them.

### 3. Tombstone garbage collection by a fixed maximum age.

- **Decision:** The relay deletes a tombstone, and the blob that the tombstone replaced, after a
  fixed maximum age (TTL). The relay does not track which devices received the tombstone.
- **Source:** [P] §3.3 and §5 item 3 (TTL as the baseline). [N]: "Fixed max-age TTL tombstone GC
  (~90–180 days), with the dormant-device resurrection constraint noted".
- **Value:** The notes give a range of approximately 90 to 180 days. The exact value is not decided.
- **Constraint (named in the notes, not explained, not designed):** The notes name a
  "dormant-device resurrection constraint". Reading of this ADR: a device can stay offline for
  longer than the TTL. This device does not receive the tombstone. It can keep the deleted record,
  or it can send the record again. The notes do not say how the design handles this case.
- **Erasure:** The local crypto-shred is the Art. 17 erasure ([P] §3.3, ADR 0001 §4). Garbage
  collection on the relay is an optimisation. Product and legal text must not present server-side
  deletion as the guarantee.

### 4. Authentication with a device keypair and a signed challenge.

- **Decision:** An account is a random identifier. Each device has an Ed25519 keypair. The relay
  stores the account identifier and the public keys of the enrolled devices. A device proves
  possession of its private key when it signs a challenge from the relay. There is no email
  address, no phone number and no password. OPAQUE is not used.
- **Invariant (named in the notes):** auth keypair independence. [P] §3.4 (a) states it as: the
  authentication keypair is independent of the vault key (VK). [P] gives the purpose: keep ADR
  0001 §1 and the rule that nothing on the server can be reduced to the PIN. The crypto review must
  confirm the exact scope (VK only, or also the PIN and the recovery key).
- **Source:** [P] §3.4. [N]: "Device Ed25519 keypair auth with signed challenge and random account
  ID; OPAQUE shelved; auth keypair independence elevated to an ADR-0006 invariant".
- **Still open (crypto review):** [P] §3.4 lists three points. (a) Show that the keypair is
  independent of VK. (b) Review the recovery fetch, where the holder of the recovery key (RK)
  proves possession, so that it is not an oracle. (c) Enrolment authentication uses ADR 0005 Path 2
  and has the same post-quantum gate (ADR 0004 (c)).

### 5. No plaintext `created_at` on the wire.

- **Decision:** The synced envelope does not carry a plaintext `created_at`. The timestamp stays in
  the encrypted body and in the local index.
- **Limit of this decision:** The HLC stamp is then the only time value in the envelope. The stamp
  holds a wall-clock time in milliseconds (`Hlc.wall_ms` in `core/lumi-crdt`). So the relay still
  sees approximately when a record was made. [P] §3.5 item 3 recommends a coarser value on the
  wire. That recommendation is not one of the eight decisions.
- **Source:** [P] §3.5 item 2 and §5 item 5. [N]: "`created_at` kept off the wire entirely".
- **Effect on ADR 0005:** ADR 0005 (f) lists plaintext `created_at` in the data that the server
  sees. This decision is stricter. After confirmation, add a note to ADR 0005 (f).
- **Still open:** Check that the push path never copies the local `created_at` into the envelope
  ([P] §3.5).

### 6. Device revocation by vault-key rotation. The product states the limit.

- **Decision:** "Remove this device" is a user action. The client makes a new vault key (VK′) and
  wraps each content key again under VK′. The client does not seal the records again. The remaining
  devices receive VK′ through the channel of ADR 0005 Path 2. The relay deletes the public key of
  the removed device. If recovery is on, the relay replaces RK-wrapped-VK with RK-wrapped-VK′.
- **Safety requirement:** The product text must state the limit. Revocation stops later reads and
  all writes from the removed device. Revocation does not protect the records that the device
  pulled before.
- **Source:** [P] §3.6. [N]: "VK rotation revocation with retroactive-limit copy as a safety
  requirement".
- **Still open (crypto review, ADR 0005 Deferred item 1):** Confirm that a new wrap without a new
  seal is sound for the M1 scheme. Design a cutover that is atomic and idempotent across devices.
  Design the case of a device that is offline during the rotation.

### 7. Hosting: one Docker image on Hetzner in the EU. The operator is the controller.

- **Decision:** The relay is one Docker image that takes its configuration from the environment.
  The hosted instance runs on a Hetzner VPS in an EU region (Germany or Finland). A self-hosted
  instance uses the same image.
- **Working position on the controller:** The operator of the hosted instance is the controller of
  the connection metadata. [P] §3.7 says "controller (or joint controller)". ADR 0001 §5.1 keeps
  this as a working position until the legal sign-off.
- **Source:** [P] §3.7. [N]: "Single Docker image on Hetzner EU, operator-as-controller scoping".
- **Still open:** Pin the region. Keep backups in the EU. The operator needs the data processing
  agreement with Hetzner, the Art. 30 record and a breach process ([P] §3.7).

### 8. Recovery is on by default.

- **Decision:** A new account has recovery ON by default. Condition: onboarding has a mandatory
  step in which the user saves the recovery key and then proves that they have it.
- **Source:** [N]: "Recovery defaulting ON, contingent on mandatory save-and-verify onboarding".
  [P] §5 item 8 left this decision open. The notes give no reason for the choice.
- **Consequence (ADR 0005 (d) and (e)):** With recovery on, the relay stores RK-wrapped-VK. With
  recovery off, the relay stores no wrapped VK, and the loss of all devices is the loss of the
  data.
- **Effect on ADR 0005:** ADR 0005 presents recovery as an option that does not weaken the default
  posture. With this decision, the default posture is that the relay holds RK-wrapped-VK. After
  confirmation, update the Consequences section of ADR 0005.
- **Still open:** The notes do not say if the user can turn recovery off; ADR 0005 (d) says that
  the user chooses. The save-and-verify flow is not designed. ADR 0005 names it as a hard part.

## What this ADR does not decide

- The wire design for idempotent push and replay protection.
- The TTL value and the handling of a device that was offline for longer than the TTL.
- Other recommendations of [P], for example: the server sequence and the HLC as two separate
  orders, and the per-record schema (§3.1); a coarser HLC wall time on the wire, batching, timing
  jitter and log retention (§3.5); the storage backend of the relay (§3.7).
- The "framing corrections" (see _Provenance_).
- The PIN to keystore gating (the headline question of ADR 0005).
- The date when the ML-KEM layer ships (ADR 0004 (c)).

## Confirmation checklist

Anna confirms or corrects each decision.

- [ ] Decision 1 (minimal relay).
- [ ] Decision 2 (per-key LWW). The silent lost update is accepted as product behaviour.
- [ ] Decision 3 (TTL garbage collection).
- [ ] Decision 4 (device keypair, signed challenge, independence invariant).
- [ ] Decision 5 (no plaintext `created_at` on the wire).
- [ ] Decision 6 (revocation by VK rotation, limit stated in the product).
- [ ] Decision 7 (one image, Hetzner EU, operator as controller).
- [ ] Decision 8 (recovery on by default, with save-and-verify).

After confirmation: set the status, add the notes to ADR 0005 (decisions 5 and 8), and mark
`docs/m2-transport-proposal.md` as the analysis behind this ADR.

## Gates that this ADR does not remove

- ADR 0005 is "Proposed — NOT accepted; do not implement". It waits for an independent crypto
  review and for Anna's ratification. Decisions 4, 6 and 8 depend on it.
- The relay needs the controllership and lawful-basis sign-off of ADR 0001 §5.1 before it ships.
- The open points of [P] that each decision lists under "Still open".

## Appendix — the notes [N], verbatim

```text
Transport-layer decisions (eight, adjudicated; consolidating fold not yet executed)
- Build-minimal over adopting a replication engine (opaque-blob argument)
- Per-key LWW for settings conflicts, awaiting Anna's product sign-off on silent lost-update acceptance
- Fixed max-age TTL tombstone GC (~90–180 days), with the dormant-device resurrection constraint noted
- Device Ed25519 keypair auth with signed challenge and random account ID; OPAQUE shelved; auth keypair independence elevated to an ADR-0006 invariant
- `created_at` kept off the wire entirely
- VK rotation revocation with retroactive-limit copy as a safety requirement
- Single Docker image on Hetzner EU, operator-as-controller scoping
- Recovery defaulting ON, contingent on mandatory save-and-verify onboarding
```

## References

- ADR 0005 — M2 key model for zero-knowledge sync (Proposed).
- [`docs/m2-transport-proposal.md`](../m2-transport-proposal.md) — transport options and
  recommendations (review snapshot of 2026-06-15).
- ADR 0004 — M1 foundational decisions; (c) the post-quantum gate.
- ADR 0001 §1, §4, §5, §5.1, §13 — the invariants and the open items that this ADR relies on.
