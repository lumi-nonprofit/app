# ADR 0002 — Interoperability boundary: FHIR / SMART on FHIR / Open mHealth

- **Status:** **Design-intent stub — DO NOT BUILD.** Recorded so the data model
  does not paint itself into a corner. No interop code, endpoints, or dependencies
  are part of v1. Ratified as record-only in ADR 0001 (Ratification 2026-06-13 #2).
- **Date:** 2026-06-13
- **Relates to:** ADR 0001 §4 (data model), §5 (sync). Self-reported-only constraint
  (EU AI Act) and Art. 9 posture from the brief still bind any future interop.

## Intent

If/when Lumi ever exposes an interoperability or export API (e.g. to let a user
share their own data with a clinician, a research study under the gated consent
flow, or a personal health record), it should map to **established health-data
standards at the boundary**, not invent a bespoke wire format:

- **HL7 FHIR R4+** resources for clinical-shaped data (e.g. `Observation`,
  `QuestionnaireResponse` for WHO-5 / PHQ-9 / GAD-7, `Patient` only where a real
  identity exists).
- **SMART on FHIR** for the authorization/launch model if a clinician-facing or
  third-party-app integration is ever offered (OAuth2 scopes, app launch).
- **Open mHealth** schemas for the self-tracked wellbeing/mood signals that don't
  map cleanly to clinical FHIR (mood, sleep, activity-style self-reports).

## Internal model stays internal

The **Rust-native event model** (the op-log + CRDT records in ADR 0001 §4) remains
the internal source of truth. FHIR / Open mHealth are **boundary mappings**, applied
only at an explicit export/share edge — never the internal storage or sync format.
This keeps the zero-knowledge sync (ciphertext blobs) and the local schema free to
evolve while preserving a clean, standards-based export path.

## What this means for the M0/M1 data model (the only actionable part now)

- Keep record types **mappable** to FHIR `Observation` / `QuestionnaireResponse`:
  retain instrument id, item-level answers, score, timestamp, and a stable record
  id — all of which the current `measurements`/`entries` shapes already carry.
- Do **not** bake FHIR vocabularies, LOINC/SNOMED codes, or any standard's
  structure into the internal records; map at the boundary later.
- Keep the self-report provenance explicit (EU AI Act: no inferred emotion) so any
  future `Observation` is correctly typed as patient-reported.

## Non-goals (v1)

No FHIR server, no SMART launch, no export endpoint, no interop dependencies. This
ADR exists solely to prevent foreclosing the path. Promote to a full ADR when an
interop feature is actually scoped.
