# ADR 0001 — Lumi cross-platform architecture (Milestone 0)

- **Status:** **Ratified** (2026-06-13) — M0 step (b) in progress. See the sign-off record
  below. The shared Rust core, the locked crypto/sync design, and the
  *defer-the-UI-lock-to-M3 + spikes + A-native-fallback* strategy are
  approved. Five conditions (sign-off record) must be reflected before
  scaffolding, and the **CMP-vs-Flutter-vs-D** choice stays open pending the M1
  spikes and the **watchOS-in-v1** product call.
- **Date:** 2026-06-13
- **Decision owners:** Anna (clinical / product / final UI-framework sign-off),
  engineering (architecture).
- **Supersedes:** the current single-codebase Expo / React Native app
  (Expo SDK 56, RN 0.85, expo-router, SQLCipher + Drizzle).
- **Evidence base:** a 17-agent research + adversarial-judge workflow run on
  2026-06-13 against current (mid-2026) framework/crate maturity, plus a direct
  read of the existing repo. Per-axis conclusions and the judge scoreboard are
  summarised inline; concrete repo facts are cited as `file:line`.

> **Process note.** This milestone produces *this document only*. The ADR is now
> accepted with conditions (sign-off record below); **scaffolding still waits**
> until those five conditions are reflected here and confirmed. The brief's M0
> acceptance ("ADR merged; CI green on an empty scaffold; SBOM produced") is
> satisfied in two steps: **(a) this ADR (accepted-with-conditions)**, then
> **(b) scaffold + CI + SBOM** as the immediately-following M0 task. The
> monorepo/CI shape does **not** need the final framework pick — the Rust core,
> server, tokens, and CI matrix are framework-independent; only `apps/` is
> finalised at M3.

---

## Sign-off record (2026-06-13)

Anna reviewed this ADR and **signed off with conditions.**

**Approved:** the shared Rust core; the locked crypto/sync design; and the strategy
of **deferring the irreversible UI lock to the M2→M3 boundary**, gated on four
de-risking spikes, with **A-native** as the principled fallback.

**Five conditions to reflect before any scaffolding:**
1. **Sync-relay controllership.** Add a controllership + lawful-basis analysis for
   the *sync relay itself*, separate from the research-toggle Art. 9 work — even
   ciphertext-only, the relay processes connection metadata (IP, timing, cadence)
   = personal data. → §5.1.
2. **Crypto-shredding = the Art. 17 erasure mechanism.** Erasure is effected by
   **destroying the per-record content key** (ciphertext becomes permanently
   unrecoverable), not merely by tombstones + remote blob deletion. → §4.
3. **Watch is phone-enrolled, not a first-class device.** Provisioned by the
   paired phone over WCSession, sealed by the watch's own Secure Enclave, with
   **no on-device Argon2id and no recovery code on the watch.** Drop the watch
   from the Argon2id spike. → §3, §10, §13.
4. **Reserve space in the M0 on-wire format.** Generous reserved fields + explicit
   versioning so the M1 replay/idempotency review can extend the format **without
   a migration.** → §5.
5. **The Jest suite is a behavioural *spec*, not a runnable asset** — record it as
   a specification of behaviours to re-implement, not tests that carry over. → §14.

**UI-direction refinements:**
- **Compose Multiplatform and Flutter are co-equal hybrid candidates**, decided by
  the **gate-2 binding-maturity evaluation** — Flutter is *not* a fallback. → §2.4.
- **Spike #2 (iOS VoiceOver) is empowered to push most iOS screens to native
  SwiftUI.** So "E-hybrid" realistically = **CMP/Flutter for Android+desktop +
  native-heavy iOS** — this is the plan, not a risk. → §2.4.

**Open product decision (recorded):** does **watchOS ship in v1 or defer?** If it
can defer, **option D-rn warrants reconsideration** (watchOS was its main
disqualifier). → §12.

**Follow-up (2026-06-13).** Anna **deferred watchOS from v1** and **held
scaffolding** pending review of these revisions. Consequences, now reflected
below: (i) v1 is **mobile-first (Android + iOS)**; desktop and watch are post-v1
milestones with their own framework decisions; (ii) deferring watchOS removes
D-rn's structural disqualifier, so the UI decision is **reopened with a revised
recommendation — keep React Native for the v1 mobile surface (D-rn)** — see
**§2.4 Revision**; (iii) nothing is scaffolded until Anna confirms these
revisions.

**Ratification (2026-06-13 #2).** Both parked questions answered; the ADR is now
**acted on**:
- **Q1 (UI) — ratified:** **D-rn (keep React Native) for v1, scoped MOBILE-ONLY —
  Android + iOS (iPad via the iOS build).** Desktop (Windows/macOS/Linux) and
  watchOS are **post-v1** milestones, each with its own framework decision (§2.4a /
  §12); the §2.4a all-platform analysis is **not** acted on now. M1–M3 go entirely
  to the core, sync, and migration. Rationale on record: the rebuild's value is the
  audited Rust core + zero-knowledge sync + migration, not a UI rewrite; D-rn is the
  only path reusing the existing accessible UI + test suite; RN's **native**
  accessibility tree is a strength for EN 301 549 / WCAG 2.2 AA, not a compromise.
- **Q1 condition — spike #1 is a HARD GO/NO-GO gate** (not a checkbox): see §13.
- **Q2 (scaffold) — green-lit:** M0 step (b), the framework-independent foundation
  only; `apps/` stays **empty** until spike #1 passes and M3.
- **Interoperability (record-only, do NOT build):** the eventual API/interop layer
  maps to **FHIR / SMART on FHIR / Open mHealth** at the boundary, Rust-native event
  model kept internal — see **ADR 0002** (stub). The schema must not foreclose it.

---

## 0. What is locked vs open

| Area | Status | Where |
|---|---|---|
| Scope = full cross-platform rebuild, staged | **Locked** (Decision 1) | brief §5 |
| Unlock = biometric + PIN + recovery code (= migration secret) | **Locked** (Decision 2) | §3 |
| PHQ-9/GAD-7 = minimal legal-only framing changes | **Locked** (Decision 3) | §13 |
| Shared **Rust core** holds all crypto/data/sync/merge/validation | **Locked** | §1 |
| Local store = SQLite + app-layer per-record encryption (SQLCipher = defence-in-depth) | **Locked** (refined here) | §3, §4 |
| Zero-knowledge, opt-in, ciphertext-only sync server | **Locked** | §5 |
| Crypto crate stack + key hierarchy parameters | **Recommended-lock** (this ADR) | §3 |
| Two-track merge (op-log + Automerge) | **Recommended-lock** (this ADR) | §4 |
| **UI framework** | **Reopened after watchOS deferral** — revised rec = **D-rn (keep RN)** for v1 mobile; broad-surface/native deferred to desktop+watch scope | **§2** |
| Platform scope | **watchOS DEFERRED from v1; v1 = mobile-first (Android + iOS)**; desktop = post-v1 | §12 |

---

## 1. The shared Rust core (locked)

One audited Rust crate (`lumi-core`) owns **everything security- or
correctness-critical**, so the sensitive surface is written and audited *once*
instead of N times:

- **Crypto & key hierarchy** — KDF, AEAD, key wrap/unwrap, vault/content keys,
  rekey (§3).
- **Data model & validation** — the four entities, ported from the careful
  boundary checks in `src/db/backup.ts` (`asEntry`/`asMeasurement`) and
  `src/db/repo.ts`.
- **Sync & merge** — op-log + CRDT, Hybrid Logical Clock, conflict resolution (§4).
- **Domain logic** — the pure functions in `src/model.ts`
  (`aggregateDay`, `buildWeek`/`buildMonth`, `daysBetween`, `czPlural`, WHO-5
  interpretation) and `src/features/measure/scoring.ts`. These carry a subtle
  contract that **must survive the language port**: **local-day, not UTC**, date
  semantics (`toISODate` uses `getFullYear/Month/Date`; `daysBetween` computes
  "přes poledne" to survive DST). This is a correctness invariant, not an
  implementation detail.

The UI (whatever §2 decides) is a **thin client**: it renders state and forwards
intent. **It never holds raw key material.** The FFI surface is narrow and
high-level — it returns *handles* and *plaintext domain objects*, **never raw key
bytes**. (This is the explicit fix for the current anti-pattern at
`src/db/connect.ts:23`, which interpolates the raw hex DB key straight into
`PRAGMA key` from JS.)

**Distribution (UniFFI, locked):**
- UniFFI **proc-macro mode** → Swift (one xcframework for
  iOS/iPadOS/macOS/watchOS/tvOS) + Kotlin (Android/wearOS via `cargo-ndk` `.aar`).
- **Web/wasm:** `wasm-bindgen` for the crypto core initially (most battle-tested);
  evaluate `uniffi-bindgen-javascript` only as it matures.
- **Toolchain:** Rust ≥ 1.95 **stable** Tier-2 watchOS/tvOS device+sim targets;
  explicitly drop `arm64_32` (old watches) and the x86_64 watch-sim to stay
  **nightly-free**. Pin the UniFFI version; bump deliberately (0.x has breaking
  minors); gate binding regeneration in CI.

---

## 2. UI framework — the deferred decision (signed off as a *process*)

### 2.1 The shortlist

| | Option | Broad surface | watch/wear | Desktop |
|---|---|---|---|---|
| **A** | Native everywhere | SwiftUI (Apple) + Compose (Android) | native | WinUI / GTK |
| **B** | Compose Multiplatform | CMP (Android/iOS/desktop) | native SwiftUI | CMP-desktop |
| **C** | Flutter | Flutter (mobile/desktop/web) | native SwiftUI | Flutter-desktop |
| **D** | Stay React Native | RN + rn-windows/macos | **none (no watchOS)** | rn-windows/macos |
| **E** | **Hybrid** | CMP **or** Flutter | native SwiftUI shim | CMP/Flutter or Tauri |

All five sit on the same locked Rust core; they differ only in the UI layer.

### 2.2 Adversarial judge scoreboard (sum across 6 lenses, 0–10 each)

```
E-hybrid 48.5  >  B-compose 43.5  >  C-flutter 40.0  >  A-native 37.5  >  D-rn 32.5
```

Per-lens winners tell the real story — **the aggregate and the quality lenses disagree:**

| Lens | Winner | A | B | C | D | E |
|---|---|---|---|---|---|---|
| Maintenance burden (solo) | **E** | 2 | 7 | 6 | 4 | **8** |
| Accessibility (EN 301 549) | **A** | **9** | 7 | 6 | 5 | 8 |
| Security boundary / auditability | **A** | **8.5** | 7.5 | 6 | 4.5 | 7.5 |
| Platform reach (incl. watchOS) | **A** | **10** | 8 | 8 | 4 | 10 |
| Bespoke design-system fidelity | **C/E** | 6 | 9 | **10** | 6 | **10** |
| Time-to-M3 / delivery risk | **D** | 2 | 5 | 4 | **9** | 5 |

**Read this honestly:** E-hybrid wins on the *proxy* metric (number of UI
codebases kept green) and design fidelity. **A-native wins every lens that maps to
Lumi's hard, legal, existential constraints** — accessibility, the
zero-knowledge security boundary, and watchOS reach. D-rn wins only the
first-platform sprint. There is no free lunch; the choice is a priority ordering.

### 2.3 The maintenance-burden analysis (the brief's required deliverable)

- **watch/wear is native in *every* option.** SwiftUI watchOS + Compose wearOS
  are unavoidable. So the only real lever is the *broad* surface. This shrinks
  A-native's apparent disadvantage and E-hybrid's apparent advantage.
- **A-native is not "7 codebases."** It is realistically **one SwiftUI codebase**
  (iOS/iPadOS/macOS/watchOS/tvOS) + **one Compose codebase** (Android/wearOS),
  with design tokens code-generated from a single source (Style Dictionary →
  `ios-swift` + `compose/object` + `css`). The genuine extra cost is the
  **desktop tier** (Windows/Linux) — adding WinUI + GTK is what makes A
  unsustainable for a solo dev, *not* the mobile native UIs.
- **E-hybrid's maintenance win is partly illusory** (the decisive skeptic
  finding, independently verified): JetBrains' own guidance says
  *accessibility-critical iOS screens should be native SwiftUI under CMP*. For
  Lumi the a11y-critical screens are **most of the app** (crisis interstitial,
  MoodPicker, check-in, questionnaires). So E-hybrid quietly becomes "A-native
  for the screens that matter + CMP for the easy screens" — more seams than the
  score implies, eroding screen-by-screen on every failed a11y audit.
- **The real recurring solo-maintainer cost for *this* app** is not codebase
  count — it is **(a)** the per-release screen-reader verification loop on a
  *synthesized* accessibility tree (canvas frameworks: "no semantics = no
  accessibility"), and **(b)** a security-critical **third-party** Rust↔Kotlin
  binding. E-hybrid maximises both relative to A-native.
- **Sunk cost is real but small relative to the horizon.** Today's app is
  ~6,200 LOC of UI/DS + ~1,500 LOC of tests, all RN/TS. Every option except D
  discards the UI and rewrites the RTL/better-sqlite3 test suite. The TS→Rust
  *core* port is paid equally by **all** options, so it is not a differentiator.

### 2.4 Recommendation

> **REVISION (2026-06-13 — watchOS deferred from v1).** Deferring watchOS removes
> the one platform D-rn structurally cannot serve and recasts v1 as
> **mobile-first (Android + iOS)**. The rebuild's *value* is the audited Rust
> security core + zero-knowledge sync + the data migration — **not** a UI rewrite.
> Revised recommendation:
>
> **Keep React Native for the v1 mobile surface (option D-rn). Bind the Rust core
> via `uniffi-bindgen-react-native` (JSI); reuse the existing UI, design system,
> and test suite; spend M1–M3 entirely on the security core, sync, and migration.
> Treat desktop (Windows / macOS / Linux) and watch as post-v1 milestones, each
> with its own framework decision (rn-windows vs a Tauri / web shell over the same
> core vs native). Re-evaluate a broad-surface rewrite (CMP / Flutter) or A-native
> only when desktop + watch become committed scope.**

Why this now wins **for v1**:
1. **Fastest, lowest-risk M3 with full reuse** — ~6,200 LOC of accessible,
   token-faithful UI + ~1,500 LOC of tests + the team's skills carry over. The
   TS→Rust *core* port is paid by every option anyway, so it is not a
   differentiator; D-rn is the only option that does not *also* pay a full UI
   rewrite.
2. **The security objection largely dissolves in the rebuilt design.** D-rn's low
   security score reflected the *current* anti-pattern (raw hex key into `PRAGMA`
   from JS, `src/db/connect.ts:23`). The locked architecture (§1) keeps **all**
   crypto in the core and returns **handles / plaintext only, never raw key
   bytes** — keys never enter the JS heap. Residual risk is the pre-1.0
   `uniffi-bindgen-react-native` binder: pin + spike it like any binding.
3. **Mobile a11y is a *strength*, not a gap.** RN renders to the **native**
   accessibility tree (VoiceOver / TalkBack) — the gold-standard default — whereas
   CMP/Flutter need a *synthesized* tree hand-annotated per screen. D-rn's a11y
   score was dragged down only by watchOS/Linux, both now out of v1. (The two
   latent gaps in §11 — `MoodShape` `accessible={false}`, `Button` opacity
   disabled — are fixed regardless of framework.)
4. **It defers the high-regret, expensive UI rewrite** until desktop/watch scope
   is actually real — the same defer-don't-guess principle behind the framework
   lock.

Trade-offs accepted: **desktop is not solved by this choice.** rn-windows is a
candidate but its EN 301 549 desktop a11y is unproven; rn-macos carries an
RN-version downgrade tax; Linux has no first-class RN path. Desktop is an explicit
later milestone. If desktop + watch later become must-haves *together*, the
broad-surface (CMP/Flutter) or A-native analysis below is the path — and because
the Rust core is framework-independent, that pivot costs the **UI only**, not the
security foundation.

*The all-platform analysis below stands unchanged as the basis for the
**desktop + watch milestone** decision.*

---

#### 2.4a All-platform analysis (for the desktop + watch milestone)

> **Adopt the *hybrid* shape — Rust core + one broad-surface framework + native
> SwiftUI watch — and (a) defer the irreversible lock to the M2→M3 boundary,
> (b) gate it on the de-risking spikes (§2.5/§13), (c) keep A-native as the
> named fallback.
> Compose Multiplatform and Flutter are co-equal broad-surface candidates,
> decided by the gate-2 binding-maturity evaluation (§2.5). Embrace that spike #2
> may push most iOS screens to native SwiftUI: "E-hybrid" realistically means
> CMP/Flutter for Android+desktop + native-heavy iOS.**

Rationale, in order of weight:

1. **Defer the lock — it costs nothing.** M1 (core: data + crypto) and M2
   (zero-knowledge sync + recovery) are **100% framework-independent**. The UI
   choice does not bite until M3. So we lock the *direction* now (E-hybrid/CMP)
   and the *irreversible* choice at M3, after the spikes below resolve the
   medium-confidence claims it rests on. This is not hedging — it is sequencing a
   high-regret decision behind the cheap experiments that de-risk it, using
   milestone boundaries the brief already defines.

2. **CMP vs Flutter is decided by gate-2, not pre-judged.** On the *security
   boundary* (the most existential lens for a zero-knowledge vault) Compose leads
   (7.5 vs 6): **one** UniFFI-KMP binding serves JVM (Android/desktop) +
   Kotlin/Native (iOS), keys stay in typed compiled heaps, no JS/webview — *but*
   that binding is third-party and bus-factor-1 (gate 2). Flutter's
   `flutter_rust_bridge` is more established yet adds a **second** binding and a
   **Dart key heap**, against best design fidelity + the most mature desktop +
   one toolchain. The gate-2 binding-maturity spike (CMP UniFFI-KMP / `gobley` vs
   `flutter_rust_bridge`) resolves this; **both stay live until then.**

3. **A-native is the principled fallback.** If the a11y bar is truly
   absolute-per-platform, A-native is more defensible — it won a11y (9),
   security (8.5), and reach (10). The recommendation is E-hybrid *because* a
   solo maintainer realistically *sustains* compliant a11y on one broad surface
   better than they sustain four drifting native UIs — but that judgement is
   Anna's to make (§2.6).

### 2.5 Four hard gates (binding if a broad-surface rewrite is chosen)

*For the revised v1 = D-rn path, only gate 1 (a11y CI gate — without the SwiftUI
fallback, since RN uses the native a11y tree) and gate 2 (pin the binding) apply;
gates 3–4 belong to the desktop+watch milestone.* These are **conditions of the
decision, not aspirations**:

1. **A11y is a blocking CI/release gate, not a vibe.** Per-screen real-device
   VoiceOver / TalkBack / Narrator / Orca + switch-control pass list, with a
   per-screen sign-off checklist. Any iOS screen that fails the synthesized-tree
   audit **falls back to native SwiftUI** — budget the crisis interstitial,
   MoodPicker, check-in, and questionnaires as *possibly-native up front*.
2. **Pin and vendor the Rust↔Kotlin binding.** The CMP UniFFI-KMP generator is
   third-party and **bus-factor-1** (the named `UbiqueInnovation` lineage appears
   stale; active work moved to `gobley`). Evaluate `gobley` vs alternatives vs a
   hand-written UniFFI-C/Swift + Kotlin-cinterop path **before** committing; pin,
   vendor, and gate regen in CI. Keep the FFI narrow (handles/plaintext only).
3. **Validate Linux/Orca end-to-end before publishing the accessibility
   statement.** CMP-desktop Orca behaviour on the exact target distro
   (GTK4 ≥ GNOME 48 / Ubuntu 25.x) must be proven, **or Linux is scoped out of
   the statement honestly.** Publishing a zák. 424/2023 statement that is false
   on Linux is a legal/credibility liability.
4. **Treat the SwiftUI watch shim + Kotlin ramp as real front-loaded costs**, not
   footnotes. The team knows RN/TS, not Kotlin/Swift.

### 2.6 The question for sign-off — *resolved, see the sign-off record + §2.4 Revision*

The original fork (below) was a **priority ordering** only Anna could set; with
watchOS deferred it resolved to **D-rn for v1 mobile** (§2.4). Kept for the record:

- **E-hybrid / CMP (recommended)** — one sustainable broad surface; accepts a
  disciplined a11y verification loop and a vendored binding.
- **A-native** — the a11y + security ceiling; accepts a SwiftUI + a Compose
  codebase + a credible desktop a11y story as honest, visible cost.
- **D-rn scoped to Android/iOS/Windows** — fastest, lowest-risk first ship,
  reuses the entire existing codebase + tests; **explicitly defers**
  macOS/Linux/watchOS.

This is asked in the accompanying message.

---

## 3. Crypto & key hierarchy (recommended-lock)

Implements brief Decision 2. **Concrete, current-2026 crate stack:**

| Role | Crate / algorithm | Parameters |
|---|---|---|
| KDF (PIN/passphrase, recovery) | `argon2` 0.5.x — **Argon2id**, RFC 9106 | floor **m = 64 MiB, t = 3, p = 1**; time-cost auto-tuned at first run to a fixed unlock-latency budget; params stored in the PHC string. **Benchmark on the weakest target that actually runs it = low-end Android, in M1.** The **watch does not run Argon2id** (it is phone-enrolled — see below), so it is out of this spike. |
| AEAD (content) | `chacha20poly1305` 0.10.x — **XChaCha20-Poly1305** (default) | **fresh random 24-byte nonce per record**; bind `record_id + version` as **AAD**. Feature-gated `aes-gcm` (AES-256-GCM) path only where AES-NI dominates. |
| Device keypair | `x25519-dalek` 2.0.x | hardware-backed where the OS allows (§10). |
| Key wrap (enrolment re-wrap) | **HPKE base-mode** (RFC 9180, X25519-HKDF-SHA256), age-style recipient wrapping | start with `hpke-rs` / `rust-hpke`. |
| Hygiene | `zeroize` 1.8.x (`ZeroizeOnDrop` on every key/plaintext buffer) + `subtle` (constant-time compare) | — |

**Key hierarchy:** random **vault key** (account root) → wraps **per-record
content keys** (one per entry/measurement) → records encrypted with
XChaCha20-Poly1305. Vault key stored **wrapped twice**: under the Argon2id PIN
key and under the recovery key. Biometric unlock releases an OS-keystore-held
copy (§10).

**Watch enrolment (resolved — condition 3).** The watch is **not** a first-class
independently-enrolled device. The paired phone **provisions** the watch's
vault-key copy over WCSession; that copy is sealed by the **watch's own Secure
Enclave** and released under watch biometrics/passcode. The watch **never runs
Argon2id and never holds the recovery code.** It can still create entries offline
(it carries op-log + HLC + content-key generation locally, §4); those sync via the
phone. This keeps the heavy KDF + the high-value recovery secret off the
constrained, easily-lost device.

**Post-quantum seam (now), PQ crypto (later):** the wrapped-key envelope carries a
**versioned `wrap_alg` discriminator** and length-flexible recipient bytes so an
X25519 envelope and a future **X-Wing (X25519 + ML-KEM-768)** envelope coexist.
**Ship X25519-only.** Do **not** depend on unaudited `ml-kem` / `hpke-ng` in
production until ≥ 1 independent audit lands.

**Rekey (S7):** vault-key rotation + re-wrap of **every** content-key envelope,
**driven by the core** — *not* SQLCipher `PRAGMA rekey`. Must also re-encrypt the
Automerge snapshots (§4) — two tracks, easy to miss one. Must be **atomic /
crash-safe** (a half-rekeyed vault must not brick the app) and define
multi-device ordering (device A rekeys while B is offline → B enrolls under which
vault key?). See open item §13.

**Storage posture (refined lock):** all *authoritative* encryption is **app-layer
per-record content keys + wrapped envelopes** (this is what syncs). SQLCipher is
**optional at-rest defence-in-depth**, not the security boundary.

---

## 4. Data model → encrypted records + two-track merge (recommended-lock)

The four current entities (`drizzle/0000_init.sql`) map cleanly. Each row becomes
an **encrypted record** with its own content key; **all search/aggregation is
client-side after decryption** (the full DB is local anyway).

| Entity | Mutability | Merge track |
|---|---|---|
| `entries` (check-ins) | append-only | **Track 1: op-log** |
| `measurements` (WHO-5/PHQ-9/GAD-7) | append-only | **Track 1: op-log** |
| `tags` (custom labels) | mutable set | **Track 2: Automerge OR-set** |
| `settings` (profile + prefs) | mutable registers | **Track 2: Automerge LWW registers** |

**Track 1 — append-only op-log** (immutable check-ins): one ciphertext blob per
record, keyed by an **opaque random record id** stamped with a **Hybrid Logical
Clock** (physical time + counter + device id). Convergence = set-union of unseen
record ids. No CRDT library needed. **HLC replaces the current `Date.now()`-prefix
ordering** (`src/db/repo.ts`, `src/store.tsx:44`) — see the migration note below;
this is a *behavioural change* `lastEntryForDate`/`listEntries` ordering and tests
rely on.

**Track 2 — Automerge** (`automerge-rs` 3.0+ with `autosurgeon`
`derive(Reconcile/Hydrate)`): two tiny documents (tags set, settings registers).
Real concurrent-edit convergence via LWW registers / OR-set; `save()` (compact) +
re-encrypt the whole small doc per change. **Not `cr-sqlite`** (stalled since
early 2025; operates on plaintext columns — incompatible with a ciphertext-only
server).

**Two CRDT-granularity decisions to make (§13):** (a) is each `settings` *key* an
independent register (so concurrent edits to `name` on phone and `share` on
desktop both survive), or is the whole profile one register (last-writer
clobbers)? The current single-blob shape (`readProfile` reads all keys as one
object) would **silently lose concurrent edits** — recommend **per-key
registers**. (b) `tags` has a SQL `UNIQUE(label)` constraint
(`tags_label_unique`); an OR-set can concurrently add the same label on two
devices → unique-violation on merge. Recommend **merge-by-normalised-label**
(dedupe on convergence, keep earliest HLC).

**Right-to-erasure (GDPR Art. 17) — crypto-shredding is the named mechanism
(condition 2).** Erasure is effected by **destroying the per-record content key**,
which renders that record's ciphertext **permanently unrecoverable everywhere** —
local store, sync relay, and any lingering blob copy — *without needing to trust a
remote delete*. Tombstone ops still propagate (so every device drops the record
and the relay garbage-collects the now-useless blob), but the **legal erasure
guarantee rests on key destruction**, not on the server honouring a delete. This
composes with rekey (§3). It must reconcile with the research-share opt-in and any
already-exported plaintext backup. The schema already flags this data as Art. 9
special category (`src/db/schema.ts:1`).

---

## 5. Zero-knowledge sync server (locked)

Stateless **Rust + axum** over object storage. Two endpoints:
`push(blob, opaque-metadata)` and `pull(since-cursor)`. The server stores **only**:
opaque record id, opaque device id, logical-clock cursor, blob hash, wrapped-key
envelope, and **padded ciphertext**. It can decrypt nothing. Devices reconcile
entirely client-side after decryption.

**Metadata minimisation is a hard requirement** (for a mental-health app, *timing
and frequency are themselves clinical signal*):
- **Content-independent random** record/device ids (the current
  `Date.now()`-derived ids would leak check-in wall-clock timing — see §6).
- **Fixed-size length-padding** (PURB-style buckets) so a WHO-5 result is
  indistinguishable from a mood check-in by ciphertext length.
- **Optional push batching / jitter** to blur frequency.
- Decide and document **replay protection + idempotent push** (no single 2026
  reference covers cursor + idempotency + replay end-to-end — needs first-party
  security review, §13) and **what the relay logs/retains** (IP, timestamps,
  retention policy) — a stateless relay still sees connecting-device IP + timing.

**On-wire format reserves space (condition 4).** The envelope/wire format is fixed
at M0, but it carries **explicit version fields + generous reserved/extension
fields** so the M1 replay-protection + idempotency review (and future PQ
`wrap_alg` values, §3) can extend it **without a data migration**. Padding-bucket
sizing is decided at M0 (changing it later *is* a migration); replay/idempotency
semantics ride the reserved space.

### 5.1 Sync-relay controllership + lawful basis (condition 1)

Distinct from the on-device data (publisher is **not** a controller) and from the
research egress (which would make the publisher a controller of Art. 9 health
data): **operating the relay is itself a processing activity.** The relay
processes **connection metadata** — IP address, timestamps, sync cadence, opaque
device/record ids, ciphertext sizes — which is **personal data** even though it
can read no content. So for the relay the operator is a **controller of that
metadata** (not of Art. 9 health data — content stays ciphertext-only). Working
position **for legal sign-off (`TODO(Anna)`):** lawful basis = Art. 6(1)(b)
(performing the sync the user explicitly opted into), reinforced by 6(1)(f); hard
data-minimisation (Art. 5(1)(c)) via the §5 measures (opaque ids, length-padding,
timing jitter, minimal short-retention logs, no content); a transparency line in
the privacy notice; and a DPIA touch-point because the underlying service is
mental-health. Required **before the relay ships**, not before the local app ships
(sync is opt-in and later).

---

## 6. Migration from the current SQLCipher DB

This is a **real, destructive, must-not-lose-data, must-be-atomic** migration for
existing v0.1.0 users — not greenfield.

1. **One-time encrypted backup first**, then integrity-check, keep the old DB
   until the new store verifies, then securely delete.
2. Open the old DB with the existing key (`getOrCreateDbKey`, `PRAGMA key`),
   read rows via the existing schema, **re-encrypt each row** under the new
   per-record content-key hierarchy, write into the new local store.
3. **Bootstrap the key hierarchy without locking anyone out.** Today's key uses
   `requireAuthentication:false` (`src/db/key.ts:19`) — **no PIN, no biometric
   gate exists.** Existing users have never set a PIN. The migration must
   onboard them into PIN/Argon2id + recovery-code + biometric **without** making
   a forgotten PIN a data-loss event (brief: "do not make a forgotten PIN an
   automatic data-loss event"). Recovery code is the humane backstop; biometric
   is the daily path.
4. **ID remapping.** Current ids embed `Date.now()` and ordering depends on it.
   New ids are opaque-random + HLC. The migration must map old→new stably so
   dedup-by-id and import keep working, and re-express ordering via HLC.
5. **Abandon `PRAGMA rekey`** in favour of core-driven rekey; decide whether
   SQLCipher stays as at-rest defence-in-depth or is dropped (recommend: keep).
6. **Reconcile the plaintext JSON backup** (`src/db/backup.ts`): replace
   export-by-default with **encrypted backup under the recovery key** (S2);
   import must merge into the op-log + CRDT tracks, **not** raw `INSERT`, or it
   corrupts the merge model; `BACKUP_VERSION` needs a migration path once
   tombstones/HLC exist.

Preserve the local-day date semantics and the `aggregateDay`/week/month logic (§1).

---

## 7. Monorepo / workspace layout (proposed)

```
lumi/
  core/                     # Rust workspace — the locked shared core
    lumi-core/              #   data model, crypto, key hierarchy, op-log + HLC
    lumi-crdt/              #   Automerge track (tags/settings)
    lumi-sync-client/       #   push/pull, padding, envelope format
    lumi-ffi/               #   UniFFI proc-macro surface (Swift + Kotlin)
    lumi-wasm/              #   wasm-bindgen surface (web)
  server/
    lumi-sync-server/       # stateless axum, ciphertext-only (opt-in)
  apps/
    <broad-surface>/        # CMP (recommended) — Android/iOS/desktop
    watch-ios/              # native SwiftUI watchOS
    wear-android/           # Compose wearOS (if in scope, §12)
  design/
    tokens/                 # single token source -> Style Dictionary codegen
  docs/
    adr/                    # this document + successors
    intended-purpose.md     # MDR wellbeing-not-diagnosis statement (§13)
    accessibility.md        # EN 301 549 statement (per-platform truth, §10/§11)
  .github/workflows/        # multi-OS CI matrix (§8)
```

Exact `apps/` shape is finalised at the §2 sign-off + M3.

---

## 8. CI / supply-chain / SBOM (S10) — currently **absent**, build from zero

Verified: there are **no** `.github/workflows`; `dependabot.yml` is the stock
npm-only template; `SECURITY.md` (if present) is boilerplate. M0 deliverables:

- **GitHub Actions matrix** across macOS + Linux + Windows runners building
  every artifact (xcframework, `cargo-ndk` `.aar`, MSVC `.dll`/`.lib`, `.wasm`).
- **Dependency scanning:** `cargo-audit` / `cargo-deny` (RUSTSEC) for Rust +
  `npm audit` (and the Kotlin/Dart side per §2) — **fix `dependabot.yml`** to add
  the `cargo` and `github-actions` ecosystems alongside `npm`, with grouping.
- **SBOM:** CycloneDX (or SPDX) generated **per release artifact** (EAA / health
  posture).
- **Reproducible/pinned toolchain:** pin Rust (1.95 stable for the new watchOS/
  tvOS Tier-2 targets), UniFFI, and `wasm-bindgen`.
- **Real `SECURITY.md`** with a vuln-disclosure contact and an explicit
  **audit-gap disclosure** for unaudited crates (`argon2`, `x25519-dalek` 2.x,
  any future `ml-kem`/`hpke`).
- **No sensitive logging in release (S12):** strip logs; never log key / PRAGMA /
  paths. The single current offender is `src/db/provider.tsx:28`
  (`console.error("…databázi se nepodařilo otevřít", err)`).

---

## 9. Security requirements S1–S12 → design mapping

| # | Requirement | Satisfied by |
|---|---|---|
| S1 | Key non-extractable without user presence (was `requireAuthentication:false`) | §3 hierarchy + §10 hardware keystore + biometric/PIN gate |
| S2 | Encrypted export by default (was plaintext JSON) | §6 — recovery-key-wrapped export; plaintext only behind a 2nd explicit confirm |
| S3 | No unencrypted web persistence (was cleartext wasm) | §1 wasm core: WebCrypto + Argon2id encrypt-before-persist; prod web build guard fails if health data unencrypted |
| S4 | App-lock + inactivity timeout + lock-on-background | M4 app-shell capability, all platforms |
| S5 | Exclude DB & keys from cloud backup | Android `dataExtractionRules`/`allowBackup=false`; iOS `isExcludedFromBackup`; per-OS equivalents |
| S6 | Screen-capture / task-switcher protection | §10 matrix (honest per-platform truth, incl. macOS 15+ / Linux gaps) |
| S7 | Key rotation / rekey | §3 core-driven vault rotation + re-wrap (both tracks) |
| S8 | Route/consent guards; non-skippable PHQ-9 item-9 interstitial; deep-link validation | centralised guard in the nav layer; preserve current item-9 behaviour (`PHQ9_RISK_QUESTION_INDEX`, `src/features/measure/definitions.ts:66`) |
| S9 | IME / clipboard hygiene on sensitive inputs | disable autocorrect/learning; no programmatic clipboard of sensitive text (or auto-clear) |
| S10 | Supply-chain hygiene | §8 |
| S11 | Optional, non-blocking root/jailbreak + integrity heuristic | M6 defence-in-depth; warn, never hard-block (a11y / false-positive safety) |
| S12 | No sensitive logging in production | §8; fix `src/db/provider.tsx:28` |

---

## 10. Per-platform secure storage (S1) + capture protection (S6)

This is a **native-shim layer below whatever UI wins** — ~6 shims
(iOS, macOS, Android, watchOS, Windows, Linux), **roughly framework-independent**,
so it is a tie-breaker, not a decider. **Crypto stays in the core**; the shim only
(a) creates the hardware device keypair that wraps the at-rest vault-key copy and
(b) gates its release with biometrics.

| Platform | Key storage (S1) | Capture protection (S6) |
|---|---|---|
| iOS / iPadOS | Keychain `WhenUnlockedThisDeviceOnly` + Secure Enclave keypair, `.biometryCurrentSet` | app-switcher blur + secure-text rendering — **best-effort, document it** |
| macOS | Keychain + Secure Enclave (Apple silicon) | **DEGRADED on macOS 15+** (ScreenCaptureKit ignores flags) — auto-blur-on-background + require-unlock; document |
| Android / wearOS | Keystore + **StrongBox** where available; `setUserAuthenticationRequired(true)`; **`AUTH_BIOMETRIC_STRONG` (Class 3) only** — fall back to fingerprint/device-credential on Samsung Class-2 face, with clear Czech UX | `FLAG_SECURE` + `setRecentsScreenshotEnabled(false)` |
| Windows | DPAPI / Credential Manager + **TPM** + Windows Hello | `WDA_EXCLUDEFROMCAPTURE` (`SetWindowDisplayAffinity`) |
| Linux | Secret Service / libsecret (**software-only — document weaker hardware story**); rely on core PIN/Argon2id-wrapped vault key; optional TPM2 backend opt-in | **ABSENT under Wayland/X11** — no per-window exclude; document; auto-blur-on-background |
| watchOS | **Phone-provisioned** vault-key copy (WCSession) sealed by the watch's **own Secure Enclave**; no Argon2id, no recovery code on-device (§3) | native |

**Apple `.biometryCurrentSet` / Android `setInvalidatedByBiometricEnrollment`
invalidate the key on biometric re-enrolment** — this is a *feature* (anti-coercion)
but makes the **recovery code the only way back in**, which is why the recovery-code
UX (§13) is the highest-stakes flow in the product.

---

## 11. Accessibility verification (EN 301 549 / WCAG 2.2 AA)

Legal duty (EU Accessibility Act / Czech zák. 424/2023, in force 2025-06-28).
**Any canvas/synthesized-tree option (B/C/E) is non-compliant *by default*** for
the bespoke color+shape encoding. Two latent gaps **already exist in the current
RN app** and must not be carried forward:

- **`src/components/MoodShape.tsx:63`** renders the mood shape with
  `accessible={false}`, and `HomeScreen` draws it with no label — so the "never
  color alone" invariant is satisfied **visually only**; a screen reader gets
  nothing. On a synthesized tree this is worse (the node may not exist at all).
  **Every mood shape must carry an explicit accessibility label**, verified on
  real screen readers per screen.
- **`src/ds/Button.tsx:142`** uses `disabled: { opacity: 0.45 }`, which
  **violates** the locked rule (disabled = outline + ink, never opacity). Only
  the dominant CTA component currently follows the rule. Make outline+ink a
  **lint/test invariant** so it cannot regress in the new toolkit.

**Operationalised gate (M3+):** per-screen real-device VoiceOver / TalkBack /
Narrator / Orca + switch-control pass list with sign-off; automated matchers per
framework (CMP: `semantics`/`testTag` + XCTest; Flutter: `AccessibilityGuideline`
+ DCM; RN: existing `eslint-plugin-react-native-a11y` + Detox/Maestro). **Linux/
Orca validated on the exact target distro before the statement is published.**

---

## 12. Platform scope — IN / DEFERRED / OUT (recommended default)

**Decided (2026-06-13): v1 is mobile-first; watchOS deferred.**

| Platform | Recommendation | Note |
|---|---|---|
| Android, iOS (+ iPadOS) | **IN — v1 (M3)** | mobile-first; revised rec = D-rn keeps RN (§2.4); iPadOS falls out of iOS |
| Windows | **Post-v1 milestone** | own framework decision: rn-windows vs Tauri/web-over-core vs native |
| macOS | **Post-v1 milestone** | rn-macos downgrade tax; Tauri/native candidate; own decision |
| Linux | **Post-v1, gated** | only if Orca validates (§11), else statement scoped out honestly |
| watchOS | **DEFERRED (post-v1)** | native SwiftUI when committed; deferral reopened D-rn for v1 (§2.4) |
| Web (wasm core) | **DEFERRED** | architecture supports it; CMP-web a11y is Beta ("initial" only) — not EAA-grade today. Ship when an a11y-grade path exists. |
| wearOS | **DEFERRED** | Compose wearOS when Android is stable |
| tvOS | **OUT (revisit)** | low product value; same native-shim cost as watchOS |

The desktop + watch milestone reopens the §2.4a all-platform analysis (broad
surface vs A-native) — to be decided when that scope is committed.

---

## 13. Open items for Anna (`TODO(Anna)`) + de-risking spikes

**Clinical / product / legal (Anna owns):**
- Descriptive / baseline-relative measurement band wording (Decision 3 — the
  current `src/features/measure/scoring.ts` bands like *"středně závažné
  příznaky"* are the clinical-severity labels to relabel; code restructuring is
  ours, final Czech is hers).
- Recovery-code explainer + the data-loss/migration caveat copy (Decision 2);
  the **lockout dark-path UX** (biometric re-enrol + lost recovery code =
  permanent loss) needs clinical sign-off for vulnerable users.
- Validate WHO-5 / PHQ-9 / GAD-7 wording vs validated Czech versions
  (existing `TODO(Anna)` in `definitions.ts`).
- Re-verify crisis lines / hours / chat each release. Current hardcoded set
  (116 111, 116 123, 606 021 021 **with hours**, 155, 112) lives across
  `model.ts`, `crisisCard.ts`, `HelpScreen`, `HandoverScreen`, `AgeStep`;
  consider adding **116 006** (Bílý kruh). Keep hardcoded as offline fallback,
  make the list **remotely verifiable/updatable**.
- DPIA + Art. 9(2)(a) consent + Art. 89 safeguards sign-off **before** any
  research egress; the "Data pro výzkum" toggle stays **OFF and inert**, gated by
  `TODO(Anna)`.
- **Sync-relay controllership + lawful-basis** sign-off (§5.1) **before the relay
  ships** — separate from the research-egress analysis above.
- Intended-purpose statement ("wellbeing/self-reflection, not
  diagnosis/screening/treatment") in `docs/`.
- **The UI-framework sign-off (§2.6).**

**Engineering open items the ADR names (resolved in M1–M2, not deferred):**
recovery-code + rekey UX/blast-radius; sync-server replay/idempotency/retention;
tombstone propagation; CRDT granularity (per-key registers; unique-label merge);
test strategy (§14). *(The watchOS key-hierarchy seam is now **resolved** —
phone-provisioned via WCSession, SE-sealed, no Argon2id/recovery code on-device,
local op-log+HLC for offline writes — §3.)*

**De-risking spikes — re-prioritised for the revised v1 = D-rn mobile path
(2026-06-13).** The watchOS and broad-surface spikes move to the desktop+watch
milestone.

*M1 spikes for the v1 mobile path (D-rn):*
1. **`uniffi-bindgen-react-native` binding — HARD GO/NO-GO GATE for D-rn-for-v1.**
   Run **early in M1** and **report the outcome before** building out the RN↔core
   integration further. **Pass criteria (all required):** (a) builds + runs against
   the current RN New Architecture / RN version; (b) the FFI returns **handles /
   plaintext domain objects ONLY — verify NO raw key bytes cross into the JS heap**
   (the §1 invariant); (c) the binder can be **pinned and vendored**. **On fail or
   flake on any criterion: do NOT work around it silently — stop, report, and
   reopen the v1 UI decision to the §2.4a broad-surface analysis** (CMP/Flutter via
   the gate-2 binding-maturity evaluation).
2. **Argon2id 64 MiB on low-end Android** — confirm the unlock-latency budget;
   decide per-platform params if needed. (**Watch excluded** — phone-enrolled, §3.)

*Deferred to the desktop + watch milestone (the §2.4a all-platform decision):*
3. **Rust 1.95 watchOS/tvOS link** — xcframework on a real watch (run when watchOS
   is committed).
4. **iOS VoiceOver (CMP and Flutter)** — only if a broad-surface rewrite is
   reconsidered; **empowered to push most iOS screens to native SwiftUI** (§2.4a).
   *(N/A while v1 stays on RN's native a11y tree.)*
5. **Broad-surface-desktop Orca on the target Linux distro** (gate 3).
6. **Gate-2 binding-maturity evaluation** — CMP UniFFI-KMP (`gobley` vs the named
   fork) vs Flutter `flutter_rust_bridge`; chooses CMP vs Flutter **if** a
   broad-surface rewrite is taken for desktop (§2.4a).

---

## 14. Test strategy for the new core

The current better-sqlite3 DI harness (`test/helpers/testDb.ts`) and ~100 RTL/
unit scenarios are recorded as a **behavioural specification** (condition 5). Their
disposition now depends on the v1 path:
- **Revised v1 = D-rn (keep RN):** the suite is **retained and extended as a
  runnable asset** — the migration is core/crypto/sync, not UI. The DI harness's
  `connectDb` mock is repointed at the Rust core; the RTL UI flows keep running.
  *(This retention is itself an argument for D-rn.)*
- **Re-platform options (CMP/Flutter/A-native), if ever taken for desktop+watch:**
  condition 5 applies in full — the suite is a spec to **re-implement**, not a
  runnable asset.

Either way the existing flows — `test/app.test.tsx`, `measure.test.tsx`,
`tags.test.tsx`, `insights.test.ts`, `reflection.test.ts`, `crisisCard.test.ts`,
… — remain the **M3 acceptance bar** and must pass against the new core.
The Rust core adds what Jest cannot cover:
- **Property tests** for merge convergence + HLC ordering (offline→online,
  reordered delivery).
- **NIST KAT conformance** for the AEAD / KDF / (future) KEM.
- **Cross-device sync integration** — two simulated devices converge with **no
  plaintext on the server**; new-device restore via recovery code end-to-end (M2
  acceptance).
- **`zeroize` / no-key-leak assertions** across the FFI boundary.
- **Ported domain tests** — `aggregateDay`/`buildWeek`/`daysBetween`/`czPlural`/
  WHO-5 interpretation re-expressed in Rust, preserving local-day/DST semantics;
  the descriptive-not-diagnosis assertions (no `deprese|diagnóz`) carried over.

---

## Consequences

- **Positive:** one audited security surface; a sustainable broad UI for a solo
  maintainer; a true zero-knowledge multi-device story; the irreversible UI bet
  is deferred behind cheap spikes; the privacy/legal posture (publisher-not-
  controller, Art. 25/32 by design, MDR wellbeing framing, EN 301 549) is
  preserved and strengthened.
- **Negative / accepted:** a Kotlin (and some Swift) ramp for an RN/TS team; a
  per-release a11y verification loop; a vendored third-party binding to maintain;
  the existing RN UI + test suite is rewritten (core logic + acceptance scenarios
  are preserved); honest capture-protection gaps on macOS 15+ and Linux must be
  disclosed, not promised away.
- **If A-native is chosen instead:** higher build cost (SwiftUI + Compose +
  desktop a11y story) traded for the a11y/security ceiling and zero cross-
  framework seam — defensible if the a11y bar is absolute-per-platform.
- **Revisit at:** the M2→M3 boundary (UI lock, post-spikes), and whenever the
  PQ-crypto audit landscape or CMP-web a11y maturity changes.
```
