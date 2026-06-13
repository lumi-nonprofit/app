# Feature spec — crisis-line recommender

- **Status:** Spec recorded 2026-06-13. Data model + matcher land as a **pure core
  module** during the core milestones (M1/M2); **all UI deferred to M3+**
  (`apps/` stays empty during M0).
- **Pillar:** deepens the existing *"reach real help sooner"* safety surface. **Not
  a new pillar, no new infrastructure** — pure data + rules, entirely on-device.
- **Related:** ADR `0001-cross-platform-architecture.md` §13 (provenance/staging),
  the PHQ-9 item-9 crisis interstitial, and the existing `Pomoc`/`HelpScreen`.

---

## 1. Purpose & non-goals

**Purpose.** Given what little the app already knows (age band) plus *optional,
ephemeral* situational hints, surface the **most relevant** crisis lines first —
without ever hiding, gating, or emptying the guaranteed safety net.

**Non-goals.**
- Not a diagnosis or triage engine. It ranks contact options; it does not assess risk.
- No network call participates in matching. No telemetry on anything here, ever.
- Does not replace the always-on hardcoded safety net — it *enriches* it.

---

## 2. Seed data, provenance & the fallback relationship

- **Seed file:** `capld_linky_duvery_cr.json` — ČAPLD (Česká asociace pracovišť
  linek důvěry), `schema_version` 1.0, 31 items, accessed 2026-06-13. Frozen as a
  test fixture; its final home is `core/lumi-core/tests/fixtures/` (placed at
  scaffold time).
- **Seed ≠ ground truth.** Treat every imported field as **unverified** until
  checked against ČAPLD per the release checklist (`cz-crisis-data-checklist.md`).
- **The guaranteed safety net is hardcoded and compiled in** as the offline
  fallback, independent of the seed:
  - **116 111** Linka bezpečí — free, nonstop, youth ≤ 26
  - **116 123** Linka první psychické pomoci — free, nonstop, adults
  - **116 006** Linka pomoci obětem — violence / DV victims
  - **606 021 021** Rodičovská linka — **PO–ČT 09–21, PÁ 09–17**, standard tariff
  - **112** general emergency · **155** medical emergency
- The broader ČAPLD list **enriches** the fallback. It **never overrides,
  suppresses, or reorders below** the guaranteed numbers when those are the
  age-appropriate/relevant safety net.

Seed shape (per item): `name, operator, focus, contacts{ phones[{number,label?}],
phone_hours, chat{url,hours}|null, email_counseling[], contact_emails[], web,
social[] }, address, notes, categories[]`.

---

## 3. Data model (`lumi-core`, behind boundary validators)

Mirror the existing `asEntry`/`asMeasurement` discipline: **unknown/invalid input
degrades, never panics, never silently drops a line.**

```rust
struct CrisisLine {
    id: LineId,
    name: String,
    operator: String,
    focus_text: String,                 // free text, always preserved
    audiences: BTreeSet<Audience>,
    scope: Scope,
    channels: Vec<Channel>,             // may be empty-ish but a line is still kept
    cost: Cost,
    notes: Option<String>,
    web: Option<String>,
    social: Vec<String>,
    provenance: Provenance,             // schema_version, source, accessed_date, verified flag
}

enum Audience {                         // mapped from categories[]; Other preserves unknowns
    GeneralPopulation,                  // "Celá populace"
    Adults,                             // "Dospělí"
    ChildrenYouth,                      // "Děti a dospívající"  (≤ 25/26)
    Parents,                            // "Rodiče a škola"
    Seniors,                            // "Senioři"
    WomenGirls,                         // "Ženy a dívky"
    ViolenceVictims,                    // "Oběti trestných činů a domácího násilí"
    MentalIllness,                      // "Lidé s duševním onemocněním"
    HealthcareWorkers,                  // "Zdravotníci"
    PatientsFamilies,                   // "Blízcí pacientů"
    SecurityForces,                     // "Příslušníci bezpečnostních sborů"
    HealthDisadvantaged,                // "Osoby zdravotně znevýhodněné"
    Prison,                             // "Oblast vězeňství"
    Foreigners,                         // "Cizinci"
    Other(String),                      // FALLBACK — never drop an unknown category
}

enum Scope { National, Region(Kraj), City(String) }   // "Celorepublikové" -> National

enum Channel {                          // EACH channel carries its OWN hours
    Phone { numbers: Vec<PhoneNumber>, hours: Hours },
    Chat  { url: String,               hours: Hours },
    Email { addresses: Vec<String> },  // NO hours; addresses come ONLY from email_counseling
}

struct PhoneNumber { e164_or_shortcode: String, label: Option<String> }
                                        // normalise for tel:; preserve 116 xxx verbatim

enum Cost { Free, StandardTariff, Unknown }   // "Volání bezplatné" / "Volání dle běžného tarifu"

struct Hours { raw: String, parsed: Option<OpeningHours> }
                                        // raw ALWAYS retained + ALWAYS displayed;
                                        // parsed populated ONLY when unambiguous
```

**Two axes stay separate:** `"Celorepublikové"` → `Scope::National` (it is *not* an
audience). Scope and audience are demultiplexed independently from the flat
`categories[]` tag-soup.

---

## 4. Ingestion / boundary validation rules

`categories[]` is a flat list mixing **three axes** — demux each independently:

1. **Scope:** `"Celorepublikové"` → `National`; a Kraj name → `Region`; a city name
   → `City`. (Seed mixes e.g. `"Praha"`, `"Středočeský kraj"`, `"Brno"`.)
2. **Audience:** map the known strings (table in §3); **any unrecognised category
   that is not a scope/channel/cost tag → `Audience::Other(raw)`** — preserved,
   never dropped.
3. **Channel + cost tags:** `"NONSTOP"`, `"Telefonická krizová pomoc"`, `"Chat"`,
   `"E-mailové poradenství"` inform channels; `"Volání bezplatné"` → `Free`,
   `"Volání dle běžného tarifu"` → `StandardTariff`; absent → `Cost::Unknown`.

Channel construction:
- **Phone** iff `phones[]` non-empty → carries `phone_hours` (raw + parsed).
- **Chat** iff `chat` present → carries `chat.hours`.
- **Email** iff `email_counseling[]` non-empty. **CRITICAL: email addresses come
  ONLY from `email_counseling[]`; NEVER from `contact_emails[]`** (those are admin
  inboxes). If `email_counseling` is empty there is **no email channel**, even when
  `contact_emails` exist. *(In the seed: 22 items have counseling emails, all 31
  have admin emails → 9 lines must yield no email channel.)*
- **Zero-phone lines are valid** and kept. *(Seed: `"Nepanikař"` has no phone — it
  is chat/web only.)*
- **Phone normalisation:** produce a `tel:`-safe form but **preserve EU short codes
  (`116 111`, `116 123`, `116 006`) verbatim**.

Degrade-don't-fail: a malformed item yields the best partial `CrisisLine` it can
(raw fields retained); it is never dropped and never panics.

---

## 5. Open-now computation — best-effort, **fail open**

```rust
fn open_state(parsed: &Option<OpeningHours>, now: PragueInstant) -> OpenState
enum OpenState { Open, LikelyClosed { next_open: Option<PragueInstant> }, Unknown }
```

- `now` is an **injected** `Europe/Prague` timestamp (for testability — never reads
  the wall clock directly).
- **Parse confidently only:**
  - `NONSTOP` → always `Open`.
  - Explicit **weekday + HH:MM** ranges, including **overnight wrap**
    (e.g. `19:00–07:00`), single or multiple segments per day.
- **Everything else → `Unknown`** (raw still shown): prose tails, seasonal/holiday
  exceptions, malformed times, bare hours without minutes, ambiguous separators.
- **Public holidays can't be resolved reliably offline** → on dates that **are or
  border** a CZ public holiday, degrade affected lines to `Unknown` rather than
  asserting `Open`/`Closed`.
- **Never render a confident "Closed."** Use **"může být teď zavřeno"** ("may be
  closed now") and **always pair it with an open alternative**. `Unknown` is
  treated as **reachable**.

### Parse matrix derived from the real seed (test cases)

**Parse → Open/LikelyClosed:**
`NONSTOP` · `Denně 08:00 - 20:00` · `Denně 08:00 až 20:00` · `Denně 09:00 - 21:00` ·
`PO - PÁ - 09:00 - 21:00` · `PO - PÁ 19:00 - 07:00` *(overnight wrap)* ·
`PO - PÁ: 08:00 - 18:00, SO, NE - 08:00 - 16:00` · `PO - PÁ: 08:00 - 22:00` ·
`PO - PÁ: 09:00 - 18:00` · `PO - ČT - 09:00 - 21:00, PÁ - 9:00 - 17:00`
*(single-digit hour)* · `PO, ST, PÁ - 08:00 - 20:00` *(weekday list)*.

**→ Unknown (degrade):**
`denně 08:00 - 20.00` *(malformed dot)* · `∅`/null ·
`PO, ÚT, ST, ČT, PÁ - 18:00 - 6:00, víkendy a svátky nepřetržitě` *(holiday prose)* ·
chat `PO - PÁ 16:00 - 22:00, (letní režim 16:00 - 20:00)` *(seasonal)* ·
chat `… ČT 13:00 - 16:00 (mimo svátky)` *(holiday exception)* ·
chat `PO, ST, NE: 18:30 - 21:30, aktuální provozní doba … na webových stránkách`
*(prose tail)* · chat `PO, ČT, SO: 17:00 - 20.00` *(malformed)* ·
chat `… PÁ SO, NE a svátky: 08:00 – 13:00` *(holiday + en-dash)* ·
chat `denně 09:00 – 13.00 a 15:00 – 19:00` *(malformed + en-dash)* ·
chat `PO - ČT 9 - 21, …` *(bare hours, no minutes → conservative Unknown)*.

---

## 6. Matcher — pure, deterministic, on-device

FFI-exposed **read-only**; mirrors the `scoring`/`insights` core-module pattern.

**Inputs (all optional except age):**
- **age band** (already collected) — selects the universal youth/adult line.
- **ephemeral situational chips** ("Co se právě děje?"): parent · child-teen ·
  senior · woman-girl · experiencing violence/DV · mental illness · bereavement ·
  health crisis · healthcare worker · family-of-patient · foreigner-language.
- **medium preference** (phone / chat / email).
- **coarse region** (Kraj picker — **never GPS**).
- **"free calls only."**

**Algorithm (order of operations):**
1. **Seed the result with the guaranteed safety net** (age-appropriate universal
   line + 116 006 when violence/DV is indicated + 112/155). These are *always*
   present and can never be reordered below specialised lines.
2. **Add** specialised/regional lines that match chips/region.
3. **Rank** the non-guaranteed lines by relevance (audience match > scope match >
   medium match), with **open-now as an additive positive signal** — never a gate.
4. **Guarantee an open channel:** ensure ≥ 1 result is open now (a NONSTOP line);
   any `LikelyClosed` line shows `next_open` **and** an explicitly-offered open
   alternative.
5. **Attach transparency:** for any reordering, the reason
   ("Zobrazuji nejdřív, protože jste uvedl/a: X") and a persistent "Zobrazit
   všechny linky" affordance that returns the full unfiltered list.
6. **Result is never empty.**

---

## 7. Safety invariants (the spec — unit-test each)

1. **Rank/surface, never filter away the safety net.** Universal age-appropriate
   lines (116 111 youth / 116 123 adults; 116 006 for violence) and emergency
   (112/155) are **always** in the result regardless of filters. Filters change
   **order** and **add** options; they never remove universal ones. **Never empty.**
2. **Fail open on hours.** `Unknown` = reachable. "Open now" is additive, never a
   gate that hides a line.
3. **No dead ends.** Result always includes ≥ 1 channel open now (a NONSTOP line).
   A closed line shows next-open **and** a clearly-offered open alternative — never
   a terminal "closed."
4. **No gating behind disclosure.** With zero input the full safety net is already
   shown. Chips only refine ordering; reaching help never requires disclosing
   anything.
5. **Transparent + overridable.** Show the "because you said X" reason and a
   persistent "Zobrazit všechny linky" returning the full unfiltered list.
6. **Always show verbatim hours + cost**, especially for non-NONSTOP and
   standard-tariff lines (free vs paid is decision-relevant for vulnerable callers).
7. **Deterministic + tested.** Frozen JSON fixture (incl. adversarial hours and the
   no-phone line), injected simulated clock; assert the above — especially "never
   empty," "safety net always present," "fail open on unparseable hours," "email
   never uses `contact_emails`."

---

## 8. Privacy / legal

- **Situational chips are Art. 9-adjacent** (DV, health, …). **Ephemeral,
  session-only by default — do NOT persist to the encrypted DB.** A victim's device
  may be monitored; storing `selected: domestic violence` is itself a risk.
- **No analytics, ever, on chip selection.**
- A future "remember my situation" option, if added, is **explicit opt-in**, stored
  locally encrypted like health data, and **not synced by default**.
- **Matching runs entirely on-device. No network call participates.**

---

## 9. Accessibility (WCAG 2.2 AA / EN 301 549 — highest-stakes surface)

- Every line and action reachable by **screen reader and keyboard/switch**.
- **Open/closed status conveyed as TEXT, never colour-only.**
- Large tap targets. Actions carry explicit accessible names, e.g. *"Zavolat na
  Linku bezpečí 116 111, nonstop, zdarma."*
- Reorder announced via a **polite live region** without trapping focus.
- Works at **200% zoom**, with dynamic type, and **offline**.
- UI copy is **gender-neutral Czech** via the existing i18n.

---

## 10. Provenance / staging

- The structured file carries `schema_version`, `source`, `accessed_date`, plus a
  per-release **CZ-data verification checklist** (`cz-crisis-data-checklist.md`):
  verify numbers, hours, free/paid, and chat URLs against ČAPLD before each release.
- **Unify the scattered crisis content** — currently spread across `src/model.ts`
  (`HELP_LINES`), `src/features/help/crisisCard.ts`, `HelpScreen`,
  `HandoverScreen`, `AgeStep` — **onto the single validated source**, keeping the
  hardcoded verified core compiled in as the **offline fallback + safety net**.
- **UI lands at M3+** (Pomoc/HelpScreen + the PHQ-9 item-9 crisis interstitial).
  **No UI during M0;** `apps/` stays empty.

---

## 11. Acceptance for the NOW (no UI)

- [x] (a) Spec + safety invariants recorded in `docs/` — *this file*.
- [x] (b) `CrisisLine` model + validating ingestion in `core/lumi-core/src/crisis/`
  (`model.rs`, `ingest.rs`), frozen JSON fixture at
  `core/lumi-core/tests/fixtures/capld_linky_duvery_cr.json` under boundary
  validators, dual-hours (`Hours { raw, parsed }`).
- [x] (c) Pure matcher (`matcher.rs`) + `open_state` (`hours.rs`) as a core module
  with unit tests (injected clock + the adversarial-hours corpus).
- [x] (d) CZ-data verification checklist doc — `cz-crisis-data-checklist.md`.
- [x] (e) `apps/` untouched; tests green (27 Rust tests + the 95 existing Jest tests).

**Implementation notes.** The crate is intentionally **dependency-free** (a small
in-house JSON reader, `crisis/json.rs`) so the security core stays lean and builds
with no C toolchain. In this toolchain-less dev box it is built/tested via the
musl + bundled `rust-lld` target:
`cargo test --target x86_64-unknown-linux-musl` (see `core/Cargo.toml`). FFI
exposure (UniFFI, read-only) and wiring the matcher into the UI are deferred to
M3+, per spec §10.

**Stopped here for review, per the spec.**
