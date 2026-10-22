# M2 — Transport / server proposal (zero-knowledge sync)

> **Note (2026-10-18):** Rewritten in Simplified Technical English on 2026-10-18; decisions and section numbering unchanged.

The original status header:

> **STATUS: PROPOSAL (2026-06-15) — options + recommendations for review, NOT a ratified decision.**
> This is the analysis that Anna and I work through. The ratified choices then become **ADR 0006**
> (the transport ADR), in the same way that
> [`docs/m1-vertical-slice-proposal.md`](m1-vertical-slice-proposal.md) came before ADR 0004.
>
> - **Date:** 2026-06-15
> - **Builds on:** **ADR 0005** (the key model — **Proposed, not yet ratified**; it waits for the
>   independent crypto review) and the **M2 canonical data-model assessment (2026-06-15)** (vault =
>   system of record + sync unit; drizzle demoted to a derived local query index).
> - **Method:** a 5-agent web-grounded research workflow (2026-06-15): the replication-engine fork +
>   each sub-decision, judged against the fixed requirements below. **Maturity and feature claims
>   are marked inline as verified, or as reasoned from knowledge.** **The whole layer sits under the
>   unratified ADR 0005 and under the ADR 0004(c) PQ gate, which is not yet cleared** (flagged
>   throughout).
> - **Scope guardrail:** documentation + research only — no code, no server scaffold; no change to
>   the crypto crate, §1, panic handling, the native module, the C-ABI, or nitrogen-generated code.

## 0. TL;DR — the recommendations

| #            | Decision                                     | Recommendation                                                                                                                                                                                         |
| ------------ | -------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **The fork** | Reuse a replication engine, or build minimal | **Build minimal**: a thin Rust/axum opaque-blob relay that finishes the current `lumi-sync-server` stub. The opaque-blob requirement removes the value of every general engine.                        |
| 3.1          | Sync protocol / data model                   | Per-account **append-only blob log** + a monotonic **server cursor**. Keep the locked `lumi-sync-client` envelope and the `lumi-crdt` **HLC** for the order. No engine.                                |
| 3.2          | Conflict resolution                          | **2-track, on the current `lumi-crdt`:** op-log set-union for the append-only majority. Per-key **LWW** for the small mutable surface (profile/settings/tags). **No Automerge in M2.**                 |
| 3.3          | Tombstones                                   | **Shred, then tombstone:** crypto-shred locally (= the Article 17 erasure), then append a tombstone envelope that propagates on pull. **Bounded GC** is an optimisation, not the erasure.              |
| 3.4          | Auth without identity                        | **Device Ed25519 keypair + signed challenge; account = a random id. No email, phone or password.** The proposal rejects OPAQUE for the default (it adds a password to the key path).                   |
| 3.5          | Metadata minimisation                        | Keep the locked **size buckets**. **Do not sync a plaintext `created_at`** (keep it inside the encrypted body). Coarsen the on-wire HLC. Batch and jitter. Minimal short-retention logs.               |
| 3.6          | Device revocation / VK rotation              | **User-initiated "remove device" → wrap the content keys again under VK′ (no new seal) → redistribute through Path 2 → immediate server-side auth lockout.** The product copy states the honest limit. |
| 3.7          | Server host / deployment                     | **One config-driven Docker image** of the Rust server, **hosted on a Hetzner EU VPS (DE/FI)**; self-host = the same image. Reject AWS/GCP/Azure.                                                       |

**The single decisive call is the fork (§2).** The fork shapes everything else. The
recommendation is "build minimal" precisely because the hard parts (the envelope, the HLC, the CRDT
primitives) are **already built** (§4). The server that remains is small.

## 1. Requirements the transport must meet (fixed up front)

These come from ADR 0005 and the data model. **This proposal judges every option below against
them.**

- **R1 — Opaque blob store + blind relay.** The server stores **opaque per-record ciphertext blobs**
  (the sync unit), and the **RK-wrapped-VK only when recovery is on**. It **relays PQ pairing blobs
  that it cannot read** (ADR 0005 Path 2/3).
- **R2 — Push/pull sync.**
- **R3 — Tombstones.** Propagate **deletes and crypto-shreds** as tombstones.
- **R4 — Auth without rich identity.** Only the owner of an account reads and writes its blobs,
  **and the server does not build a rich identity**.
- **R5 — Live within the metadata reality of 0005(f).** The server _will_ see `record_id`, nonces,
  ciphertext sizes, cardinality and (per 0005(f)) `created_at`. "Zero-knowledge" = key and content
  confidentiality, **not** metadata. §3.5 then asks how much of that we can _reduce_.
- **More dimensions:** RN/mobile client integration · self-host option · EU/GDPR residency ·
  maturity · **solo-maintainer ops burden**.

## 2. The decisive fork — reuse an engine or build minimal

> **Recommendation: build a minimal purpose-built sync layer** (Rust + axum + SQLite, finishing the existing `lumi-sync-server` stub). Conflict resolution is the estimate-buster, and the usual way to de-risk it is to reuse a proven engine — **but every proven engine earns its keep by _reading_ the data, and our data is an opaque blob.** The moment the body is ciphertext, those engines reduce to "a heavier blob store with a schema you must fight," and you inherit their conflict model, delete model, logging, and ops for **zero benefit**. Meanwhile the genuinely hard parts of sync — the envelope, the logical clock, the CRDT primitives — are **already built** (§4), so "minimal" here is genuinely minimal.

### Candidate comparison

| Candidate                     | Fit to opaque blob (R1)                                               | Conflicts (append-mostly data)                                                                  | Tombstones (R3)                              | RN client                                                                                                          | Self-host / EU                                 | Solo ops                                   | Verdict                                                |
| ----------------------------- | --------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- | -------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------- | ------------------------------------------ | ------------------------------------------------------ |
| **Minimal build** (Rust/axum) | **Exact** — it _is_ an opaque-blob log                                | You build only LWW + set-union (small; `lumi-crdt` exists)                                      | First-class, by design                       | None needed (HTTP)                                                                                                 | **Clean** (one binary)                         | **Lowest** — own a small server            | ✅ **Recommend**                                       |
| **CouchDB ↔ PouchDB**         | Works (1 blob per doc, ~33% base64 overhead)                          | The MVCC revision tree is **dead weight** (we rarely conflict), and the silent winner is a trap | **Strong** (`_deleted` propagates)           | **Real tax**: the quick-crypto New-Arch issue, a single-maintainer adapter, and a collision with our Nitro binding | Self-host yes; **Erlang ops**                  | High (Erlang, one db per user, compaction) | 🟡 Viable **fallback**                                 |
| **libSQL / Turso**            | Wrong shape — it syncs **rows that the server reads**                 | Row last-push-wins; it needs the **beta** Turso DB rewrite                                      | **Undocumented**; resurrection risk          | Expo support not shipped; it rides a beta                                                                          | Offline sync appears **tethered to the Cloud** | Medium to high; tied to the vendor         | ❌ Not recommended                                     |
| **Evolu** (E2EE local-first)  | **Closest external match** — blind relay, SLIP-21 keys, HLC-CRDT, MIT | HLC-CRDT (the same family as `lumi-crdt`)                                                       | **Soft delete** `isDeleted` (≠ crypto-shred) | TS engine **in the app** (2 sources of truth against the Rust-vault SoR)                                           | Self-host possible                             | Medium                                     | 🔭 **Elevate as comparator / prior art**, do not adopt |

**Swept and rejected** (one line each, verified where noted):

- **ElectricSQL** — read-path only; it computes "Shapes" from _plaintext_ columns (incompatible).
- **`cr-sqlite`/`vlcn`** — plaintext-column CRDT (already rejected in ADR 0001 §4) and stalled
  (last release January 2025).
- **RxDB** — a JS DB with JS field encryption in the app; it duplicates the Rust-vault SoR.
- **Automerge-repo / y-sweet (Yjs)** — rich-document CRDTs that we do not need; not ZK by default;
  y-sweet has a hard dependency on S3.
- **Ditto** — proprietary / cloud; no clean self-host ZK tier.
- **Jazz** — E2EE is _optional_, not structural; its CoValue model fights our per-record hierarchy.
- **Matrix** — massive ops for 2–3 devices; state never GCs (hostile to tombstone GC).

**Why not adopt Evolu (the one real contender):** Evolu would put a **TypeScript SQLite+CRDT engine
inside the RN app**. That collides with the settled decision that the **Rust vault is the system of
record**. The result is 2 sources of truth, or a fight with the typed-column store of Evolu to hold
opaque blobs. Its delete model is **soft delete, not crypto-shred** (an R3 mismatch to bridge). And
it makes the **highest-stakes component depend on the keys, protocol and maturity of an external
project**. **Recommendation: read the Evolu protocol as prior art, keep it as the external
cross-check, but own the server.**

> **Verify before you rely on this (engine fork):** the minimal build has a **security trio: push
> idempotency, replay protection and per-account auth without rich identity.** No single
> authoritative 2026 reference covers it (ADR 0001 §5/§13), and it is **built from spec for _every_
> candidate, this one included.** So the minimal build does not _add_ review burden; it concentrates
> the burden where it must happen anyway: **the independent crypto/security review.**

## 3. Sub-decisions — options + a recommendation for each

### 3.1 Sync protocol / data model — **recommend: append-only blob log + server cursor**

Keep the **locked** push/pull envelope (`lumi-sync-client`) and the **HLC** (`lumi-crdt`). Add only
a thin **per-account append-only relay** that stamps a **monotonic server-side delivery cursor**.
The per-record server schema is the locked envelope columns and nothing more:

```text
{ account_scope, server_seq (cursor), record_id (16 opaque bytes), device_id (16 opaque bytes),
  hlc_stamp, wrap_alg, wrapped_content_key, ciphertext (size-bucketed), row_kind {live | tombstone} }
```

- **Order: the server `seq` for delivery, the HLC for causality.** Keep them separate: the server
  then does not learn the causal structure (R5). _Rejected:_ vector clocks (heavier, not needed); a
  plain seq without a logical clock (it loses the cross-device causality).
- **Key-model fit:** this _is_ exactly what ADR 0005 says the server stores (always the ciphertext;
  the RK-wrapped-VK only when recovery is on). The `device_id` is the **opaque random 16 bytes** of
  `lumi-crdt`, never derived from an identity. So the multi-device order does **not** build the rich
  identity that R4 forbids. No key bytes touch the relay (§1).
- **⚠ Verify:** push **idempotency and replay protection** have no specification yet
  (`lumi-sync-client` reserves 6 header bytes for them; ADR 0001 §5). **They need a first-party
  design and a crypto review before the relay ships.** One global `server_seq` compared with a lane
  per device: recommend global; confirm that there is no write-contention hotspot.

### 3.2 Conflict resolution — **recommend: 2-track minimal, on the current `lumi-crdt` (no Automerge)**

- **The append-only majority** (mood entries, assessments: immutable, distinct ids) → **set-union by
  opaque id** (op-log). When 2 devices add records, they make _distinct_ records. There is no
  conflict at all.
- **The small mutable surface** (profile/settings) → a **per-key LWW register**. **Custom tags** →
  an **LWW-element set** keyed on the normalised label.
- **`lumi-crdt` has the correct scope; it is not overkill.** It is already the minimal correct
  answer for this data. **Automerge is on hold** (a documented future seam only). Automerge for a
  single user with multiple devices and negligible mutable state is overkill, and it hurts the size
  minimisation.
- **Key-model fit:** convergence is by opaque `record_id`. The merge runs **entirely on the client
  after the decrypt** (the server adjudicates nothing): zero knowledge stays intact. It composes
  with VK rotation and crypto-shred without a new seal.
- **⚠ Flag for Anna (product):** LWW means "my most recent change wins" for settings. **Confirm
  that this is the wanted semantics** (an acceptable lost update on concurrent edits of the same
  key across devices). Also: record explicitly in ADR 0006 that **Automerge is on hold**, so that
  nobody reads the note "Automerge lands in M2" in `lumi-crdt` as a commitment.

### 3.3 Tombstones — **recommend: shred-then-tombstone + bounded GC**

1. A delete is **(a) a local crypto-shred**: destroy the wrapped content key, so that nobody can
   decrypt the ciphertext again. **This is the Article 17 erasure.** Then comes **(b) an appended
   tombstone envelope** (the same `record_id`, `row_kind=tombstone`, a fresh HLC, empty
   ciphertext). The tombstone propagates on the normal pull. The other devices apply it: they shred
   their copy.
2. **Bounded GC:** keep a tombstone until it is **causally stable** (the pull cursors of all devices
   are past it). Then the server can hard-delete the tombstone and the blob, which is now useless.
   **GC is an optimisation, not the erasure.** The erasure already happened cryptographically, so a
   conservative window (or a fixed max-age fallback) is safe.

- **Key-model fit:** the tombstone carries **no key material** and is independent of VK. The server
  can relay it and even keep it safely.
- **⚠ Flags:**
  - (i) The GC rule "minimum acknowledged cursor across all devices" requires that the server
    learns the **device-set membership**. That brushes R4. Prefer **opaque per-device cursor
    watermarks** under the account token, or a **fixed max-age TTL** that tracks no device set.
  - (ii) **The erasure story for the DPIA:** the _local crypto-shred_ is the Article 17 guarantee;
    the GC of server blobs is best-effort. **Product and legal copy must not over-claim server-side
    deletion.**
  - (iii) **Interaction with 3.6:** a lost or stolen device can hold a live record and never
    receive the tombstone. That device is the resurrection and access path. **Tombstones alone do
    not solve revocation.**

### 3.4 Auth without identity leakage — **recommend: device keypair + signed challenge**

- **An account is a random 128/256-bit id.** Each device has an **Ed25519 keypair**. The server
  stores the `account_id` and the set of enrolled device public keys. A device proves possession
  when it **signs a server nonce** (or it mints a short-TTL bearer token after a signed challenge).
  **No email, no phone, no password.**
- **The 3 flows:**
  - _Creation:_ the device mints the `account_id` and the keypair, and registers the public key.
  - _Enrolment:_ the new device registers its public key over the **ADR 0005 Path 2**
    SAS/QR-authenticated channel. The auth rides the trust that the user already confirmed.
  - _Recovery fetch:_ the **RK holder proves possession** of the BIP39 RK (an RK-derived auth key)
    to release the RK-wrapped-VK (Path 3).
- _Rejected for the default:_ **OPAQUE aPAKE**. It is **mature** (RFC 9807, July 2025; `opaque-ke`
  4.x, audited 2021, Argon2id KSF; _verified_). But it **adds a third user secret, and it tempts a
  password into the key path that the model forbids.** Keep it on the shelf only if Anna later
  wants a password login across devices. Then a hard rule applies: **its session key authenticates
  the transport and never touches VK.** A bearer token (`account` = one secret) is acceptable only
  as an explicit **v0 simplification** (stored hashed, short TTL, TLS-pinned).
- **⚠ Flag for Anna and the crypto review:**
  - (a) Confirm that the **auth keypair is provably independent of VK** (this keeps §1 and the rule
    "nothing that the server holds is PIN-crackable").
  - (b) Approve the **RK proof-of-possession recovery fetch as non-oracle** (reasoned from
    knowledge; _it needs the review_).
  - (c) The enrolment auth **rides Path 2**, which inherits the PQ gate that is not cleared (below).

### 3.5 Metadata-minimisation (for 0005(f)) — **recommend: keep buckets + stop the sync of plaintext `created_at`**

The baseline combines the mitigations that exist already with one real improvement on 0005(f):

1. **Keep the locked size buckets** (`lumi-sync-client` buckets 256/1K/4K/16K/64K with
   `pad`/`unpad`) and the content-independent opaque ids. They hide the size of tiny records well.
2. **Do not put a plaintext `created_at` on the wire.** The real timestamp stays **inside the
   encrypted body** (and in the local-only query index). The synced envelope carries only the HLC.
   **This directly fixes the compound leak of 0005(f).** 0005(f) _accepted_ a plaintext
   `created_at` for the **M1 local store**, but the sync envelope can do better.
3. **Coarsen the server-visible HLC `wall_ms`** to the coarsest unit that keeps the order stable. A
   minute or an hour is plausible for a journal; _verify against the HLC churn_.
4. **Batch the pushes and add timing jitter.** **Minimal, short-retention, content-free server
   logs** (the Article 5(1)(c) and DPIA posture).

- _Deferred:_ **"Padmé" padding** instead of fixed buckets. That is a size/anonymity trade-off and
  a **format-version-gated migration**, not a baseline change.
- **⚠ Flags / verify:** confirm that the push path **never promotes** the local
  `RecordRow.created_at` onto the wire (a one-line review before anyone writes the M2 push).
  Confirm that **the on-wire HLC can be coarser while the local HLC stays fine-grained**, without a
  break of `observe()`. **Here the transport can be _stronger_ than what 0005(f) states today.**
  Reconcile this into ADR 0006 (and a note back to 0005). The **connection-metadata leak (IP,
  timing)** stays a relay-controllership concern; a stateless relay can reduce it but not remove
  it.

### 3.6 Device revocation / VK rotation (the ADR 0005 Deferred-1 item) — **recommend: rotate-and-redistribute, with an honest limit**

- **Mechanism:**
  1. The user starts **"remove this device"**.
  2. **Eager VK rotation:** wrap every per-record content key again under a fresh VK′. **No record
     re-seal** (the M1 per-record hierarchy is unchanged, so this is valid).
  3. **Redistribute VK′ to the other good devices over the Path 2 channel.**
  4. **On the server: delete the auth public key of the removed device (immediate write-side
     lockout).** If recovery is on, replace `RK-wrapped-VK` with `RK-wrapped-VK′`.
- _Rejected:_ a full re-encryption, that is, a new seal of every record (Option C). It is heavier
  than the ADR intends, and it buys nothing against the actual threat.
- **The honest limit (it must be in the product copy):** revocation **stops future reads of new or
  updated data. It stops all writes from the removed device. It cannot protect the records that the
  device already pulled.** For an append-only journal, that is in effect all prior data. **"Remove
  device" is a forward control, not a time machine.**
- **⚠ This is unratified key-model territory.** ADR 0005 names it as a point that needs "real
  design, likely in the transport/server ADR or a dedicated follow-up". Treat this as a **proposal
  that feeds that follow-up**, not as settled. **Flags for the crypto review:** confirm that **a new
  wrap without a new seal is sound** for the M1 XChaCha20-Poly1305 scheme. That means AAD binding
  and no nonce reuse from the new wrap of the content-key blobs. Design the **atomic and idempotent cutover**
  across multiple good devices and the **offline-device case** (avoid half-rotated vaults). The
  redistribution **rides the PQ gate of Path 2**. **Flag for Anna:** the retroactive-limit copy is
  a **privacy and safety requirement**, given the named abuser/ex threat; it is not optional.

### 3.7 Hosting / deployment — **recommend: one Docker image, Hetzner EU, env-driven**

- **One config/env-driven Docker image** of the current axum `lumi-sync-server`. **The hosted
  instance runs on a Hetzner EU VPS, pinned to a German (Nuremberg/Falkenstein) or Finnish
  (Helsinki) region.** **Self-host = the identical image with the user's own env**: "hosted _or_
  self-hosted, both from one codebase." The storage backend is **env-selected** (SQLite/local for a
  simple self-host; Postgres + EU object storage for the hosted instance) behind one interface.
- _Rejected for the default:_ a hyperscale cloud (AWS/GCP/Azure), on CLOUD Act and strategic
  grounds. An EU managed PaaS (Scaleway/OVH/Fly EU) is an acceptable fallback with lower ops.
- **GDPR posture (verified: Hetzner):** EU data centres in DE and FI. An **Article 28 DPA in
  English** through the portal. **ISO 27001:2022**, with TOMs that TÜV Rheinland reviewed. A German
  GmbH (**no CLOUD Act** for data stored in the EU). Treat the server strictly as a **processor of
  opaque ciphertext and the 0005(f) metadata only.**
- **⚠ Flags:** **pin the region** (Hetzner Cloud also has US and Singapore regions; avoid them) and
  confirm **EU-resident backups**. **Anna is the controller** (or joint controller) for the 0005(f)
  metadata. She must hold the **DPA, the Article 30 record and the breach process**. Zero
  knowledge reduces this but does not remove it. The **PQ-blob relay (R1) inherits the PQ gate that
  is not cleared** (below).

## 4. What is already built (why "minimal" is genuinely minimal)

The reuse inventory is the reason why the recommendation leans to build, not adopt. The hard parts
exist as tested M0 code:

- **`lumi-sync-client`** — the versioned wire **envelope**. It holds `WrapAlg` (with the reserved
  hybrid seam) and the **size buckets** 256/1K/4K/16K/64K with `pad`/`unpad`. It also reserves
  **6 header bytes for idempotency and replay**.
- **`lumi-crdt`** — the **HLC** clock and the **op-log set-union / LWW** primitives.
  **`DeviceId`/`RecordId` are random 16 bytes, never derived from an identity or a time.**
- **`lumi-sync-server`** — the **axum stub** that already sketches the 3 endpoints.

So the server that remains is a **per-account append-only opaque log with a monotonic cursor, plus
tombstones and GC**. It is small, and it needs **no CRDT or merge engine on the server**
(convergence happens on the client).

## 5. Decisions to make (work straight down this list)

1. **The fork** — accept **build-minimal**? _(Recommend yes. CouchDB is the fallback if the security
   review of the minimal build worries you more than Erlang ops.)_
2. **Conflict semantics for settings** — accept **LWW "most recent wins"**? _(Recommend yes. It
   needs your product sign-off on the lost update.)_
3. **Tombstone GC mechanism** — **opaque per-device cursor watermarks** compared with a **fixed
   max-age TTL**. The TTL tracks no device set, which is friendlier to R4. _(Recommend the TTL as
   the baseline; watermarks later if needed.)_
4. **Auth** — accept **device keypair + signed challenge, account = random id, no PII**?
   _(Recommend yes. OPAQUE stays on the shelf.)_
5. **`created_at` on the wire** — accept that it **stays out of the synced envelope** (stronger than
   0005(f))? _(Recommend yes. Reconcile it into ADR 0006 and add a note to 0005.)_
6. **Revocation** — accept **rotate VK′ and redistribute, with the stated retroactive limit**?
   _(Recommend yes. It **feeds the 0005 Deferred-1 crypto-review follow-up**; it is not settled
   here.)_
7. **Hosting** — accept **one Docker image + Hetzner EU + you as the metadata controller**?
   _(Recommend yes.)_
8. **Recovery default** — do new accounts default to recovery **on or off**? _(Open. On = the server
   holds RK-wrapped-VK′, but users can recover. Off = zero key material on the server, but a total
   loss of devices = data loss. Your call; it interacts with the 3.6 server clean-up.)_

## 6. Open questions / flags for Anna + the crypto review

- **All of this sits under the unratified ADR 0005.** The auth (3.4), the revocation (3.6) and the
  recovery-fetch flows are **key-model territory**. They feed, and depend on, the independent
  crypto review.
- **The PQ maturity gate (ADR 0004(c)) is NOT cleared.** _Verified 2026-06: `x-wing` 0.1.0-rc.0,
  `ml-kem` not audited; neither is ≥1.0 or audited._ **Path 2 enrolment (3.4), the VK′
  redistribution (3.6) and the PQ-blob relay (R1) all inherit the interim.** That is classical
  X25519 first, then the ML-KEM layer when the crates mature (ADR 0005 Path 2 sequence).
- **The minimal-build security trio** (cursor + idempotent push + replay protection + per-account
  auth without rich identity) is **a design without validation yet**. It is the part that most
  needs the crypto/security review.
- **GDPR controllership:** as the hosted operator, Anna is the controller for the 0005(f) metadata
  (DPA + Article 30 record + breach process). The distinction **crypto-shred = Article 17, server
  GC = best-effort** must land accurately in the privacy notice and the DPIA.
- **Reasoned from knowledge (verify before you rely on it):**
  - the RK proof-of-possession recovery design;
  - the claim that the on-wire HLC can be coarser without a break of `observe()`;
  - libSQL/Turso offline sync on a self-host (not fully verified; the sources imply a tether to the
    Cloud);
  - the current release cadence and the exact delete semantics of Evolu.
- **Verified:** Hetzner EU/DPA/ISO; `opaque-ke` 4.x/RFC 9807; the immaturity of `x-wing`/`ml-kem`.
  Also verified: the PouchDB adapter v4.2.0 and the quick-crypto New-Arch tax.
