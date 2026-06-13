# ADR 0003 — v1 UI + Rust-binding choice (§2.4a re-evaluation after the ubrn NO-GO)

- **Status:** **Evaluation — awaiting Anna's pick.** Analysis only; nothing built;
  `apps/` stays empty. Refines ADR 0001 §2.4a for the **v1 = mobile-only** reopening
  triggered by the spike #1 NO-GO (`spikes/rn-ffi/SPIKE-REPORT.md`).
- **Date:** 2026-06-13
- **Method:** 8-agent web research → 5 priority-weighted criterion-judges → adversarial
  skeptic + completeness critic (workflow `lumi-2-4a-ui-binding-eval`). Repo facts
  verified at file:line.

## Established facts carried forward (not re-litigated)

- **ubrn (uniffi-bindgen-react-native) is OUT for v1** (spike #1). Its RN turbo-module
  build/packaging failed (EOL cargo-ndk pin; maintainer-"perma-failing" Android build;
  iOS static-lib link failure).
- The Rust core **cross-compiles** cleanly to aarch64-Android (NDK) + iOS (device/sim),
  and the **§1 secret-isolation design holds** (handles/plaintext only across the FFI).
- **Honest correction to "the boundary is proven":** cross-compile + §1 are proven; a
  **live JS↔Rust↔JS round-trip has *never* run on real hardware on *any* path** (the
  spike ran headless-Linux, no Xcode/NDK/emulator). So the live boundary is
  **un-demonstrated on every option below**, and the iOS-link risk is *uncharacterised*,
  not "ubrn-specific."

## The three options (killing ubrn ≠ killing React Native)

1. **RN-handjsi** — keep RN; reuse the existing ~6,200–6,700 LOC accessible UI; bind the
   core with a **hand-written JSI/C++ TurboModule over the Rust C ABI** (cbindgen, no
   ubrn). *New option, not previously in the decision record.*
2. **CMP-uniffi** — Compose Multiplatform UI + UniFFI **Kotlin** bindings (Firefox-proven;
   the binding the core **already locks** in ADR 0001 §1).
3. **Flutter-frb** — Flutter UI + flutter_rust_bridge.

## Scoreboard (weighted) — and why the headline is misleading

```
CMP-uniffi 32.2(w)   RN-handjsi 30.6(w)   Flutter-frb 24.3(w)
```

**This flat-weighted lead inverts under the brief's own priority order.** Per-criterion:

| Criterion (priority, weight) | RN-handjsi | CMP-uniffi | Flutter-frb | Winner |
|---|---|---|---|---|
| **1. Accessibility** (non-negotiable, ×1.4) | **9** | 6 | 4 | **RN** |
| 2. Android binding reliability (×1.2) | 3 | **8** | 6 | **CMP** |
| **3. UI-preservation / rework** (×1.0) | **9** | 2 | 2 | **RN** |
| 4. Solo-maint + GrapheneOS/no-GMS (×1.0) | 4 | **8** | 6 | **CMP** |
| 5. Skill demand (×0.7) | 2 | **6** | 5 | **CMP** |

CMP wins the headline only by out-scoring on the **lower-priority** three while **losing
the two highest-priority** (a11y, UI-preservation). Treating a11y as the declared
near-gate, the **priority-ordered lead is RN-handjsi** — which independently matches the
already-ratified ADR 0001 (v1 = keep RN, mobile-only; CMP/E-hybrid is the *deferred*
desktop+watch analysis). **CMP is the right binding for the wrong milestone.**

## Option tradeoffs (honest)

### 1. RN-handjsi — *recommended lead for v1*
- **Wins accessibility (the #1, legally/ethically load-bearing criterion):** renders
  **real native views**, so the existing **~120 a11y annotations across ~25 files**,
  `eslint-plugin-react-native-a11y`, the colour+shape mood encoding (`MoodShape.tsx`),
  and **reduce-motion gating** (`Breath.tsx:43`, works on *both* platforms today) all
  carry over with **no re-audit**. For a calm/anxiety app for vulnerable users, this is
  the decisive win.
- **Wins UI-preservation:** ~100% of the UI + bespoke DS + ~1,650 LOC tests reused (the
  test seam is already a JS mock at `connectDb`); a **binding swap, not a UI rewrite**.
- **Weakest on binding reliability (the real cost):** the solo dev **owns** the
  hand-written C++/JSI glue + multi-ABI NDK/CMake + the **iOS xcframework linking that
  just failed** — bus-factor-1, on RN's **"experimental"** C++ TurboModule path. The C
  ABI itself (cbindgen) is easy; the multi-ABI gradle/CMake + iOS link orchestration is
  the hard, self-owned part. *Not a free win.*
- **Couples to a re-authored core FFI:** picking RN means the core exposes a
  `#[no_mangle] extern "C"` surface (cbindgen), **diverging from the ADR-locked UniFFI
  distribution** that also serves the deferred desktop/watch targets. (Mitigable: the
  core can expose *both* a C ABI for RN now and keep UniFFI for later.)
- **Must-fix-regardless RN a11y items** (bounded, not binding work): `accessibilityLiveRegion`
  is iOS-noop → breath/countdown cues need `AccessibilityInfo.announceForAccessibility()`
  (`PlayerScreen.tsx:198/205`, `BlindBreathScreen.tsx:193`); `MoodShape` unlabeled on
  `HomeScreen`; `Button.tsx:142` `opacity:0.45` violates the locked outline+ink rule.

### 2. CMP-uniffi — *strongest binding; the post-v1 / desktop path*
- **Wins binding reliability + maintainability + skill:** UniFFI-Kotlin is **Mozilla
  first-party, Firefox-proven at hundreds-of-millions scale**, and is **the core's
  already-locked Android distribution binding**; via Gobley the multi-ABI build is
  upstream-owned (the orchestration that sank ubrn). Kotlin/Compose is a *mild* jump from
  React's hook model.
- **But it loses the top criterion (iOS a11y) and discards the asset:** CMP-on-iOS is
  **Skia-rendered**; a11y improved markedly (CMP 1.8.x maps to native UIAccessibility) but
  is **younger, missing semantic kinds**, and — per ADR §2.5/JetBrains' own guidance —
  the a11y-critical screens (crisis interstitial, MoodPicker, check-in, questionnaires =
  *most of the app*) realistically need **native SwiftUI**, i.e. a **partial second
  rewrite**. Full discard of the ~6,200 LOC UI + tests + a **per-release a11y
  re-verification tax** on a synthesized iOS tree.
- The **iOS static-lib link risk does not vanish** — it relocates to Kotlin/Native +
  Skiko on **pre-1.0 Gobley** (plus an open Mozilla JNA Android-crash investigation).

### 3. Flutter-frb — *last for this app*
- frb is mature, but Flutter uses a **synthesized a11y tree on both platforms** (documented
  VoiceOver/TalkBack focus/announce bugs), and — **near-dealbreaker for a calm app** —
  `MediaQuery.disableAnimations` **does not reflect iOS Reduce Motion** (flutter/flutter
  #65874), exactly the mechanism `Breath.tsx` depends on (WCAG 2.3.3 vestibular safety).
  Full Dart rewrite + a **second** binding alongside the core's UniFFI.

### (Acknowledged upper bound) A-native — SwiftUI iOS + Compose Android
The ADR-named principled fallback, omitted from the 3-way frame: the **only** option that
beats RN on **both** a11y (native tree on *both* platforms) and security, with **no**
synthesized-tree risk — at the cost of **two UI codebases**. Worth naming if the absolute
a11y bar outweighs rework + the RN binding risk.

## Recommendation

**Lead: RN-handjsi for v1 — conditional on a hard go/no-go spike on real hardware.**
It wins the priority-ordered criteria (a11y + UI-preservation), preserves the verified
accessible asset and native a11y tree, matches the ratified v1=keep-RN decision, and
keeps §1 intact. Its honest cost is the **self-owned, bus-factor-1 hand-written binding**
on RN's experimental C++ path — the one place it is clearly weakest.

**Because that binding risk + the never-run live round-trip are the real unknowns, the
choice is gated on:**

> **Spike #1b (hard GO/NO-GO, on a real macOS+Xcode / Android Studio+NDK machine):**
> a hand-written JSI/C++ TurboModule over the Rust C ABI achieving **one live
> JS↔Rust↔JS round-trip** with **(a)** the **iOS xcframework link** working (the exact
> step that failed), **(b)** a **4-ABI Android** build+run, **(c)** §1 intact (no key
> bytes in the JS heap). If it fails/flakes → **fall back to CMP-uniffi** (most reliable
> binding, the core's locked path; accept the iOS-a11y regression + UI rewrite), or to
> **A-native** if the absolute a11y bar dominates. Flutter-frb only if both are rejected.

**Fallback order if RN-handjsi's spike fails:** CMP-uniffi → A-native → Flutter-frb.

## Cross-cutting notes (apply to every option)

- **§1 is currently *violated* in the shipping app** (`src/db/connect.ts:23` interpolates
  the raw hex DB key into `PRAGMA key` from JS). Moving crypto into the core is identical
  work under all options — not a differentiator, but it must happen.
- **Accessibility is likely *microenterprise-exempt*** (solo free wellbeing service, <10
  persons & ≤€2M, EAA/zák. 424/2023) → an **ethical**, not hard-legal, bar here. The
  exemption is fragile (vanishes on growth/funding, no grace period), so **build to AA
  regardless** — which favours the option that already meets it (RN).
- **GrapheneOS/no-GMS is ~neutral across options** (all ship a GMS-free `.so`; repo is
  already FCM/GMS-free). The real existential distribution risk is **Google's developer-
  registration decree (~Sept 2026)** threatening sideloading/F-Droid **equally** for all
  stacks → mitigation is a signed-APK / Accrescent / GrapheneOS-repo channel plan, not a
  binder property. So don't let no-GMS tie-break the binder.
- **Post-v1 lever:** UniFFI is the one binding serving the deferred Swift (iOS/macOS/
  watchOS) + Kotlin (Android/wearOS) targets; **hand-JSI is RN-mobile-only** and produces
  nothing reusable for desktop/watch. CMP/Flutter reuse their binding toward desktop.
- **Test reuse caveat (RN):** the RTL suite carries over only if the JSI binding preserves
  the `connectDb` JS contract; if the real core is **async** (likely — Argon2id unlock,
  CRDT/sync), call sites/assertions need reshaping, and async marshalling over hand-JSI is
  the under-documented hard part.

## Decision for Anna

Pick the v1 path; I'll then prompt the chosen one. My recommendation: **RN-handjsi,
gated by spike #1b on real hardware**, with **CMP-uniffi** as the named fallback (and the
post-v1 desktop/watch binding regardless). Either way, **the mandatory next action is
identical: reach one live round-trip on a real mobile dev machine before committing** —
no option has a demonstrated live boundary today.
