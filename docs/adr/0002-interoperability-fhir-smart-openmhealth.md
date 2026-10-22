# ADR 0002 — Interoperability boundary: FHIR / SMART on FHIR / Open mHealth

> **Note (2026-10-18):** Rewritten in Simplified Technical English on 2026-10-18; decisions and section numbering unchanged.

- **Status:** **Design-intent stub — DO NOT BUILD.** This record exists so that the data model keeps
  a path to the standards open. Interop code, endpoints and dependencies are not part of v1. ADR
  0001 ratified this record as record-only (Ratification 2026-06-13 #2).
- **Date:** 2026-06-13
- **Relates to:** ADR 0001 §4 (data model), §5 (sync). The self-reported-only constraint (EU AI
  Act) and the Article 9 posture from the brief also bind each future interop feature.

## Intent

Lumi can one day expose an interoperability or export API. Examples: a user shares their own data
with a clinician, with a research study under the gated consent flow, or with a personal health
record. Such an API must map to **established health-data standards at the boundary**. A bespoke
wire format is not an option:

- **HL7 FHIR R4+** resources for clinical-shaped data (for example `Observation`,
  `QuestionnaireResponse` for WHO-5 / PHQ-9 / GAD-7, and `Patient` only where a real identity
  exists).
- **SMART on FHIR** for the authorization and launch model (OAuth2 scopes, app launch). This
  applies if Lumi ever offers an integration for clinicians or for third-party apps.
- **Open mHealth** schemas for the self-tracked wellbeing and mood signals that do not map cleanly
  to clinical FHIR. Examples: mood, sleep and activity-style self-reports.

## Internal model stays internal

The **Rust-native event model** (the op-log and the CRDT records in ADR 0001 §4) stays the internal
source of truth. FHIR and Open mHealth are **boundary mappings**. The app applies them only at an
explicit export or share edge, never as the internal storage format or the sync format. Thus the
zero-knowledge sync (ciphertext blobs) and the local schema stay free to evolve, and the export
path stays clean and based on standards.

## What this means for the M0/M1 data model (the only actionable part now)

- Keep the record types **mappable** to FHIR `Observation` and `QuestionnaireResponse`: keep the
  instrument id, the item-level answers, the score, the timestamp and a stable record id. The
  current `measurements` and `entries` shapes already carry all of these fields.
- Do **not** bake FHIR vocabularies, LOINC/SNOMED codes or the structure of any standard into the
  internal records. Map at the boundary later.
- Keep the self-report provenance explicit (EU AI Act: the user reports the emotion, and the app
  infers nothing). Then each future `Observation` gets the correct type: patient-reported.

## Non-goals (v1)

v1 has no FHIR server, no SMART launch, no export endpoint and no dependencies for interop. This
ADR exists only to keep the path open. Promote it to a full ADR when an interop feature gets a
real scope.
