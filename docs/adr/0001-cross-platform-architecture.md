# ADR 0001 — Lumi cross-platform architecture (Milestone 0)

> **Note (2026-10-18):** Rewritten in Simplified Technical English on 2026-10-18; decisions and section numbering unchanged.
>
> **⚠ PARTIALLY SUPERSEDED (2026-06-14) — kept as the historical M0 record.** The text below is
> the M0 record, with an inline `[Superseded …]` note at each superseded point. Later ratified ADRs
> overtake 2 areas:
>
> - **The RN↔core binding is Nitro**, not UniFFI. Per **ADR 0003** (validated by spike #1b GO,
>   `spikes/rn-nitro/SPIKE-REPORT.md`), the v1 mobile binding is `react-native-nitro-modules` +
>   `nitrogen` over a hand-written **C ABI (cbindgen)**, **not** `uniffi-bindgen-react-native`.
>   UniFFI remains the planned binding for the _deferred_ Swift/Kotlin desktop/watch targets, and
>   `wasm-bindgen` for web. Thus the §1 "Distribution (UniFFI, locked)" block is still correct for
>   those targets.
> - **The §7 `apps/` tree is CMP-shaped and predates the D-rn ratification.** The v1 app is the
>   current **root** RN app. Per **ADR 0004**, the M1 slice does **not** create `apps/`.
> - **ADR 0004** records the **M1 foundational decisions** (module structure, storage, PQ timing,
>   the `apps/` ruling, the §1 PIN-passphrase reading). It adds the crates `core/lumi-vault`,
>   `core/lumi-store` and `core/lumi-ffi-cabi`.

- **Status:** **Ratified** (2026-06-13) — M0 step (b) in progress. See the sign-off record below.
  Anna approved the shared Rust core, the locked crypto/sync design and the
  _defer-the-UI-lock-to-M3 + spikes + A-native-fallback_ strategy. The 5 conditions of the sign-off
  record must be in this document before the scaffold starts. The **CMP-vs-Flutter-vs-D** choice
  stays open. It waits for the M1 spikes and the **watchOS-in-v1** product call.
- **Date:** 2026-06-13
- **Decision owners:** Anna (clinical / product / final UI-framework sign-off), the engineers
  (architecture).
- **Supersedes:** the current single-codebase Expo / React Native app (Expo SDK 56, RN 0.85,
  expo-router, SQLCipher + Drizzle).
- **Evidence base:** a 17-agent research + adversarial-judge workflow, run on 2026-06-13 against
  the current (mid-2026) framework and crate maturity. The workflow also read the current
  repository directly. The text summarises the per-axis conclusions and the judge scoreboard inline.
  It cites concrete repository facts as `file:line`.

> **Process note.** This milestone produces _this document only_. Anna accepted the ADR with
> conditions (sign-off record below). **The scaffold still waits** until this document reflects
> those 5 conditions and Anna confirms them. The brief's M0 acceptance ("ADR merged; CI green on an
> empty scaffold; SBOM produced") comes in 2 steps: **(a) this ADR (accepted-with-conditions)**,
> then **(b) scaffold + CI + SBOM** as the M0 task that follows immediately. The monorepo/CI shape
> does **not** need the final framework pick. The Rust core, the server, the tokens and the CI
> matrix are framework-independent; only `apps/` gets its final shape at M3.

---

## Sign-off record (2026-06-13)

Anna reviewed this ADR and **signed off with conditions.**

**Approved:** the shared Rust core, the locked crypto/sync design, and the strategy that **defers
the irreversible UI lock to the M2-to-M3 boundary**. 4 spikes gate that lock, with **A-native** as
the principled fallback.

**The 5 conditions to put in this document before the scaffold:**

1. **Sync-relay controllership.** Add a controllership + lawful-basis analysis for the _sync relay
   itself_, separate from the research-toggle Art. 9 work. Even a ciphertext-only relay processes
   connection metadata (IP, timing, cadence), which is personal data. See §5.1.
2. **Crypto-shredding = the Art. 17 erasure mechanism.** Erasure **destroys the per-record content
   key**, so the ciphertext becomes permanently unrecoverable. Tombstones + remote blob deletion
   alone are not the mechanism. See §4.
3. **Watch is phone-enrolled, not a first-class device.** The paired phone provisions the watch over
   WCSession. The watch's own Secure Enclave seals the copy. The watch has **no on-device Argon2id
   and no recovery code.** Drop the watch from the Argon2id spike. See §3, §10, §13.
4. **Reserve space in the M0 on-wire format.** Generous reserved fields + explicit version fields let
   the M1 replay/idempotency review extend the format **without a migration.** See §5.
5. **The Jest suite is a behavioural _spec_, not a runnable asset.** Record it as a specification of
   behaviours to re-implement, not as tests that carry over. See §14.

**UI-direction refinements:**

- **Compose Multiplatform and Flutter are co-equal hybrid candidates.** The **gate-2
  binding-maturity evaluation** decides between them. Flutter is _not_ a fallback. See §2.4.
- **Spike #2 (iOS VoiceOver) has the authority to push most iOS screens to native SwiftUI.** Thus
  "E-hybrid" realistically means **CMP/Flutter for Android+desktop + native-heavy iOS**. This is the
  plan, not a risk. See §2.4.

**Open product decision (recorded):** does **watchOS ship in v1, or does it defer?** If it can
defer, **option D-rn warrants reconsideration** (watchOS was its main disqualifier). See §12.

**Follow-up (2026-06-13).** Anna **deferred watchOS from v1** and **held the scaffold** until she
reviews these revisions. The consequences, now in the text below:

- (i) v1 is **mobile-first (Android + iOS)**. Desktop and watch are post-v1 milestones with their
  own framework decisions.
- (ii) The watchOS deferral removes D-rn's structural disqualifier. Thus the UI decision **reopens
  with a revised recommendation: keep React Native for the v1 mobile surface (D-rn)**. See **§2.4
  Revision**.
- (iii) Nothing gets a scaffold until Anna confirms these revisions.

**Ratification (2026-06-13 #2).** Anna answered both parked questions. The team now **acts on**
the ADR:

- **Q1 (UI) — ratified:** **D-rn (keep React Native) for v1, scoped to mobile only: Android + iOS
  (iPad through the iOS build).** Desktop (Windows/macOS/Linux) and watchOS are **post-v1**
  milestones, each with its own framework decision (§2.4a / §12). The team does **not** act on the
  §2.4a all-platform analysis now. M1–M3 go entirely to the core, sync and migration.
  - Rationale on record: the rebuild's value is the audited Rust core + zero-knowledge sync +
    migration, not a UI rewrite. D-rn is the only path that reuses the current accessible UI + test
    suite. RN's **native** accessibility tree is a strength for EN 301 549 / WCAG 2.2 AA, not a
    compromise.
- **Q1 condition — spike #1 is a hard GO/NO-GO gate** (not a checkbox). See §13.
- **Q2 (scaffold) — green-lit:** M0 step (b), the framework-independent foundation only. `apps/`
  stays **empty** until spike #1 passes and M3 starts.
- **Interoperability (record only, do not build):** the eventual API/interop layer maps to **FHIR /
  SMART on FHIR / Open mHealth** at the boundary. The Rust-native event model stays internal. See
  **ADR 0002** (stub). The schema must not foreclose it.

---

## 0. What is locked vs open

| Area                                                                                  | Status                                                                                                                                                        | Where    |
| ------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- |
| Scope = full cross-platform rebuild, staged                                           | **Locked** (Decision 1)                                                                                                                                       | brief §5 |
| Unlock = biometric + PIN + recovery code (= migration secret)                         | **Locked** (Decision 2)                                                                                                                                       | §3       |
| PHQ-9/GAD-7 = minimal legal-only changes to the presentation                          | **Locked** (Decision 3)                                                                                                                                       | §13      |
| Shared **Rust core** holds all crypto/data/sync/merge/validation                      | **Locked**                                                                                                                                                    | §1       |
| Local store = SQLite + app-layer per-record encryption (SQLCipher = defence-in-depth) | **Locked** (refined here)                                                                                                                                     | §3, §4   |
| Zero-knowledge, opt-in, ciphertext-only sync server                                   | **Locked**                                                                                                                                                    | §5       |
| Crypto crate stack + key hierarchy parameters                                         | **Recommended-lock** (this ADR)                                                                                                                               | §3       |
| 2-track merge (op-log + Automerge)                                                    | **Recommended-lock** (this ADR)                                                                                                                               | §4       |
| **UI framework**                                                                      | **Reopened after the watchOS deferral.** Revised recommendation = **D-rn (keep RN)** for v1 mobile. Broad-surface/native deferred to the desktop+watch scope. | **§2**   |
| Platform scope                                                                        | **watchOS DEFERRED from v1. v1 = mobile-first (Android + iOS).** Desktop = post-v1.                                                                           | §12      |

---

## 1. The shared Rust core (locked)

One audited Rust crate (`lumi-core`) owns **everything security- or correctness-critical**. Thus
the team writes and audits the sensitive surface _once_, not N times:

- **Crypto & key hierarchy:** KDF, AEAD, key wrap/unwrap, vault/content keys, rekey (§3).
- **Data model & validation:** the 4 entities, ported from the careful boundary checks in
  `src/db/backup.ts` (`asEntry`/`asMeasurement`) and `src/db/repo.ts`.
- **Sync & merge:** op-log + CRDT, Hybrid Logical Clock, conflict resolution (§4).
- **Domain logic:** the pure functions in `src/model.ts` (`aggregateDay`, `buildWeek`/`buildMonth`,
  `daysBetween`, `czPlural`, WHO-5 interpretation) and `src/features/measure/scoring.ts`. These
  carry a subtle contract that **must survive the language port**: **local-day, not UTC**, date
  semantics. `toISODate` uses `getFullYear/Month/Date`, and `daysBetween` computes "přes poledne"
  to survive DST. This is a correctness invariant, not an implementation detail.

The UI (whatever §2 decides) is a **thin client**: it renders state and forwards intent. **It never
holds raw key material.** The FFI surface is narrow and high-level. It returns _handles_ and
_plaintext domain objects_, **never raw key bytes**. This is the explicit fix for the current
anti-pattern at `src/db/connect.ts:23`. That code interpolates the raw hex DB key straight into
`PRAGMA key` from JS.

**Distribution (UniFFI, locked):**

- UniFFI **proc-macro mode** generates Swift (1 xcframework for iOS/iPadOS/macOS/watchOS/tvOS) +
  Kotlin (Android/wearOS through a `cargo-ndk` `.aar`).
- **Web/wasm:** `wasm-bindgen` for the crypto core at first (the most battle-tested option).
  Evaluate `uniffi-bindgen-javascript` only as it matures.
- **Toolchain:** Rust ≥ 1.95 **stable** Tier-2 watchOS/tvOS device+sim targets. Explicitly drop
  `arm64_32` (old watches) and the x86_64 watch-sim to stay **nightly-free**. Pin the UniFFI
  version. Bump it deliberately (a 0.x minor release can break compatibility). Gate the binding
  regeneration in CI.

> **[Superseded in part by ADR 0003/0004]** This UniFFI distribution is correct for the _deferred_
> Swift/Kotlin desktop/watch targets + `wasm-bindgen` for web. The **v1 mobile (RN) binding is
> Nitro over a hand-written C ABI (cbindgen)**. See ADR 0003 + `spikes/rn-nitro/SPIKE-REPORT.md`.

---

## 2. UI framework — the deferred decision (signed off as a _process_)

### 2.1 The shortlist

|       | Option                | Broad surface                       | watch/wear            | Desktop              |
| ----- | --------------------- | ----------------------------------- | --------------------- | -------------------- |
| **A** | Native everywhere     | SwiftUI (Apple) + Compose (Android) | native                | WinUI / GTK          |
| **B** | Compose Multiplatform | CMP (Android/iOS/desktop)           | native SwiftUI        | CMP-desktop          |
| **C** | Flutter               | Flutter (mobile/desktop/web)        | native SwiftUI        | Flutter-desktop      |
| **D** | Stay React Native     | RN + rn-windows/macos               | **none (no watchOS)** | rn-windows/macos     |
| **E** | **Hybrid**            | CMP **or** Flutter                  | native SwiftUI shim   | CMP/Flutter or Tauri |

All 5 sit on the same locked Rust core. They differ only in the UI layer.

### 2.2 Adversarial judge scoreboard (sum across 6 lenses, 0–10 each)

```text
E-hybrid 48.5  >  B-compose 43.5  >  C-flutter 40.0  >  A-native 37.5  >  D-rn 32.5
```

The per-lens winners tell the real story. **The aggregate and the quality lenses disagree:**

| Lens                             | Winner  | A       | B   | C      | D     | E      |
| -------------------------------- | ------- | ------- | --- | ------ | ----- | ------ |
| Maintenance burden (solo)        | **E**   | 2       | 7   | 6      | 4     | **8**  |
| Accessibility (EN 301 549)       | **A**   | **9**   | 7   | 6      | 5     | 8      |
| Security boundary / auditability | **A**   | **8.5** | 7.5 | 6      | 4.5   | 7.5    |
| Platform reach (incl. watchOS)   | **A**   | **10**  | 8   | 8      | 4     | 10     |
| Bespoke design-system fidelity   | **C/E** | 6       | 9   | **10** | 6     | **10** |
| Time-to-M3 / delivery risk       | **D**   | 2       | 5   | 4      | **9** | 5      |

**Read this honestly:** E-hybrid wins on the _proxy_ metric (the number of UI codebases kept
green) and on design fidelity. **A-native wins every lens that maps to Lumi's hard, legal,
existential constraints**: accessibility, the zero-knowledge security boundary and watchOS reach.
D-rn wins only the first-platform sprint. There is no free lunch. The choice is a priority order.

### 2.3 The maintenance-burden analysis (the brief's required deliverable)

- **watch/wear is native in _every_ option.** SwiftUI watchOS + Compose wearOS are unavoidable.
  Thus the only real lever is the _broad_ surface. This shrinks A-native's apparent disadvantage
  and E-hybrid's apparent advantage.
- **A-native is not "7 codebases."** It is realistically **1 SwiftUI codebase**
  (iOS/iPadOS/macOS/watchOS/tvOS) + **1 Compose codebase** (Android/wearOS). Style Dictionary
  generates the design tokens from a single source into `ios-swift` + `compose/object` + `css`. The
  genuine extra cost is the **desktop tier** (Windows/Linux). The addition of WinUI + GTK makes A
  unsustainable for a solo dev, _not_ the mobile native UIs.
- **E-hybrid's maintenance win is partly illusory** (the decisive skeptic finding, verified
  independently). JetBrains' own guidance recommends _native SwiftUI for accessibility-critical iOS
  screens under CMP_. For Lumi the a11y-critical screens are **most of the app** (crisis
  interstitial, MoodPicker, check-in, questionnaires). Thus E-hybrid quietly becomes "A-native for
  the screens that matter + CMP for the easy screens". That is more seams than the score implies.
  Every failed a11y audit moves 1 more screen to native.
- **The real recurrent solo-maintainer cost for _this_ app** is not the codebase count. It is
  **(a)** the per-release screen-reader verification loop on a _synthesized_ accessibility tree
  (canvas frameworks: "no semantics = no accessibility"). It is also **(b)** a security-critical
  **third-party** Rust-to-Kotlin binding. E-hybrid maximises both relative to A-native.
- **Sunk cost is real but small relative to the horizon.** Today's app is ~6,200 LOC of UI/DS +
  ~1,500 LOC of tests, all RN/TS. Every option except D discards the UI and rewrites the
  RTL/better-sqlite3 test suite. **All** options pay the TS-to-Rust _core_ port equally, so it is
  not a differentiator.

### 2.4 Recommendation

> **REVISION (2026-06-13 — watchOS deferred from v1).** Deferring watchOS removes
> the one platform D-rn structurally cannot serve and recasts v1 as
> **mobile-first (Android + iOS)**. The rebuild's _value_ is the audited Rust
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
>
> **[Superseded by ADR 0003/0004]** "keep RN for v1" still holds, but the binder is **Nitro**, not
> `uniffi-bindgen-react-native`. Spike #1 (ubrn) returned **NO-GO**, and spike #1b proved RN → Nitro
> → C++ → Rust C ABI on real hardware (GO). The "pre-1.0 `uniffi-bindgen-react-native` binder"
> residual risk in point 2 below is thus moot for v1. See ADR 0003.

Why this now wins **for v1**:

1. **Fastest, lowest-risk M3 with full reuse.** ~6,200 LOC of accessible, token-faithful UI +
   ~1,500 LOC of tests + the team's skills carry over. Every option pays the TS-to-Rust _core_ port
   anyway, so it is not a differentiator. D-rn is the only option that does not _also_ pay a full
   UI rewrite.
2. **The security objection largely dissolves in the rebuilt design.** D-rn's low security score
   reflected the _current_ anti-pattern (raw hex key into `PRAGMA` from JS, `src/db/connect.ts:23`).
   The locked architecture (§1) keeps **all** crypto in the core and returns **handles / plaintext
   only, never raw key bytes**. Keys never enter the JS heap. The residual risk is the pre-1.0
   `uniffi-bindgen-react-native` binder: pin + spike it like any binding.
3. **Mobile a11y is a _strength_, not a gap.** RN renders to the **native** accessibility tree
   (VoiceOver / TalkBack), the gold-standard default. CMP/Flutter need a _synthesized_ tree,
   hand-annotated per screen. Only watchOS/Linux dragged D-rn's a11y score down, and both are now
   out of v1. The 2 latent gaps in §11 (`MoodShape` `accessible={false}`, `Button` opacity
   disabled) get a fix regardless of the framework.
4. **It defers the high-regret, expensive UI rewrite** until the desktop/watch scope is real. This
   is the same "defer, do not guess" principle as behind the framework lock.

Trade-offs accepted: **this choice does not solve desktop.** rn-windows is a candidate, but its EN
301 549 desktop a11y is unproven. rn-macos carries an RN-version downgrade tax. Linux has no
first-class RN path. Desktop is an explicit later milestone.

If desktop + watch later become must-haves _together_, the broad-surface (CMP/Flutter) or A-native
analysis below is the path. Because the Rust core is framework-independent, that pivot costs the
**UI only**, not the security foundation.

_The all-platform analysis below stands unchanged as the basis for the **desktop + watch
milestone** decision._

---

#### 2.4a All-platform analysis (for the desktop + watch milestone)

> **Adopt the _hybrid_ shape — Rust core + one broad-surface framework + native
> SwiftUI watch — and (a) defer the irreversible lock to the M2→M3 boundary,
> (b) gate it on the de-risking spikes (§2.5/§13), (c) keep A-native as the
> named fallback.
> Compose Multiplatform and Flutter are co-equal broad-surface candidates,
> decided by the gate-2 binding-maturity evaluation (§2.5). Embrace that spike #2
> may push most iOS screens to native SwiftUI: "E-hybrid" realistically means
> CMP/Flutter for Android+desktop + native-heavy iOS.**

Rationale, in order of weight:

1. **Defer the lock: it costs nothing.** M1 (core: data + crypto) and M2 (zero-knowledge sync +
   recovery) are **100% framework-independent**. The UI choice does not bite until M3. Thus we lock
   the _direction_ now (E-hybrid/CMP) and the _irreversible_ choice at M3. The spikes below first
   resolve the medium-confidence claims that the choice rests on. This is not a hedge. It puts a
   high-regret decision behind the cheap experiments that de-risk it, on milestone boundaries that
   the brief already defines.

2. **Gate 2 decides CMP or Flutter; the ADR does not pre-judge it.**
   - On the _security boundary_ (the most existential lens for a zero-knowledge vault) Compose
     leads (7.5 to 6). **One** UniFFI-KMP binding serves JVM (Android/desktop) + Kotlin/Native
     (iOS). Keys stay in typed compiled heaps, with no JS/webview. _But_ that binding is third-party
     and bus-factor-1 (gate 2).
   - Flutter's `flutter_rust_bridge` is more established, but it adds a **second** binding and a
     **Dart key heap**. In its favour stand the best design fidelity, the most mature desktop and 1
     toolchain.
   - The gate-2 binding-maturity spike (CMP UniFFI-KMP / `gobley` compared with
     `flutter_rust_bridge`) resolves this. **Both stay live until then.**

3. **A-native is the principled fallback.** If the a11y bar is truly absolute per platform, A-native
   is more defensible: it won a11y (9), security (8.5) and reach (10). The recommendation is
   E-hybrid _because_ a solo maintainer realistically _sustains_ compliant a11y on 1 broad surface,
   not on 4 native UIs that drift apart. But that judgement is Anna's to make (§2.6).

### 2.5 Four hard gates (binding if a broad-surface rewrite is chosen)

_For the revised v1 = D-rn path, only gate 1 and gate 2 apply. Gate 1 is the a11y CI gate, without
the SwiftUI fallback, because RN uses the native a11y tree. Gate 2 pins the binding. Gates 3–4
belong to the desktop+watch milestone._ These are **conditions of the decision, not aspirations**:

1. **A11y is a CI/release gate that blocks the release, not a vibe.** Per-screen real-device
   VoiceOver / TalkBack / Narrator / Orca + switch-control pass list, with a per-screen sign-off
   checklist. Any iOS screen that fails the synthesized-tree audit **falls back to native SwiftUI**.
   Budget the crisis interstitial, MoodPicker, check-in and questionnaires as _possibly native up
   front_.
2. **Pin and vendor the Rust-to-Kotlin binding.** The CMP UniFFI-KMP generator is third-party and
   **bus-factor-1**. The named `UbiqueInnovation` lineage appears stale; active work moved to
   `gobley`. Evaluate `gobley`, the alternatives and a hand-written UniFFI-C/Swift +
   Kotlin-cinterop path **before** you commit. Pin, vendor and gate the regeneration in CI. Keep the
   FFI narrow (handles/plaintext only).
3. **Validate Linux/Orca end-to-end before you publish the accessibility statement.** Prove the
   CMP-desktop Orca behaviour on the exact target distro (GTK4 ≥ GNOME 48 / Ubuntu 25.x). **Or
   scope Linux out of the statement honestly.** A Czech Act 424/2023 statement that is false on
   Linux is a legal/credibility liability.
4. **Treat the SwiftUI watch shim + Kotlin ramp as real front-loaded costs**, not footnotes. The
   team knows RN/TS, not Kotlin/Swift.

### 2.6 The question for sign-off — _resolved, see the sign-off record + §2.4 Revision_

The original fork (below) was a **priority order** that only Anna could set. With watchOS
deferred, it resolved to **D-rn for v1 mobile** (§2.4). It stays here for the record:

- **E-hybrid / CMP (recommended):** 1 sustainable broad surface. It accepts a disciplined a11y
  verification loop and a vendored binding.
- **A-native:** the a11y + security ceiling. It accepts a SwiftUI + a Compose codebase + a credible
  desktop a11y story as honest, visible cost.
- **D-rn scoped to Android/iOS/Windows:** the fastest, lowest-risk first ship. It reuses the
  entire current codebase + tests and **explicitly defers** macOS/Linux/watchOS.

The message that comes with this ADR asks this question.

---

## 3. Crypto & key hierarchy (recommended-lock)

This section implements brief Decision 2. **Concrete, current-2026 crate stack:**

| Role                           | Crate / algorithm                                                                                  | Parameters                                                                                                                                                                                                                                                                                                                           |
| ------------------------------ | -------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| KDF (PIN/passphrase, recovery) | `argon2` 0.5.x — **Argon2id**, RFC 9106                                                            | Floor **m = 64 MiB, t = 3, p = 1**. The first run auto-tunes the time cost to a fixed unlock-latency budget. The PHC string stores the params. **Benchmark on the weakest target that actually runs it: low-end Android, in M1.** The **watch does not run Argon2id** (it is phone-enrolled, see below), so it is out of this spike. |
| AEAD (content)                 | `chacha20poly1305` 0.10.x — **XChaCha20-Poly1305** (default)                                       | **Fresh random 24-byte nonce per record.** Bind `record_id + version` as **AAD**. A feature-gated `aes-gcm` (AES-256-GCM) path only where AES-NI dominates.                                                                                                                                                                          |
| Device keypair                 | `x25519-dalek` 2.0.x                                                                               | Hardware-backed where the OS allows (§10).                                                                                                                                                                                                                                                                                           |
| Key wrap (enrolment re-wrap)   | **HPKE base-mode** (RFC 9180, X25519-HKDF-SHA256), age-style recipient wrapping                    | Start with `hpke-rs` / `rust-hpke`.                                                                                                                                                                                                                                                                                                  |
| Hygiene                        | `zeroize` 1.8.x (`ZeroizeOnDrop` on every key/plaintext buffer) + `subtle` (constant-time compare) | —                                                                                                                                                                                                                                                                                                                                    |

**Key hierarchy:** a random **vault key** (the account root) wraps the **per-record content keys**
(1 per entry/measurement). XChaCha20-Poly1305 encrypts the records with those keys. The store holds
the vault key **wrapped twice**: under the Argon2id PIN key and under the recovery key. Biometric
unlock releases a copy that the OS keystore holds (§10).

**Watch enrolment (resolved, condition 3).** The watch is **not** a first-class, independently
enrolled device. The paired phone **provisions** the watch's vault-key copy over WCSession. The
**watch's own Secure Enclave** seals that copy and releases it under the watch biometrics/passcode.
The watch **never runs Argon2id and never holds the recovery code.**

The watch can still create entries offline (it carries the op-log + HLC + content-key generation
locally, §4). Those entries sync through the phone. This keeps the heavy KDF + the high-value
recovery secret off the constrained, easily lost device.

**Post-quantum seam (now), PQ crypto (later):** the wrapped-key envelope carries a **versioned
`wrap_alg` discriminator** and length-flexible recipient bytes. Thus an X25519 envelope and a
future **X-Wing (X25519 + ML-KEM-768)** envelope coexist. **Ship X25519-only.** Do **not** depend
on unaudited `ml-kem` / `hpke-ng` in production until ≥ 1 independent audit lands.

**Rekey (S7):** vault-key rotation + re-wrap of **every** content-key envelope, **driven by the
core**, _not_ by SQLCipher `PRAGMA rekey`. It must also re-encrypt the Automerge snapshots (§4): 2
tracks, easy to miss 1. It must be **atomic / crash-safe** (a half-rekeyed vault must not brick the
app). It must define the multi-device order (device A rekeys while B is offline, then B enrolls
under which vault key?). See the open item in §13.

**Storage posture (refined lock):** all _authoritative_ encryption is **app-layer per-record
content keys + wrapped envelopes** (this is what syncs). SQLCipher is **optional at-rest
defence-in-depth**, not the security boundary.

---

## 4. Data model → encrypted records + two-track merge (recommended-lock)

The 4 current entities (`drizzle/0000_init.sql`) map cleanly. Each row becomes an **encrypted
record** with its own content key. **All search/aggregation is client-side after decryption** (the
full DB is local anyway).

| Entity                             | Mutability        | Merge track                          |
| ---------------------------------- | ----------------- | ------------------------------------ |
| `entries` (check-ins)              | append-only       | **Track 1: op-log**                  |
| `measurements` (WHO-5/PHQ-9/GAD-7) | append-only       | **Track 1: op-log**                  |
| `tags` (custom labels)             | mutable set       | **Track 2: Automerge OR-set**        |
| `settings` (profile + prefs)       | mutable registers | **Track 2: Automerge LWW registers** |

**Track 1, the append-only op-log** (immutable check-ins): 1 ciphertext blob per record, keyed by
an **opaque random record id**. A **Hybrid Logical Clock** (physical time + counter + device id)
stamps each id. Convergence = the set-union of unseen record ids. No CRDT library is needed.

**HLC replaces the current `Date.now()`-prefix order** (`src/db/repo.ts`, `src/store.tsx:44`). See
the migration note below. This is a _behavioural change_: the `lastEntryForDate`/`listEntries`
order and the tests rely on the current order.

**Track 2, Automerge** (`automerge-rs` 3.0+ with `autosurgeon` `derive(Reconcile/Hydrate)`): 2 tiny
documents (the tags set, the settings registers). Real concurrent-edit convergence through LWW
registers / OR-set. Per change, `save()` (compact) + re-encrypt the whole small doc. **Not
`cr-sqlite`**: stalled since early 2025, and it operates on plaintext columns, which a
ciphertext-only server cannot accept.

**2 CRDT-granularity decisions to make (§13):**

- (a) Is each `settings` _key_ an independent register, so that concurrent edits to `name` on the
  phone and `share` on the desktop both survive? Or is the whole profile 1 register (the last
  writer clobbers)? The current single-blob shape (`readProfile` reads all keys as 1 object) would
  **silently lose concurrent edits**. Recommendation: **per-key registers**.
- (b) `tags` has a SQL `UNIQUE(label)` constraint (`tags_label_unique`). An OR-set can concurrently
  add the same label on 2 devices, which gives a unique-violation on merge. Recommendation:
  **merge-by-normalised-label** (dedupe on convergence, keep the earliest HLC).

**Right to erasure (GDPR Art. 17): crypto-shredding is the named mechanism (condition 2).** Erasure
**destroys the per-record content key**. That renders the record's ciphertext **permanently
unrecoverable everywhere**: the local store, the sync relay and any leftover blob copy. _No trust
in a remote delete is necessary._

Tombstone ops still propagate, so every device drops the record and the relay garbage-collects the
now-useless blob. But the **legal erasure guarantee rests on key destruction**, not on a server that
honours a delete. This composes with rekey (§3). It must reconcile with the research-share opt-in and any plaintext
backup that the user already exported. The schema already flags this data as Art. 9 special
category (`src/db/schema.ts:1`).

---

## 5. Zero-knowledge sync server (locked)

Stateless **Rust + axum** over object storage. 2 endpoints: `push(blob, opaque-metadata)` and
`pull(since-cursor)`. The server stores **only**: opaque record id, opaque device id, logical-clock
cursor, blob hash, wrapped-key envelope and **padded ciphertext**. It can decrypt nothing. Devices reconcile entirely client-side after decryption.

**Metadata minimisation is a hard requirement** (for a mental-health app, _timing and frequency are
themselves clinical signal_):

- **Content-independent random** record/device ids. The current `Date.now()`-derived ids would
  leak the check-in wall-clock timing (see §6).
- **Fixed-size length-padding** (PURB-style buckets) so a WHO-5 result is indistinguishable from a
  mood check-in by ciphertext length.
- **Optional push batches / jitter** to blur the frequency.
- Decide and document **replay protection + idempotent push**. No single 2026 reference covers
  cursor + idempotency + replay end-to-end, so this needs a first-party security review (§13). Also
  decide and document **what the relay logs/retains** (IP, timestamps, retention policy). A
  stateless relay still sees the IP + timing of the device that connects.

**The on-wire format reserves space (condition 4).** M0 fixes the envelope/wire format. But the
format carries **explicit version fields + generous reserved/extension fields**. Thus the M1
replay-protection + idempotency review (and future PQ `wrap_alg` values, §3) can extend it
**without a data migration**. M0 decides the padding-bucket sizes (a later change _is_ a
migration). The replay/idempotency semantics ride the reserved space.

### 5.1 Sync-relay controllership + lawful basis (condition 1)

This is distinct from the on-device data (the publisher is **not** a controller). It is also
distinct from the research egress (which would make the publisher a controller of Art. 9 health
data). **The relay operation is itself an activity that processes personal data.**

The relay processes **connection metadata**: IP address, timestamps, sync cadence, opaque device/record ids,
ciphertext sizes. That metadata is **personal data**, even though the relay can read no content.
Thus, for the relay, the operator is a **controller of that metadata** (not of Art. 9 health data;
content stays ciphertext-only).

Provisional position **for legal sign-off (`TODO(Anna)`):**

- Lawful basis = Art. 6(1)(b) (the sync that the user explicitly opted into), reinforced by
  6(1)(f).
- Hard data-minimisation (Art. 5(1)(c)) through the §5 measures (opaque ids, length-padding, timing
  jitter, minimal short-retention logs, no content).
- A transparency line in the privacy notice.
- A DPIA touch-point, because the service behind the relay is mental-health.

This is required **before the relay ships**, not before the local app ships (sync is opt-in and
comes later).

---

## 6. Migration from the current SQLCipher DB

This is a **real, destructive, must-not-lose-data, must-be-atomic** migration for the current
v0.1.0 users, not a greenfield build.

1. **One-time encrypted backup first.** Then an integrity check. Keep the old DB until the new
   store verifies. Then delete the old DB securely.
2. Open the old DB with the current key (`getOrCreateDbKey`, `PRAGMA key`). Read the rows through
   the current schema. **Re-encrypt each row** under the new per-record content-key hierarchy.
   Write the rows into the new local store.
3. **Bootstrap the key hierarchy without a lockout of any user.** Today's key uses
   `requireAuthentication:false` (`src/db/key.ts:19`): **no PIN, no biometric gate exists.** Current
   users have never set a PIN. The migration must onboard them into PIN/Argon2id + recovery code +
   biometric. A forgotten PIN must **not** become a data-loss event (brief: "do not make a forgotten
   PIN an automatic data-loss event"). The recovery code is the humane backstop. Biometric is the
   daily path.
4. **ID remap.** Current ids embed `Date.now()`, and the order depends on it. New ids are
   opaque-random + HLC. The migration must map old ids to new ids stably, so that dedup-by-id and
   import continue to work. It must re-express the order through HLC.
5. **Abandon `PRAGMA rekey`** in favour of the core-driven rekey. Decide whether SQLCipher stays as
   at-rest defence-in-depth or goes (recommendation: keep it).
6. **Reconcile the plaintext JSON backup** (`src/db/backup.ts`). Replace export-by-default with an
   **encrypted backup under the recovery key** (S2). Import must merge into the op-log + CRDT
   tracks, **not** do a raw `INSERT`, or it corrupts the merge model. `BACKUP_VERSION` needs a
   migration path once tombstones/HLC exist.

Preserve the local-day date semantics and the `aggregateDay`/week/month logic (§1).

---

## 7. Monorepo / workspace layout (proposed)

```text
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

The §2 sign-off + M3 give `apps/` its exact shape.

> **[Superseded in part by ADR 0003/0004]** This tree predates the D-rn ratification. (1)
> `lumi-ffi` is the **Nitro C ABI (cbindgen)** facade, not a UniFFI surface. The M1 slice adds
> `core/lumi-vault` (crypto), `core/lumi-store` (storage engine) and `core/lumi-ffi-cabi` (the
> `unsafe` C ABI), per ADR 0004. (2) The `apps/<broad-surface># CMP (recommended)` shape is **not**
> the v1 path. v1 is the current **root** RN app, and per ADR 0004 the M1 slice does **not** create
> `apps/`. The CMP/desktop/watch tree remains the post-v1 (§2.4a) analysis only.

---

## 8. CI / supply-chain / SBOM (S10) — currently **absent**, build from zero

Verified: there are **no** `.github/workflows`. `dependabot.yml` is the stock npm-only template.
`SECURITY.md` (if present) is boilerplate. M0 deliverables:

- A **GitHub Actions matrix** across macOS + Linux + Windows runners that builds every artifact
  (xcframework, `cargo-ndk` `.aar`, MSVC `.dll`/`.lib`, `.wasm`).
- **Dependency scans:** `cargo-audit` / `cargo-deny` (RUSTSEC) for Rust + `npm audit` (and the
  Kotlin/Dart side per §2). **Fix `dependabot.yml`**: add the `cargo` and `github-actions`
  ecosystems next to `npm`, with groups.
- **SBOM:** CycloneDX (or SPDX), generated **per release artifact** (EAA / health posture).
- **Reproducible/pinned toolchain:** pin Rust (1.95 stable for the new watchOS/tvOS Tier-2
  targets), UniFFI and `wasm-bindgen`.
- A **real `SECURITY.md`** with a vuln-disclosure contact. It also has an explicit **audit-gap
  disclosure** for unaudited crates (`argon2`, `x25519-dalek` 2.x, any future `ml-kem`/`hpke`).
- **No sensitive logs in release (S12):** strip the logs. Never log a key, a PRAGMA or a path. The
  single current offender is `src/db/provider.tsx:28`
  (`console.error("…databázi se nepodařilo otevřít", err)`).

---

## 9. Security requirements S1–S12 → design mapping

| #   | Requirement                                                                          | Satisfied by                                                                                                                                        |
| --- | ------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| S1  | Key non-extractable without user presence (was `requireAuthentication:false`).       | §3 hierarchy + §10 hardware keystore + biometric/PIN gate.                                                                                          |
| S2  | Encrypted export by default (was plaintext JSON).                                    | §6: recovery-key-wrapped export. Plaintext only behind a 2nd explicit confirm.                                                                      |
| S3  | Encrypted web persistence only (was cleartext wasm).                                 | §1 wasm core: WebCrypto + Argon2id encrypt-before-persist. The prod web build guard fails on unencrypted health data.                               |
| S4  | App-lock + inactivity timeout + lock-on-background.                                  | M4 app-shell capability, all platforms.                                                                                                             |
| S5  | Exclude DB & keys from cloud backup.                                                 | Android `dataExtractionRules`/`allowBackup=false`. iOS `isExcludedFromBackup`. Per-OS equivalents.                                                  |
| S6  | Screen-capture / task-switcher protection.                                           | §10 matrix (honest per-platform truth, with the macOS 15+ / Linux gaps).                                                                            |
| S7  | Key rotation / rekey.                                                                | §3 core-driven vault rotation + re-wrap (both tracks).                                                                                              |
| S8  | Route/consent guards; non-skippable PHQ-9 item-9 interstitial; deep-link validation. | A centralised guard in the nav layer. Preserve the current item-9 behaviour (`PHQ9_RISK_QUESTION_INDEX`, `src/features/measure/definitions.ts:66`). |
| S9  | IME / clipboard hygiene on sensitive inputs.                                         | Disable autocorrect and the keyboard's personal dictionary. No programmatic clipboard of sensitive text (or auto-clear).                            |
| S10 | Supply-chain hygiene.                                                                | §8.                                                                                                                                                 |
| S11 | Optional root/jailbreak + integrity heuristic that does not block.                   | M6 defence-in-depth. Warn, never hard-block (a11y / false-positive safety).                                                                         |
| S12 | No sensitive logging in production.                                                  | §8; fix `src/db/provider.tsx:28`.                                                                                                                   |

---

## 10. Per-platform secure storage (S1) + capture protection (S6)

This is a **native-shim layer below whatever UI wins**: ~6 shims (iOS, macOS, Android, watchOS,
Windows, Linux). It is **roughly framework-independent**, so it is a tie-breaker, not a decider.
**Crypto stays in the core.** The shim only (a) creates the hardware device keypair that wraps the
at-rest vault-key copy and (b) gates its release with biometrics.

| Platform         | Key storage (S1)                                                                                                                                                                                                      | Capture protection (S6)                                                                                                |
| ---------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| iOS / iPadOS     | Keychain `WhenUnlockedThisDeviceOnly` + Secure Enclave keypair, `.biometryCurrentSet`.                                                                                                                                | App-switcher blur + secure-text rendering. **Best-effort, document it.**                                               |
| macOS            | Keychain + Secure Enclave (Apple silicon).                                                                                                                                                                            | **DEGRADED on macOS 15+** (ScreenCaptureKit ignores the flags). Auto-blur on background + require unlock. Document it. |
| Android / wearOS | Keystore + **StrongBox** where available. `setUserAuthenticationRequired(true)`. **`AUTH_BIOMETRIC_STRONG` (Class 3) only.** Fall back to fingerprint/device-credential on Samsung Class-2 face, with clear Czech UX. | `FLAG_SECURE` + `setRecentsScreenshotEnabled(false)`.                                                                  |
| Windows          | DPAPI / Credential Manager + **TPM** + Windows Hello.                                                                                                                                                                 | `WDA_EXCLUDEFROMCAPTURE` (`SetWindowDisplayAffinity`).                                                                 |
| Linux            | Secret Service / libsecret (**software-only; document the weaker hardware story**). Rely on the core PIN/Argon2id-wrapped vault key. Optional TPM2 backend opt-in.                                                    | **ABSENT under Wayland/X11**: no per-window exclude. Document it. Auto-blur on background.                             |
| watchOS          | **Phone-provisioned** vault-key copy (WCSession), sealed by the watch's **own Secure Enclave**. No Argon2id, no recovery code on-device (§3).                                                                         | Native.                                                                                                                |

**Apple `.biometryCurrentSet` / Android `setInvalidatedByBiometricEnrollment` invalidate the key on
biometric re-enrolment.** This is a _feature_ (anti-coercion), but it makes the **recovery code
the only way back in**. That is why the recovery-code UX (§13) is the highest-stakes flow in the
product.

---

## 11. Accessibility verification (EN 301 549 / WCAG 2.2 AA)

Legal duty (EU Accessibility Act / Czech Act 424/2023, in force 2025-06-28). **Any
canvas/synthesized-tree option (B/C/E) is non-compliant _by default_** for the bespoke color+shape
encoding. 2 latent gaps **already exist in the current RN app**. They must not carry forward:

- **`src/components/MoodShape.tsx:63`** renders the mood shape with `accessible={false}`, and
  `HomeScreen` draws it with no label. Thus the "never color alone" invariant holds **visually
  only**; a screen reader gets nothing. On a synthesized tree this is worse (the node can be
  absent). **Every mood shape must carry an explicit accessibility label**, verified on real screen
  readers per screen.
- **`src/ds/Button.tsx:142`** uses `disabled: { opacity: 0.45 }`, which **violates** the locked
  rule (disabled = outline + ink, never opacity). Only the dominant CTA component currently follows
  the rule. Make outline+ink a **lint/test invariant**, so that it cannot regress in the new
  toolkit.

**Operationalised gate (M3+):** a per-screen real-device VoiceOver / TalkBack / Narrator / Orca +
switch-control pass list, with sign-off. Automated matchers per framework:

- CMP: `semantics`/`testTag` + XCTest.
- Flutter: `AccessibilityGuideline` + DCM.
- RN: the current `eslint-plugin-react-native-a11y` + Detox/Maestro.

**Validate Linux/Orca on the exact target distro before you publish the statement.**

---

## 12. Platform scope — IN / DEFERRED / OUT (recommended default)

**Decided (2026-06-13): v1 is mobile-first; watchOS deferred.**

| Platform                | Recommendation         | Note                                                                                                                           |
| ----------------------- | ---------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| Android, iOS (+ iPadOS) | **IN — v1 (M3)**       | Mobile-first. Revised recommendation = D-rn keeps RN (§2.4). iPadOS falls out of iOS.                                          |
| Windows                 | **Post-v1 milestone**  | Own framework decision: rn-windows, or Tauri/web-over-core, or native.                                                         |
| macOS                   | **Post-v1 milestone**  | rn-macos downgrade tax. Tauri/native candidate. Own decision.                                                                  |
| Linux                   | **Post-v1, gated**     | Only if Orca validates (§11). Otherwise the statement scopes Linux out honestly.                                               |
| watchOS                 | **DEFERRED (post-v1)** | Native SwiftUI when committed. The deferral reopened D-rn for v1 (§2.4).                                                       |
| Web (wasm core)         | **DEFERRED**           | The architecture supports it. CMP-web a11y is Beta ("initial" only), not EAA-grade today. Ship when an a11y-grade path exists. |
| wearOS                  | **DEFERRED**           | Compose wearOS when Android is stable.                                                                                         |
| tvOS                    | **OUT (revisit)**      | Low product value. Same native-shim cost as watchOS.                                                                           |

The desktop + watch milestone reopens the §2.4a all-platform analysis (broad surface or A-native).
The decision comes when that scope is committed.

---

## 13. Open items for Anna (`TODO(Anna)`) + risk-reduction spikes

**Clinical / product / legal (Anna owns):**

- Descriptive / baseline-relative measurement band wording (Decision 3). The current
  `src/features/measure/scoring.ts` bands, like _"středně závažné příznaky"_, are the
  clinical-severity labels to relabel. The code restructure is ours; the final Czech is hers.
- Recovery-code explainer + the data-loss/migration caveat copy (Decision 2). The **lockout
  dark-path UX** (biometric re-enrol + lost recovery code = permanent loss) needs clinical sign-off
  for vulnerable users.
- Validate the WHO-5 / PHQ-9 / GAD-7 wording against the validated Czech versions (current
  `TODO(Anna)` in `definitions.ts`).
- Re-verify the crisis lines / hours / chat each release. The current hardcoded set is 116 111,
  116 123, 606 021 021 **with hours**, 155 and 112. It lives across `model.ts`, `crisisCard.ts`,
  `HelpScreen`, `HandoverScreen` and `AgeStep`. Consider the addition of **116 006** ("Bílý kruh").
  Keep the hardcoded set as the offline fallback. Make the list **remotely verifiable/updatable**.
- DPIA + Art. 9(2)(a) consent + Art. 89 safeguards sign-off **before** any research egress. The
  "Data pro výzkum" toggle stays **OFF and inert**, gated by `TODO(Anna)`.
- **Sync-relay controllership + lawful-basis** sign-off (§5.1) **before the relay ships**. This is
  separate from the research-egress analysis above.
- Intended-purpose statement ("wellbeing/self-reflection, not diagnosis/screening/treatment") in
  `docs/`.
- **The UI-framework sign-off (§2.6).**

**Technical open items that the ADR names (resolved in M1–M2, not deferred):**

- recovery-code + rekey UX/blast-radius;
- sync-server replay/idempotency/retention;
- tombstone propagation;
- CRDT granularity (per-key registers; unique-label merge);
- test strategy (§14).

_The watchOS key-hierarchy seam is now **resolved** (§3): phone-provisioned through WCSession,
SE-sealed, no Argon2id/recovery code on-device. The watch keeps a local op-log+HLC for offline
writes._

**Spikes, re-prioritised for the revised v1 = D-rn mobile path (2026-06-13).** The watchOS and
broad-surface spikes move to the desktop+watch milestone.

_M1 spikes for the v1 mobile path (D-rn):_

> **[Superseded by ADR 0003 — gate resolved]** Spike #1 (`uniffi-bindgen-react-native`) fired
> **NO-GO** (`spikes/rn-ffi/SPIKE-REPORT.md`). The v1 binding moved to **Nitro**, which **spike #1b
> GO** proved on real arm64 hardware (`spikes/rn-nitro/SPIKE-REPORT.md`). The Nitro path met all
> the criteria below (builds on New Arch; handles/plaintext only, §1; pinnable/vendorable). The "on
> fail, reopen to §2.4a broad-surface" branch did **not** fire.

1. **`uniffi-bindgen-react-native` binding: the hard GO/NO-GO gate for D-rn-for-v1.** Run it
   **early in M1**. **Report the outcome before** you build out the RN-to-core integration further.
   **Pass criteria (all required):**
   - (a) It builds + runs against the current RN New Architecture / RN version.
   - (b) The FFI returns **handles / plaintext domain objects only. Verify that no raw key bytes
     cross into the JS heap** (the §1 invariant).
   - (c) The binder can be **pinned and vendored**.

   **On fail or flake on any criterion: do not work around it silently. Stop, report, and reopen
   the v1 UI decision to the §2.4a broad-surface analysis** (CMP/Flutter through the gate-2
   binding-maturity evaluation).

2. **Argon2id 64 MiB on low-end Android.** Confirm the unlock-latency budget. Decide per-platform
   params if needed. (**Watch excluded**: phone-enrolled, §3.)

   _Deferred to the desktop + watch milestone (the §2.4a all-platform decision):_

3. **Rust 1.95 watchOS/tvOS link.** An xcframework on a real watch (run when watchOS is committed).
4. **iOS VoiceOver (CMP and Flutter).** Only if a broad-surface rewrite comes back into
   consideration. It has the authority to **push most iOS screens to native SwiftUI** (§2.4a).
   _(N/A while v1 stays on RN's native a11y tree.)_
5. **Broad-surface-desktop Orca on the target Linux distro** (gate 3).
6. **Gate-2 binding-maturity evaluation.** CMP UniFFI-KMP (`gobley` or the named fork) compared
   with Flutter `flutter_rust_bridge`. It chooses CMP or Flutter **if** a broad-surface rewrite
   happens for desktop (§2.4a).

---

## 14. Test strategy for the new core

The current better-sqlite3 DI harness (`test/helpers/testDb.ts`) and ~100 RTL/unit scenarios are
on record as a **behavioural specification** (condition 5). Their disposition now depends on the
v1 path:

- **Revised v1 = D-rn (keep RN):** the suite **stays and grows as a runnable asset**. The migration
  is core/crypto/sync, not UI. The DI harness's `connectDb` mock then points at the Rust core. The
  RTL UI flows continue to run. _(This retention is itself an argument for D-rn.)_
- **Re-platform options (CMP/Flutter/A-native), if the desktop+watch milestone ever takes one:**
  condition 5 applies in full. The suite is a spec to **re-implement**, not a runnable asset.

Either way, the current flows remain the **M3 acceptance bar** and must pass against the new core.
These flows are `test/app.test.tsx`, `measure.test.tsx`, `tags.test.tsx`, `insights.test.ts`,
`reflection.test.ts`, `crisisCard.test.ts` and others. The Rust core adds what Jest cannot cover:

- **Property tests** for merge convergence + HLC order (offline to online, reordered delivery).
- **NIST KAT conformance** for the AEAD / KDF / (future) KEM.
- **Cross-device sync integration:** 2 simulated devices converge with **no plaintext on the
  server**. New-device restore through the recovery code, end-to-end (M2 acceptance).
- **`zeroize` / no-key-leak assertions** across the FFI boundary.
- **Ported domain tests:** `aggregateDay`/`buildWeek`/`daysBetween`/`czPlural`/WHO-5
  interpretation, re-expressed in Rust with the local-day/DST semantics intact. The
  descriptive-not-diagnosis assertions (no `deprese|diagnóz`) carry over.

---

## Consequences

- **Positive:** 1 audited security surface. A sustainable broad UI for a solo maintainer. A true
  zero-knowledge multi-device story. Cheap spikes come before the irreversible UI bet. The
  privacy/legal posture (publisher-not-controller, Art. 25/32 by design, the MDR wellbeing
  position, EN 301 549) stays and gets stronger.
- **Negative / accepted:** a Kotlin (and some Swift) ramp for an RN/TS team. A per-release a11y
  verification loop. A vendored third-party binding to maintain. A rewrite of the current RN UI +
  test suite (the core logic + acceptance scenarios stay). The team must disclose the
  capture-protection gaps on macOS 15+ and Linux honestly, not promise them away.
- **If the choice is A-native instead:** a higher build cost (SwiftUI + Compose + desktop a11y
  story). In exchange: the a11y/security ceiling and zero cross-framework seams. This is defensible
  if the a11y bar is absolute per platform.
- **Revisit at:** the M2-to-M3 boundary (UI lock, post-spikes), and whenever the PQ-crypto audit
  landscape or the CMP-web a11y maturity changes.
