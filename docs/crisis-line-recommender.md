# Feature spec — crisis-line recommender

<!-- cspell:locale en,cs -->

- **Status:** Spec recorded 2026-06-13. The data model and the matcher land as a **pure core
  module** during the core milestones (M1/M2). **All UI waits for M3+** (`apps/` stays empty during
  M0).
- **Pillar:** the feature deepens the current _"reach real help sooner"_ safety surface. **Not a
  new pillar, no new infrastructure**: pure data and rules, entirely on the device.
- **Related:** ADR `0001-cross-platform-architecture.md` §13 (provenance/staging), the PHQ-9 item-9
  crisis interstitial, and the current `Pomoc`/`HelpScreen`.

---

## 1. Purpose & non-goals

**Purpose.** The app already knows a little (the age band). With optional, ephemeral situational
hints, the feature shows the **most relevant** crisis lines first. It never hides, gates or empties
the guaranteed safety net.

**Non-goals.**

- Not a diagnosis or triage engine. It ranks contact options; it does not assess risk.
- No network call takes part in the match. No telemetry on anything here, ever.
- It does not replace the always-on hardcoded safety net. It _enriches_ the safety net.

---

## 2. Seed data, provenance & the fallback relationship

- **Seed file:** `capld_linky_duvery_cr.json` from ČAPLD (Česká asociace pracovišť linek důvěry),
  `schema_version` 1.0, 31 items, accessed 2026-06-13. The file is a frozen test fixture. Its final
  home is `core/lumi-core/tests/fixtures/` (placed at scaffold time).
- **Seed ≠ ground truth.** Treat every imported field as **unverified** until you check it against
  ČAPLD per the release checklist (`cz-crisis-data-checklist.md`).
- **The app hardcodes and compiles in the guaranteed safety net** as the offline fallback,
  independent of the seed:
  - **116 111** Linka bezpečí — free, nonstop, youth ≤ 26
  - **116 123** Linka první psychické pomoci — free, nonstop, adults
  - **116 006** Linka pomoci obětem — victims of violence and domestic violence (DV)
  - **606 021 021** Rodičovská linka — **`PO–ČT 09–21, PÁ 09–17`**, standard tariff
  - **112** general emergency · **155** medical emergency
- The broader ČAPLD list **enriches** the fallback. It **never overrides, suppresses or reorders
  below** the guaranteed numbers when those numbers are the age-appropriate and relevant safety net.

Seed shape (per item): `name, operator, focus, contacts{ phones[{number,label?}],
phone_hours, chat{url,hours}|null, email_counseling[], contact_emails[], web,
social[] }, address, notes, categories[]`.

---

## 3. Data model (`lumi-core`, behind boundary validators)

Mirror the current `asEntry`/`asMeasurement` discipline: **unknown or invalid input degrades. It
never panics, and it never silently drops a line.**

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

**The 2 axes stay separate:** `"Celorepublikové"` → `Scope::National` (it is _not_ an audience).
The ingestion demultiplexes the scope and the audience independently from the flat `categories[]`
tag-soup.

---

## 4. Ingestion / boundary validation rules

`categories[]` is a flat list that mixes **3 axes**. Demultiplex each axis independently:

1. **Scope:** `"Celorepublikové"` → `National`; a Kraj name → `Region`; a city name → `City`. (The
   seed mixes, for example, `"Praha"`, `"Středočeský kraj"` and `"Brno"`.)
2. **Audience:** map the known strings (table in §3). **Any category that the code does not
   recognise, and that is not a scope, channel or cost tag, becomes `Audience::Other(raw)`**:
   preserved, never dropped.
3. **Channel and cost tags:** `"NONSTOP"`, `"Telefonická krizová pomoc"`, `"Chat"` and
   `"E-mailové poradenství"` inform the channels. `"Volání bezplatné"` → `Free`;
   `"Volání dle běžného tarifu"` → `StandardTariff`; absent → `Cost::Unknown`.

Channel construction:

- **Phone** if and only if `phones[]` is non-empty. It carries `phone_hours` (raw and parsed).
- **Chat** if and only if `chat` is present. It carries `chat.hours`.
- **Email** if and only if `email_counseling[]` is non-empty. **CRITICAL: email addresses come ONLY
  from `email_counseling[]`, NEVER from `contact_emails[]`** (those are admin inboxes). If
  `email_counseling` is empty, there is **no email channel**, even when `contact_emails` exist.
  _(In the seed, 22 items have an `email_counseling` address and all 31 have admin emails. Thus 9
  lines must give no email channel.)_
- **Lines without a phone are valid** and stay. _(Seed: `"Nepanikař"` has no phone. It is chat and
  web only.)_
- **Phone normalisation:** produce a `tel:`-safe form, but **keep the EU short codes (`116 111`,
  `116 123`, `116 006`) verbatim**.

Degrade, do not fail: a malformed item gives the best partial `CrisisLine` that it can (raw fields
kept). The ingestion never drops the item and never panics.

---

## 5. Open-now computation — best-effort, **fail open**

```rust
fn open_state(parsed: &Option<OpeningHours>, now: PragueInstant) -> OpenState
enum OpenState { Open, LikelyClosed { next_open: Option<PragueInstant> }, Unknown }
```

- `now` is an **injected** `Europe/Prague` timestamp (for testability). The code never reads the
  wall clock directly.
- **Parse only with confidence:**
  - `NONSTOP` → always `Open`.
  - Explicit **weekday + HH:MM** ranges, with **overnight wrap** (for example `19:00–07:00`), single
    or multiple segments per day.
- **All other input → `Unknown`** (the raw string still shows): prose tails, seasonal or holiday
  exceptions, malformed times, bare hours without minutes, ambiguous separators.
- **Public holidays have no reliable offline resolution.** On dates that **are or border** a CZ
  public holiday, degrade the affected lines to `Unknown`. Do not assert `Open` or `Closed`.
- **Never render a confident "Closed."** Use `může být teď zavřeno` ("possibly closed now") and
  **always pair it with an open alternative**. The code treats `Unknown` as **reachable**.

### Parse matrix derived from the real seed (test cases)

**Parse → Open/LikelyClosed:**

- `NONSTOP`
- `Denně 08:00 - 20:00`
- `Denně 08:00 až 20:00`
- `Denně 09:00 - 21:00`
- `PO - PÁ - 09:00 - 21:00`
- `PO - PÁ 19:00 - 07:00` _(overnight wrap)_
- `PO - PÁ: 08:00 - 18:00, SO, NE - 08:00 - 16:00`
- `PO - PÁ: 08:00 - 22:00`
- `PO - PÁ: 09:00 - 18:00`
- `PO - ČT - 09:00 - 21:00, PÁ - 9:00 - 17:00` _(single-digit hour)_
- `PO, ST, PÁ - 08:00 - 20:00` _(weekday list)_

**→ Unknown (degrade):**

- `denně 08:00 - 20.00` _(malformed dot)_
- `∅`/null
- `PO, ÚT, ST, ČT, PÁ - 18:00 - 6:00, víkendy a svátky nepřetržitě` _(holiday prose)_
- chat `PO - PÁ 16:00 - 22:00, (letní režim 16:00 - 20:00)` _(seasonal)_
- chat `… ČT 13:00 - 16:00 (mimo svátky)` _(holiday exception)_
- chat `PO, ST, NE: 18:30 - 21:30, aktuální provozní doba … na webových stránkách` _(prose tail)_
- chat `PO, ČT, SO: 17:00 - 20.00` _(malformed)_
- chat `… PÁ SO, NE a svátky: 08:00 – 13:00` _(holiday + en-dash)_
- chat `denně 09:00 – 13.00 a 15:00 – 19:00` _(malformed + en-dash)_
- chat `PO - ČT 9 - 21, …` _(bare hours, no minutes → conservative Unknown)_

---

## 6. Matcher — pure, deterministic, on-device

The FFI exposes it **read-only**; it mirrors the `scoring`/`insights` core-module pattern.

**Inputs (all optional except the age):**

- **age band** (already collected): it selects the universal youth or adult line.
- **ephemeral situational chips** (`Co se právě děje?`):
  - parent
  - child-teen
  - senior
  - woman-girl
  - victim of violence or DV
  - mental illness
  - bereavement
  - health crisis
  - healthcare worker
  - family of a patient
  - foreigner or language
- **medium preference** (phone / chat / email).
- **coarse region** (a Kraj picker, **never GPS**).
- **"free calls only."**

**Algorithm (order of operations):**

1. **Seed the result with the guaranteed safety net**: the age-appropriate universal line, 116 006
   when the user selects violence or DV, and 112/155. These lines are _always_ present. The matcher
   can never reorder them below specialised lines.
2. **Add** the specialised and regional lines that match the chips or the region.
3. **Rank** the lines outside the guarantee by relevance (audience match > scope match > medium
   match). Open-now is **an additive positive signal**, never a gate.
4. **Guarantee an open channel:** make sure that at least 1 result is open now (a NONSTOP line).
   Each `LikelyClosed` line shows `next_open` **and** an explicitly offered open alternative.
5. **Attach transparency:** for each reorder, show the reason
   (`Zobrazuji nejdřív, protože jste uvedl/a: X`) and a persistent `Zobrazit všechny linky`
   affordance that returns the full unfiltered list.
6. **The result is never empty.**

---

## 7. Safety invariants (the spec — unit-test each)

1. **Rank and surface, never filter away the safety net.** The universal age-appropriate lines are
   **always** in the result, whatever the filters. These are 116 111 for youth, 116 123 for adults
   and 116 006 for violence. The emergency numbers (112/155) are always in the result too. Filters
   change the **order** and **add** options; they never remove the universal lines. **Never
   empty.**
2. **Fail open on hours.** `Unknown` = reachable. "Open now" is additive, never a gate that hides a
   line.
3. **No dead ends.** The result always includes at least 1 channel that is open now (a NONSTOP
   line). A closed line shows the next-open time **and** a clearly offered open alternative, never
   a terminal "closed."
4. **No gate behind disclosure.** With zero input, the full safety net already shows. Chips only
   refine the order. The user never has to disclose anything to reach help.
5. **Transparent and overridable.** Show the "because you said X" reason and a persistent
   `Zobrazit všechny linky` that returns the full unfiltered list.
6. **Always show the verbatim hours and the cost.** This matters most for lines with limited hours
   and for standard-tariff lines. Free compared with paid is decision-relevant for vulnerable
   callers.
7. **Deterministic and tested.** A frozen JSON fixture (with the adversarial hours and the no-phone
   line) and an injected simulated clock. Assert the points above, especially "never empty,"
   "safety net always present," "fail open on hours that do not parse," and "email never uses
   `contact_emails`."

---

## 8. Privacy / legal

- **Situational chips are Article 9-adjacent** (DV, health and other items). **They are ephemeral
  and session-only by default. Do NOT persist them to the encrypted DB.** The device of a victim
  can be under surveillance; a stored `selected: domestic violence` is itself a risk.
- **No analytics, ever, on the chip selection.**
- A future "remember my situation" option, if it comes, is **explicit opt-in**, stored locally with
  encryption like health data, and **not synced by default**.
- **The match runs entirely on the device. No network call takes part.**

---

## 9. Accessibility (WCAG 2.2 AA / EN 301 549 — highest-stakes surface)

- Every line and every action is reachable with a **screen reader and with a keyboard or a
  switch**.
- **The open or closed status is TEXT, never colour only.**
- Large tap targets. Actions carry explicit accessible names, for example
  `Zavolat na Linku bezpečí 116 111, nonstop, zdarma.`
- A polite **live region** announces a reorder, without a focus trap.
- Works at **200% zoom**, with dynamic type, and **offline**.
- The UI copy is **gender-neutral Czech**. The texts come from the message catalogs in `src/i18n`
  (i18next, catalogs `cs` and `en`).

---

## 10. Provenance / staging

- The structured file carries `schema_version`, `source` and `accessed_date`. A per-release
  **CZ-data verification checklist** (`cz-crisis-data-checklist.md`) adds to it. Verify the
  numbers, the hours, free or paid, and the chat URLs against ČAPLD before each release.
- **Unify the scattered crisis content onto the single validated source.** Today the content sits
  in `src/model.ts` (`HELP_LINES`), `src/features/help/crisisCard.ts`, `HelpScreen`,
  `HandoverScreen` and `AgeStep`. Keep the hardcoded verified core compiled in as the **offline
  fallback and safety net**.
- **The UI lands at M3+** (Pomoc/HelpScreen and the PHQ-9 item-9 crisis interstitial). **No UI
  during M0;** `apps/` stays empty.

---

## 11. Acceptance for the NOW (no UI)

- [x] (a) The spec and the safety invariants are in `docs/`: _this file_.
- [x] (b) The `CrisisLine` model and the ingestion with validation in `core/lumi-core/src/crisis/`
      (`model.rs`, `ingest.rs`); the frozen JSON fixture at
      `core/lumi-core/tests/fixtures/capld_linky_duvery_cr.json` behind the boundary validators;
      dual hours (`Hours { raw, parsed }`).
- [x] (c) The pure matcher (`matcher.rs`) and `open_state` (`hours.rs`) as a core module with unit
      tests (an injected clock and the adversarial-hours corpus).
- [x] (d) The CZ-data verification checklist: `cz-crisis-data-checklist.md`.
- [x] (e) `apps/` untouched; the tests pass (27 Rust tests and the 95 Jest tests of that time).

**Implementation notes.** The crate has **no dependencies** on purpose (a small in-house JSON
reader, `crisis/json.rs`), so the security core stays lean and builds with no C toolchain. On this
dev box without a toolchain, the musl target with the bundled `rust-lld` builds and tests it:
`cargo test --target x86_64-unknown-linux-musl` (see `core/Cargo.toml`). The FFI exposure (UniFFI,
read-only) and the connection of the matcher to the UI wait for M3+, per spec §10.

**Stopped here for review, per the spec.**
