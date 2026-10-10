# Lumi — project status

**Last updated:** 2026-10-10. The last commit on `main` before the review of 2026-10-09 is from
2026-06-15.

This file tells you where the project is and what comes next. Keep it short. Update it when a
milestone changes state. Record decisions in ADRs (`docs/adr/`). Track work items as GitHub issues,
not in this file.

## Milestones

| Milestone | Scope                                                                 | State                                |
| --------- | --------------------------------------------------------------------- | ------------------------------------ |
| M0        | Architecture ADR, Rust scaffold, CI, SBOM                             | Done (2026-06-13)                    |
| M1        | At-rest crypto core in Rust; one check-in through the stack on device | Done (2026-06-15)                    |
| M2        | Zero-knowledge sync and recovery                                      | Design only; paused since 2026-06-15 |
| M3        | v1 mobile: the app uses the Rust core; migration of existing data     | Not started                          |
| Later     | App lock (M4), integrity heuristic (M6), desktop, watch, web          | Not started                          |

Sources: ADR 0001 (milestones, §9, §12); commit `92f209e` (the M0 scaffold and CI, 2026-06-13);
`docs/m1-vertical-slice-proposal.md` (the M1 result).

The MVP is not one of these milestones. The MVP is a pilot Android build of the existing app
(ADR 0007, decided on 2026-10-10). ADR 0007 explains why the MVP does not need M2 or M3.

## What the code does today

- **The app that a user sees** stores its data with expo-sqlite, SQLCipher and Drizzle (`src/db/`).
  The database key is in expo-secure-store. The app has no backend.
- **The Rust vault** (`core/lumi-vault`, `core/lumi-store`, `core/lumi-ffi-cabi`,
  `modules/lumi-vault`) is a development skeleton. Only the screen `/m1-checkin` uses it. It stores
  check-ins only. It wraps the vault key under a PIN key only. It exists for Android only. It writes
  to its own file, `lumi-vault.db`.
- **Sync does not exist.** `server/lumi-sync-server` keeps blobs in memory and has no
  authentication. `core/lumi-sync-client` defines the wire envelope; sealing is a stub.
- **The crisis-line recommender** (`core/lumi-core/src/crisis/`) is complete as a core module. The
  app does not call it. The app shows hardcoded lines.

## Checks on 2026-10-09

Fresh clone of `main` (commit `4872666`). Toolchain: rustc 1.97.0, Node 22.22.0 (CI uses Node 20).

| Command                                                    | Result                                           |
| ---------------------------------------------------------- | ------------------------------------------------ |
| `cargo test --manifest-path core/Cargo.toml --workspace`   | 68 tests pass                                    |
| `cargo test --manifest-path server/Cargo.toml --workspace` | 2 tests pass                                     |
| `npm ci`                                                   | OK                                               |
| `npm run typecheck`                                        | OK                                               |
| `npm run lint`                                             | OK                                               |
| `npm test`                                                 | 16 suites, 95 tests pass                         |
| `npx expo export --platform web`                           | Export OK; the exported app is blank (finding 5) |

Not checked: the Android build and all behaviour on a device.

## Findings on 2026-10-09

File each finding as an issue. Then delete it from this list.

1. **The Android build needs files that are not in git.** `modules/lumi-vault` links into every
   Android build. Its CMake build needs `cpp/rust-libs/`, `cpp/lumi_ffi_cabi.h` and
   `nitrogen/generated/`. `.gitignore` excludes all three. Steps 1 and 2 of
   `modules/lumi-vault/RUNBOOK.md` make them (Rust, cargo-ndk, cbindgen, Android NDK, Nitrogen). CI
   has no Android job. This finding comes from the build files; the build was not run.
2. **`/m1-checkin` has no development-only guard.** Every build has the route (deep link
   `lumi://m1-checkin`). The PIN field has the default value `1234`. Added on 2026-10-10: the route
   is outside the onboarding guard in `app/_layout.tsx`. expo-router also adds a generated screen,
   `/_sitemap`, that lists every route; the plugin option `sitemap` is on by default. These two
   statements come from the source (`app/_layout.tsx`, expo-router 56.2.10). They were not checked
   on a device.
3. **If the database does not open, the app shows nothing.** `src/db/provider.tsx` renders `null`,
   and the splash screen stays. The Help tab is inside the provider, so the crisis contacts are not
   available.
4. **Jest does not test the real database path.** `test/setup.ts` replaces `src/db/connect` with
   better-sqlite3 in memory. `README.md` lists the native checks that are still open: encryption
   on disk, haptics, notifications, keep-awake and the PDF print.
5. **The web export is blank at run time.** `openDatabaseSync` fails with `Sync operation timeout`
   (headless Chromium, COOP and COEP headers set). expo-sqlite documents its web support as alpha.
   SQLCipher is not available on web.
6. **Content blocks a release.** `src/features/measure/definitions.ts` has five `TODO(Anna)`
   markers: check the wording of WHO-5, PHQ-9 and GAD-7 against the validated Czech versions. The
   crisis numbers are hardcoded in five app files (`src/model.ts`,
   `src/features/help/HelpScreen.tsx`, `src/features/help/HandoverScreen.tsx`,
   `src/features/help/crisisCard.ts`, `src/features/onboarding/AgeStep.tsx`) and again in
   `core/lumi-core/src/crisis/matcher.rs`. `docs/cz-crisis-data-checklist.md` has no sign-off.
7. **The backup export is plain JSON** (`src/db/backup.ts`). ADR 0001 S2 requires an encrypted
   export by default. Added on 2026-10-10, from the source: the export writes the file to the
   cache directory of the app and does not delete it after the share
   (`src/features/stats/BackupCard.tsx`). The backup holds the check-ins, the questionnaire results
   and three profile fields. It does not hold the crisis plan, the custom tags or the reminder
   settings. The import adds check-ins and questionnaire results only.
8. **The dependencies are from 2026-06-15.** 13 Dependabot PRs are open (the oldest is from
   2026-07-21). `npm audit` reports 83 advisories (1 critical, 63 high, 19 moderate); the comment in
   `ci.yml` from June says 3. Do not merge the old PRs without a check:
   - #31 (argon2 0.6, chacha20poly1305 0.11, getrandom 0.4) does not compile.
     `core/lumi-vault/src/lib.rs` calls `getrandom::getrandom`, which getrandom 0.4 does not have.
   - #37 moves `react-native-nitro-modules` and `nitrogen` from 0.35.9 to 0.37.1. CI cannot verify
     the Android binding.
   - #19 (shell-quote 1.10.0), #23 (brace-expansion 1.1.18) and #32 (js-yaml 3.15.2) target
     versions that are in the vulnerable ranges of `npm audit` on 2026-10-09 (shell-quote
     `<=1.10.0`, brace-expansion `<=1.1.20`, js-yaml `<=4.3.1`).
   - `.github/dependabot.yml` groups all cargo updates, including breaking `0.x` updates.
9. **One design document is missing.** ADR 0005 and the transport proposal cite the "M2 canonical
   data-model assessment (2026-06-15)". It is not in the repository. ADR 0005 states its conclusion.
10. **Issue #8 is open** (test gap: crisis scope-tag precedence).

## What blocks M2

These points block M2. They do not block the MVP (ADR 0007, "What follows from the decision").

1. ADR 0005 (key model) has the status "Proposed — NOT accepted; do not implement". It needs an
   independent crypto review and then Anna's ratification.
2. The PIN to keystore gating is not resolved. ADR 0005 calls it the headline question. It needs a
   product decision and the crypto review.
3. ADR 0006 (transport) is a draft. Anna must confirm its eight decisions.
4. Idempotent push and replay protection have no design (`docs/m2-transport-proposal.md` §2, §3.1).
5. The relay needs a controllership and lawful-basis sign-off before it ships (ADR 0001 §5.1).
6. The post-quantum gate of ADR 0004 (c) was not cleared on 2026-06-15. It blocks the ML-KEM layer
   only; ADR 0005 names "classical X25519 first" as the likely interim. Check the gate again.
7. M2 also needs client work that does not exist. The vault stores check-ins only. M2 needs all
   four entities (entries, measurements, tags, settings), HLC stamps, device ids, the keystore
   wrap, the recovery wrap, and the screens for PIN, recovery and device pairing.

## Next steps

**Decided on 2026-10-10 (ADR 0007):** the MVP is a pilot Android build of the existing app.

**Not decided:** the steps and the two rules below. They are a proposal of 2026-10-09.

1. Bring the dependencies up to date (finding 8).
2. Make a pilot Android build that does not link `modules/lumi-vault` and does not expose
   `/m1-checkin`. The code stays in the repository.
3. Do the open native checks on a device (finding 4). Add a fallback for finding 3.
4. Close the content blockers (finding 6).
5. Run a small pilot with adult students. Give the build to an expert reviewer.

**Proposed rule for real data:** do not put real user data into the Rust vault before ADR 0005 is
accepted. ADR 0005 ("Change vs M1") assumes that the vault holds no real user data and needs no
migration. ADR 0004 (e) already requires a hardening of the vault store before any real user. That
hardening is not built.

**Proposed rule for the return to M2:** start M2 when both conditions are true. (a) ADR 0005 passed
an independent crypto review. (b) The pilot showed that users need a second device or a restore.

## Where the history is

- Decisions: `docs/adr/` (0001 to 0007).
- Analysis behind the decisions: `docs/m1-vertical-slice-proposal.md`,
  `docs/m2-transport-proposal.md`.
- Spike reports: `spikes/rn-ffi/SPIKE-REPORT.md`, `spikes/rn-nitro/SPIKE-REPORT.md`.
- Device procedure for the vault module: `modules/lumi-vault/RUNBOOK.md`.
