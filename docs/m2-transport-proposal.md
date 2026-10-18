# M2 — Transport / server proposal (zero-knowledge sync)

> **STATUS: PROPOSAL (2026-06-15) — options + recommendations for review, NOT a ratified decision.**
> This is the analysis Anna and I work through; the ratified choices then become **ADR 0006** (the
> transport ADR), the way [`docs/m1-vertical-slice-proposal.md`](m1-vertical-slice-proposal.md)
> preceded ADR 0004.
>
> - **Date:** 2026-06-15
> - **Builds on:** **ADR 0005** (the key model — **Proposed, not yet ratified**, pending the
>   independent crypto review) and the **M2 canonical data-model assessment (2026-06-15)** (vault =
>   system of record + sync unit; drizzle demoted to a derived local query index).
> - **Method:** a 5-agent web-grounded research workflow (2026-06-15) — the replication-engine fork +
>   each sub-decision, judged against the fixed requirements below. **Maturity/feature claims are
>   marked verified vs reasoned-from-knowledge inline**; **the whole layer sits under the unratified
>   ADR 0005 and the not-yet-cleared ADR 0004(c) PQ gate** (flagged throughout).
> - **Scope guardrail:** documentation + research only — no code, no server scaffolded; no change to
>   the crypto crate, §1, panic handling, the native module, the C-ABI, or nitrogen-generated code.

## 0. TL;DR — the recommendations

| #            | Decision                                    | Recommendation                                                                                                                                                                            |
| ------------ | ------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **The fork** | Reuse a replication engine vs build minimal | **Build minimal** — a thin Rust/axum opaque-blob relay finishing the existing `lumi-sync-server` stub. The opaque-blob requirement neuters every general engine's value.                  |
| 3.1          | Sync protocol / data model                  | Per-account **append-only blob log** + monotonic **server cursor**; keep the locked `lumi-sync-client` envelope + `lumi-crdt` **HLC** for ordering. No engine.                            |
| 3.2          | Conflict resolution                         | **Two-track, using existing `lumi-crdt`:** op-log set-union for the append-only majority + per-key **LWW** for the small mutable surface (profile/settings/tags). **No Automerge in M2.** |
| 3.3          | Tombstones                                  | **Shred-then-tombstone:** crypto-shred locally (= the Art. 17 erasure), append a tombstone envelope that propagates on pull; **bounded GC** as an optimisation, not the erasure.          |
| 3.4          | Auth without identity                       | **Device Ed25519 keypair + signed-challenge; account = a random id. No email/phone/password.** OPAQUE rejected for the default (adds a password to the key path).                         |
| 3.5          | Metadata-minimisation                       | Keep the locked **size-buckets**; **do not sync a plaintext `created_at`** (keep it inside the encrypted body); coarsen the on-wire HLC; batch + jitter; minimal short-retention logs.    |
| 3.6          | Device revocation / VK rotation             | **User-initiated "remove device" → re-wrap content keys under VK′ (no re-seal) → redistribute via Path 2 → immediate server-side auth lockout.** Honest limit stated in product copy.     |
| 3.7          | Hosting / deployment                        | **One config-driven Docker image** of the Rust server; **hosted on a Hetzner EU VPS (DE/FI)**; self-host = same image. Reject hyperscaler.                                                |

**The single load-bearing call is the fork (§2).** Everything else is shaped by it, and "build minimal" is recommended precisely because the hard parts (the envelope, the HLC, the CRDT primitives) are **already built** (§4) — the server that remains is small.

## 1. Requirements the transport must meet (fixed up front)

Derived from ADR 0005 and the data model. **Everything below is judged against these.**

- **R1 — Opaque blob store + blind relay.** The server stores **opaque per-record ciphertext blobs** (the sync unit); the **RK-wrapped-VK only when recovery is on**; and **relays PQ pairing blobs it cannot read** (ADR 0005 Path 2/3).
- **R2 — Push/pull sync.**
- **R3 — Tombstones.** Propagate **deletes and crypto-shred** as tombstones.
- **R4 — Auth without rich identity.** Only an account's owner reads/writes its blobs, **without the server building a rich identity**.
- **R5 — Live within 0005(f)'s metadata reality.** The server _will_ see `record_id`, nonces, ciphertext sizes, cardinality, and (per 0005(f)) `created_at` — "zero-knowledge" = key+content confidentiality, **not** metadata. §3.5 then asks how much of that we can _reduce_.
- **Plus dimensions:** RN/mobile client integration · self-hostability · EU/GDPR residency · maturity · **solo-maintainer ops burden**.

## 2. The load-bearing fork — reuse an engine vs build minimal

> **Recommendation: build a minimal purpose-built sync layer** (Rust + axum + SQLite, finishing the existing `lumi-sync-server` stub). Conflict resolution is the estimate-buster, and the usual way to de-risk it is to reuse a proven engine — **but every proven engine earns its keep by _reading_ the data, and our data is an opaque blob.** The moment the body is ciphertext, those engines reduce to "a heavier blob store with a schema you must fight," and you inherit their conflict model, delete model, logging, and ops for **zero benefit**. Meanwhile the genuinely hard parts of sync — the envelope, the logical clock, the CRDT primitives — are **already built** (§4), so "minimal" here is genuinely minimal.

### Candidate comparison

| Candidate                     | Fit to opaque-blob (R1)                                               | Conflict vs append-mostly                                                          | Tombstones (R3)                              | RN client                                                                                              | Self-host / EU                          | Solo ops                               | Verdict                                             |
| ----------------------------- | --------------------------------------------------------------------- | ---------------------------------------------------------------------------------- | -------------------------------------------- | ------------------------------------------------------------------------------------------------------ | --------------------------------------- | -------------------------------------- | --------------------------------------------------- |
| **Minimal build** (Rust/axum) | **Exact** — it _is_ an opaque-blob log                                | You build only LWW+set-union (small; `lumi-crdt` exists)                           | First-class, by design                       | None needed (HTTP)                                                                                     | **Clean** (one binary)                  | **Lowest** — own a small server        | ✅ **Recommend**                                    |
| **CouchDB ↔ PouchDB**         | Works (1 blob/doc, ~33% base64)                                       | MVCC revision-tree is **dead weight** (we rarely conflict) + silent-winner footgun | **Strong** (`_deleted` propagates)           | **Real tax** — quick-crypto New-Arch issue, single-maintainer adapter, collides with our Nitro binding | Self-host yes; **Erlang ops**           | High (Erlang, db-per-user, compaction) | 🟡 Viable **fallback**                              |
| **libSQL / Turso**            | Wrong-shaped — syncs **rows the server reads**                        | Row last-push-wins; needs the **beta** Turso DB rewrite                            | **Undocumented**; resurrection risk          | Expo support not shipped; rides beta                                                                   | Offline-sync appears **Cloud-tethered** | Med–high; vendor coupling              | ❌ Not recommended                                  |
| **Evolu** (E2EE local-first)  | **Closest external match** — blind relay, SLIP-21 keys, HLC-CRDT, MIT | HLC-CRDT (same family as `lumi-crdt`)                                              | **Soft-delete** `isDeleted` (≠ crypto-shred) | TS engine **in-app** (two sources of truth vs Rust-vault SoR)                                          | Self-hostable                           | Med                                    | 🔭 **Elevate as comparator / prior-art**, not adopt |

**Swept and rejected** (one-line, verified where noted): **ElectricSQL** — read-path only, computes "Shapes" from _plaintext_ columns (incompatible). **cr-sqlite/vlcn** — plaintext-column CRDT (already rejected ADR 0001 §4) + stalled (last release Jan 2025). **RxDB** — JS DB + JS field-encryption in-app, duplicates the Rust-vault SoR. **Automerge-repo / y-sweet (Yjs)** — rich-doc CRDTs we don't need, not ZK by default, y-sweet hard-depends on S3. **Ditto** — proprietary/cloud, no clean self-host ZK tier. **Jazz** — E2EE is _optional_ not structural; its CoValue model fights our per-record hierarchy. **Matrix** — massive ops for 2–3 devices, state never GCs (hostile to tombstone GC).

**Why not just adopt Evolu (the one real contender):** it would put a **TypeScript SQLite+CRDT engine inside the RN app**, colliding with the settled decision that the **Rust vault is the system of record** (two sources of truth, or fighting Evolu's typed-column store to hold opaque blobs); its delete model is **soft-delete, not crypto-shred** (an R3 mismatch to bridge); and it makes the **highest-stakes component depend on an external project's keys/protocol/maturity**. **Recommendation: read the Evolu protocol as prior art and keep it as the external cross-check, but own the server.**

> **Verify before relying (engine fork):** the minimal build's **security trio — push idempotency + replay protection + per-account auth without rich identity** — has no single authoritative 2026 reference (ADR 0001 §5/§13) and is **build-from-spec for _every_ candidate including this one.** So the minimal build doesn't _add_ review burden — it concentrates it where it must happen anyway: **the independent crypto/security review.**

## 3. Sub-decisions — options + a recommendation for each

### 3.1 Sync protocol / data model — **recommend: append-only blob log + server cursor**

Keep the **already-locked** push/pull envelope (`lumi-sync-client`) and **HLC** (`lumi-crdt`); add only a thin **per-account append-only relay** stamping a **monotonic server-side delivery cursor**. Per-record server schema = the locked envelope columns and nothing more:

```
{ account_scope, server_seq (cursor), record_id (16 opaque bytes), device_id (16 opaque bytes),
  hlc_stamp, wrap_alg, wrapped_content_key, ciphertext (size-bucketed), row_kind {live | tombstone} }
```

- **Ordering: server `seq` for delivery, HLC for causality** — keeping them separate stops the server from learning causal structure (R5). _Rejected:_ vector clocks (heavier, unneeded); plain seq with no logical clock (loses cross-device causality).
- **Key-model fit:** this _is_ exactly what ADR 0005 says the server stores (ciphertext always; RK-wrapped-VK only if recovery on); the `device_id` is `lumi-crdt`'s **opaque random 16 bytes**, never identity-derived, so multi-device ordering does **not** build the rich identity R4 forbids; no key bytes touch the relay (§1).
- **⚠ Verify:** push **idempotency + replay protection** is unspecified (`lumi-sync-client` reserves 6 header bytes for it; ADR 0001 §5) — **needs first-party design + crypto review before the relay ships.** Single global `server_seq` vs per-device lane (recommend global; confirm no write-contention hotspot).

### 3.2 Conflict resolution — **recommend: two-track minimal, on existing `lumi-crdt` (no Automerge)**

- **Append-only majority** (mood entries, assessments — immutable, distinct ids) → **set-union by opaque id** (op-log). Two devices adding records create _distinct_ records → no conflict at all.
- **Small mutable surface** (profile/settings) → **per-key LWW register**; **custom tags** → **LWW-element-set** keyed on normalised label.
- **`lumi-crdt` is correctly scoped, not overkill** — it is already the minimal-correct answer for this data. **Automerge is deferred** (documented future seam only); pulling it in for single-user-multi-device with negligible mutable state is overkill and hurts size-minimisation.
- **Key-model fit:** convergence is by opaque `record_id`; merge runs **entirely client-side after decrypt** (the server adjudicates nothing) — zero-knowledge preserved; composes with VK rotation/crypto-shred without re-sealing.
- **⚠ Flag for Anna (product):** LWW means "my most recent change wins" for settings — **confirm that's the desired semantics** (acceptable lost-update on concurrent same-key edits across devices). Also: explicitly record in ADR 0006 that **Automerge is deferred**, so `lumi-crdt`'s own "Automerge lands in M2" note isn't read as a commitment.

### 3.3 Tombstones — **recommend: shred-then-tombstone + bounded GC**

1. Delete = **(a) crypto-shred locally** (destroy the wrapped content key → ciphertext permanently undecryptable; **this is the Art. 17 erasure**), then **(b) append a tombstone envelope** (same `record_id`, `row_kind=tombstone`, fresh HLC, empty ciphertext) → propagates on the normal pull → other devices apply it by shredding their copy.
2. **Bounded GC:** keep a tombstone until **causally stable** (all devices' pull cursors past it), then the server _may_ hard-delete both the tombstone and the now-useless blob. **GC is an optimisation, not the erasure** — erasure already happened cryptographically, so a conservative window (or a fixed max-age fallback) is safe.

- **Key-model fit:** the tombstone carries **no key material** and is VK-independent — safe for the server to relay and even retain.
- **⚠ Flags:** (i) GC's "min-acked-cursor across all devices" requires the server to learn **device-set membership** — brushing R4; prefer **opaque per-device cursor watermarks** under the account token, or a **fixed max-age TTL** that tracks no device set. (ii) **Erasure story for the DPIA:** the _local crypto-shred_ is the Art. 17 guarantee; server blob GC is best-effort — **product/legal copy must not over-claim server-side deletion.** (iii) **Interacts with 3.6:** a lost/stolen device that holds a live record and never receives the tombstone is the resurrection/access path — **tombstones alone do not solve revocation.**

### 3.4 Auth without identity leakage — **recommend: device keypair + signed challenge**

- **Account = a random 128/256-bit id.** Each device has an **Ed25519 keypair**; the server stores `account_id` + the set of enrolled device public keys; a device proves possession by **signing a server nonce** (or minting a short-TTL bearer after a signed challenge). **No email, no phone, no password.**
- **The three flows:** _creation_ → device mints `account_id` + keypair, registers the pubkey; _enrollment_ → the new device's pubkey is added over the **ADR 0005 Path 2** SAS/QR-authenticated channel (auth rides the trust the user already confirmed); _recovery fetch_ → the **RK holder proves possession** of the BIP39 RK (an RK-derived auth key) to release the RK-wrapped-VK (Path 3).
- _Rejected for the default:_ **OPAQUE aPAKE** — it is **mature** (RFC 9807, July 2025; `opaque-ke` 4.x, audited 2021, Argon2id KSF — _verified_), but it **adds a third user secret and tempts a password into the key path the model forbids.** Keep it on the shelf only if Anna later wants password cross-device login, under a hard rule that **its session key authenticates transport and never touches VK.** Bearer token (`account` = one secret) is acceptable only as an explicit **v0 simplification** (stored hashed, short-TTL, TLS-pinned).
- **⚠ Flag for Anna + crypto review:** (a) confirm the **auth keypair is provably independent of VK** (preserves §1 + "nothing server-held is PIN-crackable"); (b) approve the **RK-proof-of-possession recovery fetch as non-oracle** (reasoned-from-knowledge — _needs the review_); (c) enrollment auth **rides Path 2**, which inherits the not-cleared PQ gate (below).

### 3.5 Metadata-minimisation (addressing 0005(f)) — **recommend: keep buckets + stop syncing plaintext `created_at`**

Baseline = combine the already-built mitigations with one real improvement on 0005(f):

1. **Keep the locked size-bucketing** (`lumi-sync-client` buckets 256/1K/4K/16K/64K + pad/unpad) and the content-independent opaque ids — strong size-hiding for tiny records.
2. **Do not put a plaintext `created_at` on the wire.** The real timestamp stays **inside the encrypted body** (and the local-only query index); the synced envelope carries only the HLC. **This directly fixes the 0005(f) compounding leak** — 0005(f) _accepted_ a plaintext `created_at` describing the **M1 local store**, but the sync envelope can do better.
3. **Coarsen the server-visible HLC `wall_ms`** to the coarsest unit that keeps ordering stable (minute/hour plausible for a journal — _verify against HLC churn_).
4. **Batch pushes + add timing jitter**; **minimal, short-retention, content-free server logs** (the Art. 5(1)(c)/DPIA posture).

- _Deferred:_ **Padmé** padding instead of fixed buckets — a size/anonymity tradeoff that's a **format-version-gated migration**, not a baseline change.
- **⚠ Flags / verify:** confirm the push path **never promotes** the local `RecordRow.created_at` onto the wire (a one-line review before M2 push is written); confirm the **on-wire HLC can be coarsened while the local HLC stays fine-grained** without breaking `observe()`; **this is a place the transport can be _stronger_ than 0005(f) currently states** — worth reconciling into ADR 0006 (and a note back to 0005). The **connection-metadata leak (IP, timing)** remains a relay-controllership concern a stateless relay can reduce but not eliminate.

### 3.6 Device revocation / VK rotation (the ADR 0005 Deferred-1 item) — **recommend: rotate-and-redistribute, with an honest limit**

- **Mechanism:** user-initiated **"remove this device"** → **eager VK rotation by re-wrapping every per-record content key under a fresh VK′ — _no record re-seal_** (the M1 per-record hierarchy is unchanged, so this is valid) → **redistribute VK′ to the remaining good devices over the Path 2 channel** → **server-side: delete the removed device's auth pubkey (immediate write-side lockout)** + (if recovery on) replace `RK-wrapped-VK` with `RK-wrapped-VK′`.
- _Rejected:_ full re-encryption / re-seal every record (Option C) — heavier than the ADR intends, buys nothing against the actual threat.
- **The honest limit (must be in product copy):** revocation **stops future reads of new/updated data and all writes from the removed device, but cannot retroactively protect records that device already pulled** — for an append-only journal that's effectively all prior data. **"Remove device" is a forward-looking control, not a time machine.**
- **⚠ This is unratified key-model territory** (ADR 0005 names it as needing "real design, likely in the transport/server ADR or a dedicated follow-up") — treat this as a **proposal feeding that follow-up**, not settled. **Flags for the crypto review:** confirm **re-wrap-without-re-seal is sound** for the M1 XChaCha20-Poly1305 scheme (AAD binding, no nonce reuse from re-wrapping the content-key blobs); design **atomic/idempotent cutover** across multiple good devices + the **offline-device case** (avoid half-rotated vaults); redistribution **rides Path 2's PQ gate**. **Flag for Anna:** the retroactive-limit copy is a **privacy/safety requirement** given the named abuser/ex threat, not optional.

### 3.7 Hosting / deployment — **recommend: one Docker image, Hetzner EU, env-driven**

- **One config/env-driven Docker image** of the existing axum `lumi-sync-server`; **hosted instance on a Hetzner EU VPS pinned to a German (Nuremberg/Falkenstein) or Finnish (Helsinki) region**; **self-host = the identical image with the user's own env** → "hosted _or_ self-hosted, both from one codebase." Storage backend **env-selected** (SQLite/local for self-host simplicity; Postgres + EU object storage for the hosted instance) behind one interface.
- _Rejected for the default:_ hyperscaler (AWS/GCP/Azure) on CLOUD-Act/positioning grounds. EU managed PaaS (Scaleway/OVH/Fly EU) is an acceptable lower-ops fallback.
- **GDPR posture (verified — Hetzner):** EU data centres in DE + FI; **Art. 28 DPA in English** via portal; **ISO 27001:2022**; TOMs reviewed by TÜV Rheinland; German GmbH (**no CLOUD Act** for EU-stored data). Treat the server strictly as a **processor of opaque ciphertext + the 0005(f) metadata only.**
- **⚠ Flags:** **pin the region** (Hetzner Cloud also has US/Singapore regions — must be avoided) and confirm **EU-resident backups**; **Anna is the controller** (or joint controller) for the 0005(f) metadata and must hold the **DPA + Art. 30 record + breach process** — zero-knowledge reduces but does not remove this. The **PQ-blob relay (R1) inherits the not-cleared PQ gate** (below).

## 4. What's already built (why "minimal" is genuinely minimal)

The reuse inventory is the reason the recommendation leans build-not-adopt — the hard parts exist as tested M0 code:

- **`lumi-sync-client`** — the versioned wire **envelope**: `WrapAlg` (incl. the reserved hybrid seam), **size buckets** 256/1K/4K/16K/64K with pad/unpad, and **6 reserved header bytes for idempotency/replay**.
- **`lumi-crdt`** — the **HLC** clock and the **op-log set-union / LWW** primitives; **`DeviceId`/`RecordId` are random 16 bytes, never identity- or time-derived.**
- **`lumi-sync-server`** — the **axum stub** that already sketches the three endpoints.

So the server that remains is a **per-account append-only opaque log with a monotonic cursor + tombstone/GC** — small, and requiring **no CRDT/merge engine server-side** (convergence is client-side).

## 5. Decisions to make (work straight down this list)

1. **The fork** — accept **build-minimal**? _(Recommend yes; CouchDB is the fallback if the minimal-build security review worries you more than Erlang ops.)_
2. **Conflict semantics for settings** — accept **LWW "most recent wins"**? _(Recommend yes; needs your product sign-off on lost-update.)_
3. **Tombstone GC mechanism** — **opaque per-device cursor watermarks** vs a **fixed max-age TTL** (TTL tracks no device set — friendlier to R4). _(Recommend TTL baseline; watermarks later if needed.)_
4. **Auth** — accept **device keypair + signed challenge, account = random id, no PII**? _(Recommend yes; OPAQUE stays shelved.)_
5. **`created_at` on the wire** — accept **keeping it out of the synced envelope** (stronger than 0005(f))? _(Recommend yes; reconcile into ADR 0006 + a note to 0005.)_
6. **Revocation** — accept **rotate-VK′-and-redistribute + the stated retroactive limit**? _(Recommend yes; **feeds the 0005 Deferred-1 crypto-review follow-up**, not settled here.)_
7. **Hosting** — accept **one Docker image + Hetzner EU + you as metadata controller**? _(Recommend yes.)_
8. **Recovery default** — should new accounts default recovery **on or off**? _(Open — on = server holds RK-wrapped-VK′ but users can recover; off = zero server key material but total-loss = data-loss. Your call; interacts with 3.6 server cleanup.)_

## 6. Open questions / flags for Anna + the crypto review

- **Everything here sits under the unratified ADR 0005.** The auth (3.4), revocation (3.6), and recovery-fetch flows are **key-model territory** — they feed, and depend on, the independent crypto review.
- **The PQ maturity gate (ADR 0004(c)) is NOT cleared** (_verified 2026-06: `x-wing` 0.1.0-rc.0, `ml-kem` unaudited — neither ≥1.0/audited_). **Path 2 enrollment (3.4), VK′ redistribution (3.6), and the PQ-blob relay (R1) all inherit the interim: classical X25519 first, ML-KEM layer added when the crates mature** (ADR 0005 Path 2 sequencing).
- **The minimal-build security trio** (cursor + idempotent push + replay protection + per-account auth without rich identity) is **design-not-yet-validated** — the part that most needs the crypto/security review.
- **GDPR controllership:** as the hosted operator, Anna is the controller for the 0005(f) metadata (DPA + Art. 30 + breach process); the **crypto-shred = Art. 17, server GC = best-effort** distinction must land accurately in the privacy notice/DPIA.
- **Reasoned-from-knowledge (verify before relying):** the RK-proof-of-possession recovery design; the on-wire-HLC-coarsening-without-breaking-`observe()` claim; libSQL/Turso self-hostable offline-sync (couldn't fully verify — sources imply Cloud-tethered); Evolu's current release cadence + exact delete semantics. **Verified:** Hetzner EU/DPA/ISO; `opaque-ke` 4.x/RFC 9807; `x-wing`/`ml-kem` immaturity; PouchDB adapter v4.2.0 + the quick-crypto New-Arch tax.
