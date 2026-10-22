# Lumi

Lumi is a Czech mobile app for mental wellbeing: a check-in of emotions, calm exercises, overviews
and help in a crisis. It is free and non-profit. The user interface is Czech; an English catalog
exists for development and review.

**Project status and next steps:** [`docs/STATUS.md`](docs/STATUS.md).

The implementation follows the high-fidelity prototype "Lumi Prototyp" from Claude Design (handoff
of 2026-06-12) and the Lumi design system. The design tokens in `design/tokens/` are the source of
truth; Style Dictionary generates `src/theme/tokens.generated.ts` from them. The components in
`src/ds/` match the design-system bundle. The app is a native mobile app in Expo and React Native
(iOS, Android, and web through react-native-web). The user interface follows the Apple Human
Interface Guidelines on iOS and the Android design guidelines (Material 3) on Android. The light
and the dark scheme follow the system, and the text scales with Dynamic Type (see
[Accessibility](#accessibility)).

**Stack:** Expo SDK 56, React Native 0.85, React 19 and TypeScript (strict). The router is
expo-router with typed routes. The database is SQLite with SQLCipher and Drizzle ORM, and the
texts come from i18next. ESLint (expo, react-native-a11y, i18next) and Prettier check the code.
The app is local-first, works offline, and has no backend and no telemetry.

## Standards

The repository follows the standards below. Every contribution, from a person or from an AI agent,
must follow them. CI enforces what a tool can check. The gate column names the local command and
the CI check. [`CONTRIBUTING.md`](CONTRIBUTING.md) explains how to pass each gate, and
[`AGENTS.md`](AGENTS.md) (identical to `CLAUDE.md`) tells AI agents to follow this section.

| Standard                                                                                                                                                                                                                                                                                                                                                                      | Scope                                                                                                                                          | Gate                                                                                                                                                                                               |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [ASD-STE100 Simplified Technical English](https://www.asd-ste100.org/), Issue 9                                                                                                                                                                                                                                                                                               | Every Markdown file, every comment in the source code and every commit body. [`docs/writing-rules.md`](docs/writing-rules.md) lists the rules. | `npm run lint:docs` (Vale, style `STE`), `npm run check:english` and `scripts/lint-commit-bodies.sh`. CI: `Docs and comments (STE)`, `Commit messages`.                                            |
| [Contributor Covenant 2.1](https://www.contributor-covenant.org/version/2/1/code_of_conduct/)                                                                                                                                                                                                                                                                                 | Conduct in the community.                                                                                                                      | [`CODE_OF_CONDUCT.md`](CODE_OF_CONDUCT.md). A person enforces it; no tool can.                                                                                                                     |
| [Conventional Commits 1.0](https://www.conventionalcommits.org/)                                                                                                                                                                                                                                                                                                              | Commit messages.                                                                                                                               | commitlint (`commitlint.config.js`). CI: `Commit messages`.                                                                                                                                        |
| [Apple Human Interface Guidelines](https://developer.apple.com/design/human-interface-guidelines/)                                                                                                                                                                                                                                                                            | The user interface on iOS.                                                                                                                     | ESLint: `ds/Text` only, theme roles only, no raw sizes or colours in screens. The screen audit with 44 pt targets on iOS. CI: `JS app (RN/Expo)`.                                                  |
| [Android design guidelines](https://developer.android.com/design/) (Material 3)                                                                                                                                                                                                                                                                                               | The user interface on Android.                                                                                                                 | The same lint. The screen audit with 48 dp targets under the Android Jest preset. CI: `JS app (RN/Expo)`.                                                                                          |
| [European Accessibility Act](https://commission.europa.eu/strategy-and-policy/policies/justice-and-fundamental-rights/disability/european-accessibility-act-eaa_en) and the [AccessibleEU list of harmonised standards](https://accessible-eu-centre.ec.europa.eu/document/download/f096e2b7-06b5-47aa-935d-5be981b642ab_en?filename=plantilla%20referencias_UNE_2.pdf) (PDF) | Accessibility of the app in the EU. The harmonised standard EN 301 549 points to WCAG 2.1 AA, a subset of the project target.                  | The WCAG 2.2 gates below.                                                                                                                                                                          |
| [WCAG 2.2](https://www.w3.org/TR/WCAG22/), level AA                                                                                                                                                                                                                                                                                                                           | The user interface.                                                                                                                            | `eslint-plugin-react-native-a11y`. `test/contrast.test.ts`. The screen audit `test/a11y/screens.test.tsx`. axe-core over the design system in `test/a11y/ds.web.test.tsx`. CI: `JS app (RN/Expo)`. |
| [W3C Internationalization](https://www.w3.org/International/i18n-drafts/nav/about) and [MDN: Internationalization](https://developer.mozilla.org/en-US/docs/Glossary/Internationalization)                                                                                                                                                                                    | Every text and every format that the user sees.                                                                                                | ESLint `i18next/no-literal-string`. `npm run i18n:check` (extraction and the parity of cs and en). CI: `i18n catalogs`.                                                                            |
| `AGENTS.md` = `CLAUDE.md`                                                                                                                                                                                                                                                                                                                                                     | Instructions for AI agents.                                                                                                                    | `npm run check:agents`. CI: `Docs and comments (STE)`.                                                                                                                                             |

2 limits of the gates:

- ASD holds the copyright of the ASD-STE100 dictionary, and no open-source checker covers the full
  specification. The gate checks the mechanical rules and a project vocabulary. The rules are the
  sentence length, the passive voice, -ing forms, contractions, Latin abbreviations, unapproved
  words, modal verbs and Czech text. Reviewers check the rest (`docs/writing-rules.md`, section
  "Rules that a person checks in review").
- axe-core runs on the design system and on the screens that need no database, in jsdom. The web
  export of the app is blank (expo-sqlite has no web build), so axe cannot run over the whole app.
  The screen audit under the Android preset covers every route instead.

The ruleset on `main` must require these checks: `Rust (ubuntu-latest)`, `Rust (macos-latest)`,
`Rust (windows-latest)`, `Rust musl cross-build (core portability guard)`, `FFI header (cbindgen)`,
`JS app (RN/Expo)`, `Docs and comments (STE)`, `i18n catalogs`, `Commit messages`,
`Design tokens (Style Dictionary)` and `SBOM (CycloneDX)`. `Dependency audit (report-only)` and
the path-filtered `Android APK` jobs are not required.

## Run

```bash
npm install
npm start         # the Expo dev server (QR code for Expo Go or a dev client)
npm run android   # run on Android
npm run ios       # run on iOS
npm run web       # run in a browser (react-native-web)
npm test          # Jest: the Android project and the web project
```

Production builds use the standard Expo pipeline (`eas build`, or `npx expo export` for the web).
GitHub Actions builds the pilot Android APK; [`docs/pilot-release.md`](docs/pilot-release.md) has
the procedure.

## Develop

The database is encrypted with SQLCipher (the config plugin of `expo-sqlite`). SQLCipher does not
work in Expo Go, so a device or an emulator needs a development build:

```bash
npx expo prebuild           # generates the native projects (android/, ios/)
npx expo run:android        # builds and installs on Android (emulator or device)
npx expo run:ios            # builds and installs on iOS (macOS only)
```

After a change of the database schema (`src/db/schema.ts`), generate a migration:

```bash
npx drizzle-kit generate    # writes the SQL and the journal into drizzle/
```

The app registers the migrations at start (`src/db/connect.ts`) and then runs the data migrations
(`src/db/dataMigrations.ts`). The tests run against the same schema and migrations with
better-sqlite3 in memory (`test/helpers/testDb.ts`), so logic work needs no native build.

Local reminders (`expo-notifications`) also need a development build. The library still exists;
since SDK 53, only remote push notifications stopped in Expo Go. The app schedules local
notifications only and uses no push token; in Expo Go a warning appears.

Checks: `npm run check:all` (see [`CONTRIBUTING.md`](CONTRIBUTING.md)) and `npx expo-doctor`.

## What the app does

- **Onboarding (3 screens):** the name (optional), the age band and privacy. The age band selects
  the primary crisis line; it can stay empty. The buttons are "Začít", "Pokračovat" and "Hotovo".
  Every step links to the crisis help (`/crisis`).
- **Dnes (Today):** a greeting by the time of day and the dominant check-in card. After an entry
  of today, the card becomes a summary. Below it: the wellbeing index from real data, "Pro tebe"
  (1 source of recommendations) and the crisis card. The header has "+" (a new check-in) and a
  gear (Nastavení).
- **Check-in:** step 1 is the state and the intensity 1 to 5. Step 2 is 1 to 2 words, context
  tags, custom tags and an optional note. A confirmation with a tip for the state follows.
  Haptics accompany the selection and the save.
- **Questionnaires:** WHO-5 (the wellbeing index, every 14 days). PHQ-9 and GAD-7 sit in the
  section "Chceš jít víc do hloubky?". One question per card. The result is a band and a trend
  against the own measurements, never a diagnosis. A disclaimer comes before the first deeper
  screening. An answer above 0 to PHQ-9 question 9 leads to a supportive interstitial instead of
  the result.
- **Klid (Calm):** the breath circle and the player of activities. "Dech 4-7-8" has timed phases
  and no audio; the audio activities are ready. "Dech naslepo" guides with vibrations while the
  phone stays in the pocket.
- **Přehledy (Overviews):** the week or the month as dots; each cell has a label for the screen
  reader. Also the wellbeing index, insights ("Co se ukazuje": descriptive patterns), the weekly
  reflection and the deeper screenings.
- **Nastavení (Settings), a modal from Dnes and Přehledy:** the profile (name, age) and the
  reminders. The reminders are local notifications, off by default; on Android a channel with
  private lock-screen text. Also the switch "Sdílet data pro výzkum" (off by default), haptics,
  custom tags, backup (JSON export and import) and "about". The appearance follows the system.
- **Pomoc (Help):** crisis lines with `tel:` links (the primary one by age), and 155 and 112 as
  buttons. The contacts come from 1 source (`src/features/help/lines.ts`, with 116 006). Also an
  editable crisis plan with a wallet card as PDF, quick calm, and the mode "Podej telefon" for a
  third person. The guide "Co dělat, když…" appears when it has content (`guides.ts`).

The bottom navigation is a native tab bar: **Dnes, Klid, Přehledy, Pomoc** (the system tab bar on
iOS, the navigation bar on Android). The check-in is an action from Dnes. Each tab has its own
stack with a native header. The modal tasks (check-in, questionnaire, player, handover, settings,
crisis help) close with the standard "Zrušit" or "Zavřít", and unsaved content asks first.

### The screen states follow the data

The prototype switched the variants of a screen by hand. In the app, real data selects them:

| Designed variant               | When it appears                                                                            |
| ------------------------------ | ------------------------------------------------------------------------------------------ |
| Dnes, first day                | No WHO-5 measurement: a call to the first questionnaire instead of the percentage          |
| Check-in, disabled button      | No state selected (step 1), or no word selected (step 2)                                   |
| Přehledy, empty week           | 0 or 1 entry in the current week: encouragement without guilt                              |
| Přehledy, WHO-5 under 50 %     | The last score is under 50: an empathetic sentence and a quiet button to Pomoc             |
| Dnes, summary of the entry     | An entry of today exists                                                                   |
| Questionnaire, disclaimer      | The first start of PHQ-9 or GAD-7: a screening tool, not a diagnosis                       |
| PHQ-9, supportive interstitial | The answer to question 9 (thoughts of death) is above 0: the actions above the fold        |
| Insights, too few data         | Fewer than 3 entries, or a pattern under the threshold: encouragement instead of a finding |
| Reflection, visibility window  | The card "Ohlédnutí za týdnem" from Sunday 17:00 to Monday                                 |
| Crisis card, empty plan        | A print without a plan: a call to fill it in, not an empty PDF                             |

## Key decisions (from the prototype handoff)

- **The app remaps the state colours.** The design-system mapping (clay for Napětí, lake for Útlum)
  copies the visual signature of the Mood Meter, so the app swaps them: Napětí gets lake, Útlum
  gets clay. Each state also has its own shape (circle, diamond, square, half circle).
  Information never comes from colour alone.
- **Gender neutrality.** The emotional states are nouns, and the prompts are questions for both
  genders ("Začneme?"). The design-system components MoodPicker and BreathCircle have gendered
  texts, so own versions replace them.
- **An accessible disabled state.** The main call to action in the disabled state is an outline
  with ink text on a sunken surface. The contrast is at least 4.5:1; the opacity stays at 100 %.
  A hint under the button says what the user must do first.
- **Primary buttons are full ink.** Gold is a soft fill or a ring only (a design-system rule: a
  gold fill does not pass the contrast). The crisis colour is clay, never alarm red.
- **No gamification, no guilt mechanics, no comparison with other people.** The app interprets
  the wellbeing against the own average only.

## Accessibility

The target is WCAG 2.2 level AA. The European Accessibility Act applies through the harmonised
standard EN 301 549, which points to WCAG 2.1 AA; the project target covers it.

- **Platform user interface.** iOS follows the HIG: a native navigation bar with a large title,
  the system tab bar, SF Symbols and action sheets. Android follows the Android design guidelines
  and Material 3: the top app bar, the navigation bar, Material Symbols, ripple and dialogs. The
  appearance follows the system in both schemes; there is no in-app switch.
- **Contrast.** Every colour pair in `src/theme/contrastPairs.ts` passes WCAG 2.2 AA in both
  schemes (text 4.5:1, non-text 3:1); `test/contrast.test.ts` checks it. Information never comes
  from colour alone (the shape of a state, a check mark on a selection, text on a status).
- **Type.** All text goes through `ds/Text`. The variants map to the iOS text styles (Dynamic
  Type) and to the Material type scale. Bricolage Grotesque is for titles only; the body text
  uses the system font. Scale limits exist only where the layout needs them (buttons 2x, chips
  1.6x, badges 1.5x).
- **Touch targets** are at least 44 pt on iOS and 48 dp on Android; list rows are 56 dp on
  Android. The audit measures the explicit sizes in the tree (`test/a11y/audit.ts`, rule 7).
- **Screen readers.** Titles have the role `header`. A state lives in `accessibilityState` and
  `accessibilityValue`, not in the label text. `announce()` from `src/lib/a11y.ts` reports a
  change of content (a breath phase, a countdown, the next question, a save, the result of a
  backup). Every gesture has a button or an `accessibilityActions` alternative (the deletion of
  a tag, the end of "Dech naslepo").
- **Hints.** An `accessibilityHint` appears only where the result of the action does not follow
  from the label. The rule `react-native-a11y/has-accessibility-hint` is off on purpose.
- **Unsaved work.** The close of a check-in, a questionnaire or a plan edit asks first
  (`src/lib/useDiscardGuard.ts`); a step back inside the task does not.
- **Haptics** are an addition, never the only channel, and Nastavení can turn them off.
- **Motion.** The breath circle respects the system reduction of motion
  (`reduceMotionChanged`).

The gates:

- `eslint-plugin-react-native-a11y` in ESLint;
- `test/contrast.test.ts` for every colour pair;
- the screen audit over every route and state (`test/a11y/screens.test.tsx`, Android preset);
- the contract test of the design system (`test/a11y/ds.test.tsx`);
- axe-core over the design system on the web (`test/a11y/ds.web.test.tsx`).

[`docs/device-verification.md`](docs/device-verification.md) is the checklist for a device:
TalkBack, VoiceOver, 200 % text, the dark scheme, gestures, and the dates and plurals in cs and en.

## Internationalisation

Every text that the user sees comes from the message catalogs in
`src/i18n/locales/<locale>/<namespace>.json`. Czech (`cs`) is the source locale; the English
catalog (`en`) is complete. The language follows the device (`expo-localization`); the fallback is
Czech. The 12 namespaces are `common`, `navigation`, `content`, `onboarding`, `home`, `checkin`,
`calm`, `measure`, `stats`, `help`, `settings` and `m1`. The `content` namespace holds the text for
data that the code finds by an id: moods, words, tags, help lines, activities, instruments and
bands.

- The code calls `t("namespace:key")` from `src/i18n` or `contentText()` from
  `src/i18n/content.ts`. The Czech catalog types the keys: a wrong key is a type error.
- The database stores ids for words and tags (`src/db/vocab.ts`). A data migration
  (`src/db/dataMigrations.ts`) moved the older Czech labels to ids once, and a backup in format 1
  still imports.
- Dates, times, numbers, percentages and lists come from the `Intl` API with the active locale
  (`src/i18n/format.ts`). Plural forms use the i18next suffixes.
- The tests run in Czech and assert the Czech text. `test/i18n.test.ts` checks the English
  rendering and that every data id has its text.
- The gates: `i18next/no-literal-string` in ESLint, `npm run i18n:check` and
  `npm run check:english`. The catalog check runs the i18next-cli extraction without changes and
  compares the catalogs with `scripts/check-i18n.mjs`.

[`CONTRIBUTING.md`](CONTRIBUTING.md), section "Add or change a text that the user sees", has the
steps.

## Privacy

The entries stay in the phone only, in a SQLite database that SQLCipher encrypts. Emotional
entries are a special category under article 9 of the GDPR. The Keychain or the Keystore
(`expo-secure-store`) holds the key, and the key never leaves the device. There is no backend and
no telemetry. The switch "Data pro výzkum" is opt-in, off by default, and sends nothing yet: it is
the prepared user interface for a future anonymous export. The backup in Nastavení exports an
unencrypted JSON file; the user keeps it safe, and the backup card says so.

## Adaptation to Expo and React Native

- The design tokens live in `design/tokens/*.json` (Style Dictionary, `cd design && npm run build`)
  and generate `src/theme/tokens.generated.ts`; CI checks that the generated file matches.
  `src/theme/` builds the light and the dark scheme on top (`ThemeProvider`, `useTheme`,
  `createThemedStyles`), the platform constants (touch targets 44 and 48, margins 20 and 16) and
  the contrast manifest.
- Text: 1 component `ds/Text` with variants (largeTitle to caption2, label, kicker) that map to
  the iOS text styles (`dynamicTypeRamp`) and the Material type scale. Bricolage Grotesque 600 and
  700 serve the titles only; the body text uses the system font (SF Pro or Roboto). The lint
  forbids the React Native `Text` in screens.
- Icons: `ds/Icon` draws SF Symbols on iOS and Material Symbols on Android (`expo-symbols`), and
  Lucide on the web, from 1 map of names.
- Navigation: a native stack (`expo-router`) with platform headers (large titles, a system back
  button without text, bar items through `src/components/HeaderItems.tsx`) and native tabs
  (`expo-router/unstable-native-tabs`). The navigator handles the top and the bottom insets, and
  `Screen` uses `contentInsetAdjustmentBehavior`.
- Press feedback by platform (`src/ds/press.ts`): ripple on Android, opacity on iOS. Dialogs and
  action sheets by platform (`src/lib/dialogs.ts`).
- The breath circle animates with the `Animated` API and respects the system reduction of motion;
  haptics and the screen reader announce the phases.
- `react-native-svg` draws the state shapes and the wellbeing ring. The intensity slider is
  `@react-native-community/slider`. The segmented control is native on iOS
  (`@react-native-segmented-control`) and Material segmented buttons on Android.
- `Linking.openURL` opens the `tel:` links; a button with `href` has the role `link`.
- The app icon and the splash come from `assets/lumi-mark.svg` (`assets/icon.png`,
  `adaptive-icon.png`, `splash-icon.png`, `favicon.png`).

## What is not done yet

- **The audio files** of the calm activities ("Tichá louka", "Večerka"). The player is ready;
  items without a file show the badge "připravujeme". After the delivery, set `file` in
  `src/features/calm/content.ts` (see `assets/audio/`).
- **iOS State of Mind** (moods in Apple Zdraví). The library does not support it yet, so it sits
  behind a feature flag; [`docs/state-of-mind.md`](docs/state-of-mind.md) documents it.
- **The guide "Co dělat, když…"** and the chat of Linka bezpečí wait for content
  (`src/features/help/guides.ts`); Pomoc does not show them until then.
- **The wording of the questionnaires.** WHO-5, PHQ-9 and GAD-7 need a check against the
  validated Czech versions (`_meta.todo` in the `content` catalog). The verification of the lines
  needs a sign-off ([`docs/cz-crisis-data-checklist.md`](docs/cz-crisis-data-checklist.md):
  116 111, 116 123, 116 006, 606 021 021). The real logo is still open.
- **The native checks on a development build.** They cover the database encryption on disk,
  haptics, notifications, keep-awake in "Dech naslepo" and the PDF print. Then the full pass of
  [`docs/device-verification.md`](docs/device-verification.md): TalkBack and VoiceOver, 200 %
  text, the dark scheme, gestures and Liquid Glass on iOS 26.
- **A code licence.** The repository has no licence file; the owner decides it.

## Structure

```text
app.json           Expo configuration (icons, splash, plugins, web manifest)
app/               expo-router routes: _layout, (tabs)/(home|calm|stats|help), onboarding,
                   checkin, measure/[type], calm/[id], handover, settings, crisis, +not-found
design/            design tokens (Style Dictionary), generate src/theme/tokens.generated.ts
drizzle/           generated SQL migrations and the journal
assets/            the logo, the generated icons, audio/ (the manifest of the exercises)
docs/              STATUS, ADRs, writing rules, glossary, pilot build, device verification
core/, server/     Rust workspaces: the vault, the store, the FFI, the crisis recommender, the
                   sync server stub (see docs/STATUS.md)
modules/           the Expo module of the Rust vault (off in Android builds)
src/
  i18n/            i18next setup, typed keys, formats, locales/{cs,en}/<namespace>.json
  theme/           generated tokens, the light and the dark scheme, the contrast manifest
  model.ts         domain types, the vocabulary, aggregation, recommendations, WHO-5 texts
  store.tsx        the profile and the preferences (memory and the settings table)
  ds/              design-system components (Text, Button, Card, Chip, Input, Switch, Icon,
                   SegmentedControl, RadioRow, ListItem, ProgressRing, Badge, IconButton)
  components/      shared elements (Screen, Header, HeaderItems, MoodShape, Breath, navigation)
  db/              SQLite, SQLCipher and Drizzle: schema, connect, repo, hooks, provider, vocab,
                   dataMigrations, backup
  features/        feature-first screens and logic: checkin, calm, measure, stats, help,
                   onboarding, home, settings, m1
  lib/             a11y, dialogs, haptics, motion, useDiscardGuard, featureFlags
test/              Jest: jest-expo (the Android preset) with @testing-library/react-native and
                   expo-router/testing-library; a11y/ (the audit, the screen test, the web axe
                   test); helpers/testDb (better-sqlite3 in memory); mocks/ (native tabs)
scripts/           the gate scripts (Vale, commit bodies, catalogs, English source, agents)
```
