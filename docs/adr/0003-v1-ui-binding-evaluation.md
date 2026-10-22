# ADR 0003 — v1 UI + Rust-binding choice (§2.4a re-evaluation after the ubrn NO-GO)

> **Note (2026-10-18):** Rewritten in Simplified Technical English on 2026-10-18; decisions and section numbering unchanged.

- **Status:** **Decided + empirically validated.** Anna picked the recommended lead (**RN**: keep
  React Native and reuse the accessible UI). The binding mechanism then changed from hand-written
  JSI to **Nitro** (create-react-native-library 0.49 dropped its C++ TurboModule template). It is
  the same RN stack, so the accessibility / UI-preservation reasons below are unchanged. The gate
  spike #1b **passed (GO, 2026-06-14)** on real arm64 hardware → see the validation note directly
  below. (Original status: Evaluation — waits for Anna's pick. Analysis only; it refines ADR 0001
  §2.4a for the **v1 = mobile-only** decision that the spike #1 NO-GO reopened,
  `spikes/rn-ffi/SPIKE-REPORT.md`.)
- **Date:** 2026-06-13 (evaluation) · 2026-06-14 (binding validated)
- **Method:** 8-agent web research → 5 priority-weighted criterion-judges → adversarial skeptic +
  completeness critic (workflow `lumi-2-4a-ui-binding-eval`). Each repo fact has a `file:line`
  citation.

## Validation — spike #1b GO (2026-06-14)

The gate spike of the recommended lead has **passed**. This validates the v1 binding choice
empirically. **Full report + evidence: `spikes/rn-nitro/SPIKE-REPORT.md`.** Summary:

- **Validated stack:** React Native (New Arch) → **Nitro Modules** → C++ HybridObject
  (`HybridLumiCrypto`) → **Rust C ABI** (`lumi-ffi-cabi`). A live JS→Rust→JS round-trip
  (`sealCheckin → openCheckin`, plus the path that throws) ran on a **real arm64 device** (Pixel 8a,
  GrapheneOS) on the New Architecture. The result was
  `LUMI_SPIKE_RESULT {"pass":true,"roundtrip":true,"threw":true}`. Logcat confirmed
  `Successfully registered HybridObject "LumiCrypto"` + `fabric:true`.
- **§1 holds** at runtime: JS held only the opaque `handle`, and the X25519 private key never left
  Rust's `SECRETS` registry. It also holds statically: no secret/private type appears in any
  signature.
- **Mechanism change, not stack change:** the bus-factor-1 _hand-written JSI glue_ risk that this
  ADR flagged is **retired**. Nitrogen statically generates the JSI marshal code; we own only the
  C++ method bodies over the Rust C ABI. The C ABI (cbindgen) re-write noted in the `RN-handjsi`
  trade-offs still applies. It stays compatible with UniFFI for the deferred desktop/watch targets.
- **Honest scope:** GO rests on the **live arm64-device** leg plus a **clean `x86_64` build** (the
  `x86_64`-emulator _runtime_ leg was optional and did not run). The spike text below also names a
  **4-ABI** Android build+run. We narrowed that scope **by design** (RUNBOOK Step 7 restricts
  `reactNativeArchitectures` to `arm64-v8a,x86_64`) to the **2 ABIs** we ship-test: `arm64-v8a`
  (built + run) and `x86_64` (built only). `armeabi-v7a` and `x86` were out of scope. The spike
  reached GO through the **debug dev-loop**. `assembleRelease` compiled the native code clean for
  both ABIs but failed at the Java dex-merge. That is a create-react-native-library package issue,
  **deferred** as production hygiene, not a binding blocker. **iOS remains deferred**, as ADR 0001
  records (no Mac). So the iOS-xcframework-link clause of the spike text below counts as satisfied
  by deferral, not by execution. It stays an open risk for the iOS milestone. (Net: the binding
  _mechanism_ has validation on real arm64 hardware. The iOS and full 4-ABI clauses rest on the
  narrowed scope, not on execution as literally written.)

_The analysis, scoreboard, trade-offs, and recommendation below are unchanged. They stay as the
record of how the decision came about._

## Established facts carried forward (not re-litigated)

- **ubrn (uniffi-bindgen-react-native) is OUT for v1** (spike #1). Its RN turbo-module build and
  package steps failed. The causes: an EOL cargo-ndk pin; an Android build that fails permanently,
  in the maintainer's own words; an iOS static-lib link failure.
- The Rust core **cross-compiles** cleanly to aarch64-Android (NDK) + iOS (device/sim). The **§1
  secret-isolation design holds** (handles/plaintext only across the FFI).
- **Honest correction to "the boundary is proven":** cross-compile + §1 are proven. A **live
  JS↔Rust↔JS round-trip has _never_ run on real hardware on _any_ path**. (The spike ran on headless
  Linux, with no Xcode/NDK/emulator.) So no option below has a demonstrated live boundary, and the
  iOS-link risk has no characterisation. It is not "ubrn-specific."

## The 3 options (ubrn out ≠ React Native out)

1. **`RN-handjsi`**: keep RN. Reuse the current ~6,200–6,700 LOC accessible UI. Bind the core with
   a **hand-written JSI/C++ TurboModule over the Rust C ABI** (cbindgen, no ubrn). _New option, not
   in the decision record before._
2. **`CMP-uniffi`**: Compose Multiplatform UI + UniFFI **Kotlin** bindings (Firefox-proven; the
   binding that the core **already locks** in ADR 0001 §1).
3. **`Flutter-frb`**: Flutter UI + `flutter_rust_bridge`.

## Scoreboard (weighted) — and why the headline misleads

```text
CMP-uniffi 32.2(w)   RN-handjsi 30.6(w)   Flutter-frb 24.3(w)
```

**This flat-weighted lead inverts under the brief's own priority order.** Per criterion:

| Criterion (priority, weight)                   | `RN-handjsi` | `CMP-uniffi` | `Flutter-frb` | Winner  |
| ---------------------------------------------- | ------------ | ------------ | ------------- | ------- |
| **1. Accessibility** (non-negotiable, ×1.4)    | **9**        | 6            | 4             | **RN**  |
| 2. Android binding reliability (×1.2)          | 3            | **8**        | 6             | **CMP** |
| **3. UI-preservation / rework** (×1.0)         | **9**        | 2            | 2             | **RN**  |
| 4. Solo maintenance + GrapheneOS/no-GMS (×1.0) | 4            | **8**        | 6             | **CMP** |
| 5. Skill demand (×0.7)                         | 2            | **6**        | 5             | **CMP** |

CMP wins the headline only because it scores higher on the 3 **lower-priority** criteria. It
**loses the 2 highest-priority** ones (a11y, UI-preservation). If you treat a11y as the declared
near-gate, the **priority-ordered lead is `RN-handjsi`**. This independently matches the
already-ratified ADR 0001 (v1 = keep RN, mobile-only; CMP/E-hybrid is the _deferred_ desktop+watch
analysis). **CMP is the right binding for the wrong milestone.**

## Option tradeoffs (honest)

### 1. `RN-handjsi` — _recommended lead for v1_

- **Wins accessibility (the #1 criterion, which carries the legal and ethical weight):** RN renders
  **real native views**. So the current **~120 a11y annotations across ~25 files** and
  `eslint-plugin-react-native-a11y` carry over with **no re-audit**. The same holds for the
  colour+shape mood encoding (`MoodShape.tsx`) and the **reduce-motion gate** (`Breath.tsx:43`,
  which works on _both_ platforms today). For a calm/anxiety app for vulnerable users, this is the
  decisive win.
- **Wins UI-preservation:** ~100% of the UI + bespoke DS + ~1,650 LOC tests carry over (the test
  seam is already a JS mock at `connectDb`). This is a **binding swap, not a UI rewrite**.
- **Weakest on binding reliability (the real cost):** the solo dev **owns** the hand-written
  C++/JSI glue and the multi-ABI NDK/CMake setup. The solo dev also owns the **iOS xcframework link
  that just failed**. That is bus-factor-1, on RN's **"experimental"** C++ TurboModule path. The C ABI itself (cbindgen)
  is easy. The multi-ABI gradle/CMake + iOS link orchestration is the hard, self-owned part. _Not a
  free win._
- **Couples to a re-authored core FFI:** with RN, the core exposes a `#[no_mangle] extern "C"`
  surface (cbindgen). This **diverges from the ADR-locked UniFFI distribution** that also serves
  the deferred desktop/watch targets. (Mitigation: the core can expose _both_ a C ABI for RN now
  and keep UniFFI for later.)
- **Must-fix-regardless RN a11y items** (bounded, not binding work):
  - `accessibilityLiveRegion` is a no-op on iOS → breath/countdown cues need
    `AccessibilityInfo.announceForAccessibility()` (`PlayerScreen.tsx:198/205`,
    `BlindBreathScreen.tsx:193`).
  - `MoodShape` has no label on `HomeScreen`.
  - `Button.tsx:142` `opacity:0.45` violates the locked outline+ink rule.

### 2. `CMP-uniffi` — _strongest binding; the post-v1 / desktop path_

- **Wins binding reliability + maintainability + skill:** UniFFI-Kotlin is **Mozilla first-party,
  Firefox-proven at hundreds-of-millions scale**. It is **the core's already-locked Android
  distribution binding**. Through `gobley` the multi-ABI build is upstream-owned (the orchestration
  that sank ubrn). Kotlin/Compose is a _mild_ jump from React's hook model.
- **But it loses the top criterion (iOS a11y) and discards the asset:** CMP-on-iOS is
  **Skia-rendered**. Its a11y improved markedly (CMP 1.8.x maps to native UIAccessibility), but it
  is **younger, and some semantic kinds are absent**. ADR §2.5 and JetBrains' own guidance say that
  a11y-critical screens need **native SwiftUI**. For Lumi these are the crisis interstitial,
  MoodPicker, check-in and questionnaires: _most of the app_. That is a **partial second rewrite**.
  Add the full discard of the ~6,200 LOC UI + tests and a **per-release a11y re-verification tax**
  on a synthesized iOS tree.
- The **iOS static-lib link risk does not vanish**. It relocates to Kotlin/Native + Skiko on
  **pre-1.0 `gobley`** (plus an open Mozilla JNA Android-crash investigation).

### 3. `Flutter-frb` — _last for this app_

- frb is mature, but Flutter uses a **synthesized a11y tree on both platforms** (documented
  VoiceOver/TalkBack focus/announce bugs). Also, **almost a deal-breaker for a calm app**:
  `MediaQuery.disableAnimations` **does not reflect iOS Reduce Motion** (flutter/flutter #65874).
  That is exactly the mechanism `Breath.tsx` depends on (WCAG 2.3.3 vestibular safety). Add a full
  Dart rewrite + a **second** binding next to the core's UniFFI.

### (Acknowledged upper bound) A-native — SwiftUI iOS + Compose Android

This is the principled fallback that the ADR names. It is absent from the 3-way frame. It is the
**only** option that beats RN on **both** a11y (native tree on _both_ platforms) and security, with
**no** synthesized-tree risk. The cost is **2 UI codebases**. It deserves a mention if the absolute
a11y bar outweighs rework + the RN binding risk.

## Recommendation

**Lead: `RN-handjsi` for v1 — conditional on a hard go/no-go spike on real hardware.** It wins the
priority-ordered criteria (a11y + UI-preservation). It preserves the verified accessible asset and
the native a11y tree. It matches the ratified v1=keep-RN decision, and it keeps §1 intact. Its
honest cost is the **self-owned, bus-factor-1 hand-written binding** on RN's experimental C++ path.
That is the one place where it is clearly weakest.

**That binding risk and the live round-trip that never ran are the real unknowns. Thus the choice
has this gate:**

> **Spike #1b (hard GO/NO-GO, on a real macOS+Xcode / Android Studio+NDK machine):**
> a hand-written JSI/C++ TurboModule over the Rust C ABI achieving **one live
> JS↔Rust↔JS round-trip** with **(a)** the **iOS xcframework link** working (the exact
> step that failed), **(b)** a **4-ABI Android** build+run, **(c)** §1 intact (no key
> bytes in the JS heap). If it fails/flakes → **fall back to CMP-uniffi** (most reliable
> binding, the core's locked path; accept the iOS-a11y regression + UI rewrite), or to
> **A-native** if the absolute a11y bar dominates. Flutter-frb only if both are rejected.

**Fallback order if the `RN-handjsi` spike fails:** `CMP-uniffi` → A-native → `Flutter-frb`.

## Cross-option notes (apply to every option)

- **The app that ships today currently _violates_ §1** (`src/db/connect.ts:23` interpolates the
  raw hex DB key into `PRAGMA key` from JS). To move crypto into the core is identical work under
  all options. It is not a differentiator, but it must happen.
- **Accessibility is likely _microenterprise-exempt_** (solo free wellbeing service, <10 persons &
  ≤€2M, EAA / Czech Act 424/2023) → an **ethical**, not hard-legal, bar here. The exemption is
  fragile (it vanishes on growth or funds, with no grace period), so **build to AA regardless**.
  This favours the option that already meets it (RN).
- **GrapheneOS/no-GMS is ~neutral across options** (all ship a GMS-free `.so`; the repo is already
  FCM/GMS-free). The real existential distribution risk is **Google's developer-registration decree
  (~Sept 2026)**. It threatens manual APK installs and F-Droid **equally** for all stacks. The
  mitigation is a signed-APK / Accrescent / GrapheneOS-repo channel plan, not a binder property. So
  do not let no-GMS tie-break the binder.
- **Post-v1 lever:** UniFFI is the one binding that serves the deferred Swift (iOS/macOS/watchOS) +
  Kotlin (Android/wearOS) targets. **Hand-JSI is RN-mobile-only** and produces nothing reusable for
  desktop/watch. CMP/Flutter reuse their binding toward desktop.
- **Test reuse caveat (RN):** the RTL suite carries over only if the JSI binding preserves the
  `connectDb` JS contract. If the real core is **async** (likely: Argon2id unlock, CRDT/sync), call
  sites and assertions need a reshape. Async marshal over hand-JSI is the under-documented hard
  part.

## Decision for Anna

Pick the v1 path; I then prompt the chosen one. My recommendation:
**`RN-handjsi`, gated by spike #1b on real hardware**, with **`CMP-uniffi`** as the named fallback
(and the post-v1 desktop/watch binding regardless). Either way, **the mandatory next action is identical: reach one live
round-trip on a real mobile dev machine before you commit**. No option has a demonstrated live
boundary today.
