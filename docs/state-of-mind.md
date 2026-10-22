# iOS State of Mind — findings and plan (experiment)

<!-- cspell:locale en,cs -->

Status as of 2026-06-13. Intent: when the user saves a check-in, the app can write a State of Mind
record to Apple Health. The feature is opt-in. It only writes, it never reads, and it exists only on
iOS. See phase 5 of the assignment.

## Decision: do not build it yet

The assignment says:

> „pokud knihovna State of Mind nepodporuje nebo je integrace křehká, neimplementuj“

In English: if the library does not support State of Mind, or if the integration is fragile, do not
build it. Exactly this case occurred. Only the feature flag `STATE_OF_MIND_ENABLED` stays in the
code (`src/lib/featureFlags.ts`, default `false`).

## Findings

1. **`@kingstinct/react-native-healthkit`** (last release 2026-06-05, v9.x, Nitro Modules): the
   documentation and the public API **contain no support for State of Mind**. There is no
   `saveStateOfMindSample`, no `HKStateOfMind`, no valence API and no mood API. The library covers
   the quantity, category, workout and correlation types. Source: the README of the repository and
   the reference at [`kingstinct.com/react-native-healthkit`](https://kingstinct.com/react-native-healthkit/).
2. **Apple API**: `HKStateOfMind` exists since iOS 18 (WWDC24). The assignment says iOS 17+, but
   iOS 18 is the real minimum. A write needs the HealthKit entitlement,
   `NSHealthUpdateUsageDescription` and an explicit per-type authorization from the user.
3. **Expo**: the library works only in a development build (not in Expo Go), with the config plugin
   `@kingstinct/react-native-healthkit`. The plugin sets the entitlements and the `Info.plist` keys.
   This fits us: we already use a dev build because of SQLCipher.
4. In this environment, an iOS build cannot even start. Thus the integration would be blind work.
   That is exactly the "fragility" against which the assignment warns.

## The mapping (when it becomes possible)

| Lumi             | HKStateOfMind                                     |
| ---------------- | ------------------------------------------------- |
| quadrant Energie | positive valence (pleasant), high arousal         |
| quadrant Klid    | positive valence (pleasant), low arousal          |
| quadrant Napětí  | negative valence (unpleasant), high arousal       |
| quadrant Útlum   | negative valence (unpleasant), low arousal        |
| intensity 1–5    | magnitude of the valence, scaled to 0.2–1.0       |
| words            | the nearest `HKStateOfMind.Label` equivalent      |
| record type      | `momentaryEmotion` (a check-in is "here and now") |

Note: `HKStateOfMind` has a valence from −1 to +1. We map the sign from the quadrant and the
magnitude from the intensity. The app writes **only** when the toggle is on (default off), with a
helper text that the data goes to Apple Health under its rules. Android and web do not show the
option at all.

## Options from here

1. **Watch `@kingstinct/react-native-healthkit`.** The Nitro architecture makes new types simpler
   to add. When State of Mind arrives, the integration is about 1 day of work: a toggle in Přehledy,
   and a write in `save()` of `Step2Screen` behind the flag and `Platform.OS === "ios"`.
2. **Own Expo Module** (Swift, about 150 lines): full control, but then we maintain the HealthKit
   code ourselves. This option makes sense only if option 1 stays out of reach for a long time.
3. **Other libraries**: `react-native-health` also has no State of Mind, and the project has less
   maintenance. Do not follow it.

## Checklist before you turn the flag on

- [ ] The library has `saveStateOfMindSample` (or an equivalent).
- [ ] A dev build runs on a real iPhone with iOS 18+.
- [ ] The toggle `Zapisovat nálady do Zdraví (iOS)` is in Přehledy, default off, with the helper
      text about Apple Health.
- [ ] The app writes only when the user saves a check-in; write only, no read.
- [ ] Android and web: the option does not appear.
- [ ] Tests: the mapping quadrant → valence and intensity → magnitude.
