# Lumi — project status

**Last updated:** 2026-10-22 (standards refactor, PR #43). The last commit on `main` before the
review of 2026-10-09 is from 2026-06-15.

This file tells you where the project is and what comes next. Keep it short. Update it when a
milestone changes state. Record decisions in ADRs (`docs/adr/`). Track work items as GitHub issues,
not in this file.

## Milestones

| Milestone | Scope                                                                 | State                                |
| --------- | --------------------------------------------------------------------- | ------------------------------------ |
| M0        | Architecture ADR, Rust scaffold, CI, SBOM                             | Done (2026-06-13)                    |
| M1        | At-rest crypto core in Rust; one check-in through the stack on device | Done (2026-06-15)                    |
| M2        | Zero-knowledge sync and recovery                                      | Design only; paused since 2026-06-15 |
| M3        | v1 mobile: the app uses the Rust core; migration of the current data  | Not started                          |
| Later     | App lock (M4), integrity heuristic (M6), desktop, watch, web          | Not started                          |

Sources: ADR 0001 (milestones, §9, §12); commit `92f209e` (the M0 scaffold and CI, 2026-06-13);
`docs/m1-vertical-slice-proposal.md` (the M1 result).

The MVP is not one of these milestones. The MVP is a pilot Android build of the current app
(ADR 0007, decided on 2026-10-10). ADR 0007 explains why the MVP does not need M2 or M3.

## What the code does today

- **The app that a user sees** stores its data with expo-sqlite, SQLCipher and Drizzle (`src/db/`).
  The database key is in expo-secure-store. The app has no backend.
- **The Rust vault** (`core/lumi-vault`, `core/lumi-store`, `core/lumi-ffi-cabi`,
  `modules/lumi-vault`) is a development skeleton. Only the screen `/m1-checkin` uses it. It stores
  check-ins only. It wraps the vault key under a PIN key only. It exists for Android only. It writes
  to its own file, `lumi-vault.db`.
- **Android builds leave the Rust vault out** (since 2026-10-10). `package.json` excludes
  `modules/lumi-vault` from Expo autolinking. While `M1_VAULT_SKELETON_ENABLED` is false
  (`src/lib/featureFlags.ts`), the app has no screen `/m1-checkin` (`app/_layout.tsx`).
- **A GitHub runner builds the Android APK** (`.github/workflows/android-apk.yml`). A pull request
  gets a build check; a check on GitHub on 2026-10-10 confirmed this. A tag makes a draft release
  with an APK that the pilot key signs; this path is not checked on GitHub yet.
  [`docs/pilot-release.md`](pilot-release.md) has the steps.
- **Sync does not exist.** `server/lumi-sync-server` keeps blobs in memory and has no
  authentication. `core/lumi-sync-client` defines the wire envelope; the seal is a stub.
- **The crisis-line recommender** (`core/lumi-core/src/crisis/`) is complete as a core module. The
  app does not call it. The app shows hardcoded lines (`src/model.ts`, `src/features/help/lines.ts`).
- **The frontend follows the Apple Human Interface Guidelines on iOS and the Android design
  guidelines on Android** (PR #41, 2026-10-17). It has native stack headers and native tabs. The
  light and dark scheme comes from the system (no in-app switch). One `Text` component carries
  Dynamic Type. A contrast test covers every colour pair (WCAG 2.2 AA in both schemes). It has
  platform symbols, a Settings screen, discard guards on unsaved work, and crisis lines reachable
  without the database and before onboarding. None of this is checked on a device yet;
  [`docs/device-verification.md`](device-verification.md) lists the checks.

**Rules since 2026-10-18.** Documentation and comments are English STE (Vale checks them in CI).
The user interface text lives in message catalogs (cs and en, i18next). Accessibility gates run in
CI: the contrast test, the screen audit, and axe-core on the design system. `README.md`, section
"Standards", lists the standards and the gates.

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

Not checked on 2026-10-09: the Android build and all behaviour on a device.

On 2026-10-10 a GitHub runner built the Android APK for `arm64-v8a` (workflow `Android APK`). The
APK is about 55 MB. It has no native library of the Rust vault. The JS bundle still has the M1
screen and the vault binding; the app does not load them. The install and all behaviour on a
device are still not checked.

## Checks on 2026-10-17

Branch `claude/youthful-archimedes-x7q98o` (PR #41), after phase 7 of the refactor.

| Command             | Result                                                                   |
| ------------------- | ------------------------------------------------------------------------ |
| `npm run typecheck` | OK                                                                       |
| `npm run lint`      | OK                                                                       |
| `npm test`          | 23 suites, 293 tests pass (jest-expo Android preset)                     |
| `npx expo-doctor`   | Not run: the sandbox could not reach the Expo API                        |
| Device              | Not checked; see [`docs/device-verification.md`](device-verification.md) |

## Checks on 2026-10-22

Branch `claude/happy-cerf-pjne8p` (PR #43), after the standards refactor. Toolchain: Node 22.22.0,
rustc 1.97.0, Vale 3.24.0.

| Command                                                    | Result                                                                             |
| ---------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| `npm run typecheck`                                        | OK                                                                                 |
| `npm run lint`                                             | OK, 0 errors and 0 warnings                                                        |
| `npm test`                                                 | Android project: 27 suites, 343 tests pass. Web project: 1 suite, 34 tests pass.   |
| `npm run i18n:check`                                       | OK: the extraction changes nothing; cs and en are complete (12 namespaces)         |
| `npm run check:docs`                                       | OK: Prettier, markdownlint, cspell, Vale (0 errors), the English check, the mirror |
| `cargo test --manifest-path core/Cargo.toml --workspace`   | 68 tests pass                                                                      |
| `cargo test --manifest-path server/Cargo.toml --workspace` | 2 tests pass                                                                       |
| cbindgen header                                            | Regenerated from the Rust source and committed                                     |
| `cd design && npm run build`                               | Not run here; the CI job `Design tokens (Style Dictionary)` checks it              |
| Device                                                     | Not checked; see [`docs/device-verification.md`](device-verification.md)           |

Open for the owner after the merge:

1. Point the ruleset of `main` at the checks that `README.md`, section "Standards", lists.
2. Decide the code licence; the repository has none.
3. Validate the questionnaire wording (finding 6) and sign the crisis-line checklist.

## Findings on 2026-10-09

File each finding as an issue. Then delete it from this list.

1. **An Android build with the Rust vault needs files that are not in git.** The CMake build of
   `modules/lumi-vault` needs `cpp/rust-libs/`, `cpp/lumi_ffi_cabi.h` and `nitrogen/generated/`.
   `.gitignore` excludes all 3. Steps 1 and 2 of `modules/lumi-vault/RUNBOOK.md` make them
   (Rust, cargo-ndk, cbindgen, Android NDK, Nitrogen). Changed on 2026-10-10: Android builds leave
   the module out (`package.json`), so they do not need these files. CI builds the app without
   the vault. No CI job builds the vault for Android.
2. **`/m1-checkin` is off by default, and it is not safe to turn on for testers.** Changed on
   2026-10-10: the app has no screen `/m1-checkin` while `M1_VAULT_SKELETON_ENABLED` is false. A
   test covers this (`test/m1Route.test.tsx`). With the flag on, the old problems come back. The
   route has no development-only guard. The PIN field has the default value `1234`. The route is
   outside the onboarding guard. expo-router also adds a generated screen, `/_sitemap`, that lists
   every route; the plugin option `sitemap` is on by default. The statement about `/_sitemap`
   comes from the source (expo-router 56.2.10). Nobody checked it on a device.
3. **If the database does not open, the app shows nothing.** `src/db/provider.tsx` renders `null`,
   and the splash screen stays. The Help tab is inside the provider, so the crisis contacts are not
   available. Changed on 2026-10-17: the provider renders a fallback screen with the crisis lines
   when the database fails to open (`src/features/help/CrisisFallback.tsx`). The error boundary
   shows the same lines. `/crisis` is reachable before onboarding. Not checked on a device.
4. **Jest does not test the real database path.** `test/setup.ts` replaces `src/db/connect` with
   better-sqlite3 in memory. `README.md` lists the native checks that are still open: encryption
   on disk, haptics, notifications, keep-awake and the PDF print.
5. **The web export is blank at run time.** `openDatabaseSync` fails with `Sync operation timeout`
   (headless Chromium, `COOP` and `COEP` headers set). expo-sqlite documents its web support as
   alpha. SQLCipher is not available on web.
6. **Content blocks a release.** `src/features/measure/definitions.ts` has 5 `TODO(Anna)`
   markers: check the wording of WHO-5, PHQ-9 and GAD-7 against the validated Czech versions. 5
   app files hold the crisis numbers in code (`src/model.ts`, `src/features/help/HelpScreen.tsx`,
   `src/features/help/HandoverScreen.tsx`, `src/features/help/crisisCard.ts`,
   `src/features/onboarding/AgeStep.tsx`), and `core/lumi-core/src/crisis/matcher.rs` holds them
   again. `docs/cz-crisis-data-checklist.md` has no sign-off. Changed on 2026-10-17: the app reads
   the contact list from `src/features/help/lines.ts` (116 006 added, Rodičovská linka hours
   corrected to `Po–Čt 9–21, Pá 9–17`). It reads the primary lines from `HELP_LINES` in
   `src/model.ts`. `crisisCard.ts`, `HandoverScreen.tsx` and the Rust matcher still carry their
   own copies. The checklist still has no sign-off. Changed on 2026-10-18: the app reads the
   crisis lines from one source (`src/features/help/lines.ts`) and the questionnaire text from the
   catalogs, with a `_meta.todo` note. The copy in the Rust matcher and the checklist sign-off
   stay open.
7. **The backup export is plain JSON** (`src/db/backup.ts`). ADR 0001 S2 requires an encrypted
   export by default. Added on 2026-10-10, from the source: the export writes the file to the
   cache directory of the app. It does not delete the file after the share
   (`src/features/settings/BackupSection.tsx`; moved from Přehledy to Nastavení on 2026-10-17).
   The backup holds the check-ins, the questionnaire results and 3 profile fields. It does not
   hold the crisis plan, the custom tags or the reminder settings. The import adds check-ins and
   questionnaire results only.
8. **The dependencies are from 2026-06-15.** 13 Dependabot PRs are open (the oldest is from
   2026-07-21). `npm audit` reported 83 advisories (1 critical, 63 high, 19 moderate) on
   2026-10-09; the comment in `ci.yml` from June said 3. Do not merge the old PRs without a check:
   - #31 (`argon2` 0.6, `chacha20poly1305` 0.11, `getrandom` 0.4) does not compile.
     `core/lumi-vault/src/lib.rs` calls `getrandom::getrandom`, which `getrandom` 0.4 does not
     have.
   - #37 moves `react-native-nitro-modules` and `nitrogen` to 0.37.1. CI builds the Android app
     without the vault module. CI thus cannot verify the vault binding.
   - #19 (`shell-quote` 1.10.0), #23 (`brace-expansion` 1.1.18) and #32 (`js-yaml` 3.15.2) are
     obsolete. `package-lock.json` now has `shell-quote` 1.12.0, `brace-expansion` 1.1.21 / 5.0.12
     and `js-yaml` 4.3.2 / 3.15.2 (see below). Dependabot closes such PRs on its next run. Close
     them by hand if it does not.
   - `.github/dependabot.yml` groups all cargo updates, also the `0.x` updates that break the API.

   Changed on 2026-10-18:

   - `package-lock.json` moved the transitive packages that have a published fix (`shell-quote`,
     `@xmldom/xmldom`, `brace-expansion`, `js-yaml`, `browserslist`, `baseline-browser-mapping`,
     `compression`, `form-data`, `nanoid`, `postcss`, `source-map-js`). `package.json` is
     unchanged.
   - `npm audit` now reports 75 advisories (0 critical, 54 high, 21 moderate), so the `audit` job
     in `ci.yml` stays red and report-only.
   - What is left has no fix within the pinned toolchain. `braces`: every published version has
     the advisory (`GHSA-vfj7-8cjw-p6xm`); it reaches jest, metro, expo and react-native through
     micromatch and accounts for most of the 54 high. `node-forge` 1.4.0 (the latest release,
     `GHSA-86w9-cpqp-85rv`, through `@expo/cli`). `image-size` 1.2.1 (metro 0.84 pins 1.x; the
     fix is 2.0.3). The moderate ones: `sprintf-js`, `uuid` 7 (xcode), `decode-uri-component`
     (query-string in expo-router 56) and `esbuild` (drizzle-kit 0.31).
   - `npm audit fix` cannot run: it fails with `ERESOLVE`, because react-native-reanimated
     `^4.3.1` resolves to 4.7.1, which needs React Native 0.86. `npm update` updated the packages
     by name.
   - `design/` has its own lockfile with 8 advisories (style-dictionary `^4`, fixed in 5.4.4, a
     major with a config migration; braces). CI does not audit it.

9. **One design document is absent.** ADR 0005 and the transport proposal cite the "M2 canonical
   data-model assessment (2026-06-15)". It is not in the repository. ADR 0005 states its conclusion.
10. **Issue #8 is open** (test gap: crisis scope-tag precedence).
11. **The APK declares permissions that the app code does not use** (added on 2026-10-10, from the
    APK that the runner built). The manifest has `RECORD_AUDIO`, `INTERNET`,
    `SYSTEM_ALERT_WINDOW`, `RECEIVE_BOOT_COMPLETED`, `USE_BIOMETRIC`, `READ_EXTERNAL_STORAGE` and
    `WRITE_EXTERNAL_STORAGE` (only up to Android 12L), and more. `app.json` lists 4 permissions,
    with `RECORD_AUDIO` among them. The Expo template and the libraries add the others. The code
    in `app/` and `src/` does not record audio and makes no network call. Check each permission
    before the pilot.
12. **The release APK has parts of the development tools** (added on 2026-10-10, from the APK and
    the build log). The APK has the classes of expo-dev-client and the URL scheme `exp+lumi`.
    `expo-dev-client` is a normal dependency in `package.json`. The prebuild step prints a
    warning: `userInterfaceStyle` needs `expo-system-ui`, which is not installed. The effect of
    both points on a device is not checked. Changed on 2026-10-17: `expo-system-ui` is a
    dependency and `userInterfaceStyle` is `automatic` (light and dark from the system).

## What blocks M2

These points block M2. They do not block the MVP (ADR 0007, "What follows from the decision").

1. ADR 0005 (key model) has the status "Proposed — NOT accepted; do not implement". It needs an
   independent crypto review and then Anna's ratification.
2. The PIN-to-keystore gate is open. ADR 0005 calls it the headline question. It needs a product
   decision and the crypto review.
3. ADR 0006 (transport) is a draft. Anna must confirm its 8 decisions.
4. Idempotent push and replay protection have no design (`docs/m2-transport-proposal.md` §2, §3.1).
5. The relay needs a controllership and lawful-basis sign-off before it ships (ADR 0001 §5.1).
6. The post-quantum gate of ADR 0004 (c) was still closed on 2026-06-15. It blocks the ML-KEM layer
   only; ADR 0005 names "classical X25519 first" as the likely interim. Check the gate again.
7. M2 also needs client work that does not exist. The vault stores check-ins only. M2 needs all
   4 entities (entries, measurements, tags, settings), HLC stamps and device ids. It also needs
   the keystore wrap, the recovery wrap, and the screens for PIN, recovery and device pairing.

## Next steps

First, check the refactored frontend on a device:
[`docs/device-verification.md`](device-verification.md). The checks cover TalkBack and VoiceOver,
200 % text, dark theme and gesture navigation. They also cover the lock-screen visibility of
reminders and the native tab bar and headers on iOS 26. Then:

**Decided on 2026-10-10 (ADR 0007):** the MVP is a pilot Android build of the current app.

**Done in code on 2026-10-10, not recorded in an ADR:** Android builds leave the Rust vault out. A
GitHub runner builds the APK, signs it and puts it into a draft release. ADR 0007 lists both
points as not decided.

**Not decided:** the steps and the 2 rules below. They are a proposal of 2026-10-09. The steps
changed on 2026-10-10.

1. Make the pilot signing key and the first pilot build ([`pilot-release.md`](pilot-release.md)).
   Install the build on a device.
2. Do the open native checks on a device (finding 4). Add a fallback for finding 3.
3. Update the dependencies (finding 8). The workflow `Android APK` checks each PR that
   changes `package.json` or `package-lock.json`. An open Dependabot PR needs a rebase first.
4. Close the content blockers (finding 6). Check the permissions and the development tools in
   the APK (findings 11 and 12).
5. Run a small pilot with adult students. Give the build to an expert reviewer.

**Proposed rule for real data:** do not put real user data into the Rust vault before the
acceptance of ADR 0005. ADR 0005 ("Change vs M1") assumes that the vault holds no real user data
and needs no migration. ADR 0004 (e) already requires a hardened vault store (SQLCipher over the
index) before any real user. That layer is not built.

**Proposed rule for the return to M2:** start M2 when both conditions are true. (a) ADR 0005 passed
an independent crypto review. (b) The pilot showed that users need a second device or a restore.

## Where the history is

- Decisions: `docs/adr/` (0001 to 0007).
- Analysis behind the decisions: `docs/m1-vertical-slice-proposal.md`,
  `docs/m2-transport-proposal.md`.
- Spike reports: `spikes/rn-ffi/SPIKE-REPORT.md`, `spikes/rn-nitro/SPIKE-REPORT.md`.
- Device procedure for the vault module: `modules/lumi-vault/RUNBOOK.md`.
