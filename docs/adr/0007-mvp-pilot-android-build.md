# ADR 0007 — The MVP is a pilot Android build of the existing app

- **Status:** **Decided (2026-10-10)** by Anna. The decision is the one sentence in _Decision_.
- **Date:** 2026-10-10
- **Decision owner:** Anna (clinical / product / final architecture sign-off).
- **Source:** Anna's message of 2026-10-10 to the AI assistant that wrote this ADR. _Decision_
  quotes the message.
- **Relates to:** ADR 0001 (§1 Rust core, §6 migration, §9 security requirements, §12 platform
  scope), ADR 0004 (e), ADR 0005 and [`docs/STATUS.md`](../STATUS.md). References to
  `docs/STATUS.md` mean the version of 2026-10-10. This ADR does not change the earlier ADRs
  (0001 to 0006).

## Context

- The last commit on `main` before the repository review of 2026-10-09 is from 2026-06-15
  (commit `4872666`). That commit marked M1 complete. The results of the review are in
  `docs/STATUS.md`.
- The repository did not define an MVP. ADR 0001 defines v1: the mobile app for Android and iOS
  (§12) on the shared Rust core (§1), at milestone M3.
- The screens that a user sees today do not need a backend. They store their data on the device
  with expo-sqlite, SQLCipher and Drizzle (`src/db/`).
- M2 (zero-knowledge sync and recovery) is a design only. M2 waits for an independent crypto
  review, for open decisions, and for design and client work that is not done (`docs/STATUS.md`,
  "What blocks M2").

## Decision

> „MVP je pilotní Android build stávající appky“
>
> — Anna, 2026-10-10

In English: the MVP is a pilot Android build of the existing app.

Only this sentence is the decision. The sections below are a reading of the sentence. They explain
the sentence and state its limits. If the reading and the sentence differ, the sentence is
correct.

## Terms

- **Existing app:** the React Native (Expo) app at the root of this repository, as it is on
  2026-10-10 (version 0.1.0 in `app.json`).
- **Android build:** a build of the existing app for Android. An iOS build and a web build are
  not part of the MVP.
- **Pilot:** a test with a limited group of testers. A pilot is not a public release.

## What follows from the decision

1. The MVP is not v1. In ADR 0001, v1 is this app at M3, on the Rust core.
2. The MVP does not need M2. The existing app has no sync. The points in `docs/STATUS.md`,
   "What blocks M2", do not block the MVP.
3. The MVP does not need M3. The screens that a user sees do not use the Rust core.
4. The Rust vault is the part of the Rust core that M1 built. Only the screen `/m1-checkin` uses
   the vault, and every build has this screen. The vault module also links into every Android
   build today, and that build needs files that are not in git (`docs/STATUS.md`, findings 1
   and 2).
5. The screens that a user sees write to the SQLCipher database, not to the Rust vault. Real data
   that a pilot tester enters on these screens is in that database. ADR 0001 §6 describes the
   migration of that database to the Rust core.
6. The existing app does not meet some security requirements of ADR 0001 §9. ADR 0001 plans these
   requirements for the new design. Three examples from the code on 2026-10-10:
   - S1: the app gets the database key without a PIN or a biometric check (`src/db/key.ts`,
     `requireAuthentication: false`).
   - S2: the backup export is plain JSON (`src/db/backup.ts`).
   - S4: the app has no app lock.

   This list is not a full check against S1 to S12.

## What this ADR does not decide

`docs/STATUS.md` ("Next steps") has a proposal for some of these points. A proposal is not a
decision.

- When work on M2 starts again.
- Whether the pilot build links the Rust vault module, and whether it exposes the screen
  `/m1-checkin`.
- Whether real user data can go into the Rust vault before ADR 0005 is accepted. ADR 0004 (e)
  already requires a hardening of the vault store before any real user. That hardening is not
  built.
- Who the pilot testers are, how many testers there are, and how long the pilot runs.
- Whether pilot testers enter real data, and what happens to pilot data after the pilot.
- How the build is made, signed and distributed.
- Which findings of `docs/STATUS.md` and which gaps against ADR 0001 §9 must be closed before
  testers get the build.

## References

- ADR 0001: §1, §6, §9 and §12.
- ADR 0004: decision (e).
- ADR 0005: status, and "Change vs M1".
- [`docs/STATUS.md`](../STATUS.md): milestones, findings, "What blocks M2", "Next steps".
