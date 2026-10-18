# Device verification — the HIG / Material frontend (PR #41)

The refactor of 2026-10-17 was verified only with `npm run typecheck`, `npm run lint` and
`npm test` (jest-expo, Android preset). Native headers, native tabs, Dynamic Type, Dark Mode and
the screen readers behave differently on a device. Walk through this list on a development build
before the pilot. Tick each line, note the device and OS version, and file what fails as an issue.

Build: `npx expo prebuild && npx expo run:android` (pilot), `npx expo run:ios` (macOS). The APK
from the `Android APK` workflow works too (`docs/pilot-release.md`).

## 1. Android (pilot platform)

Device: **\_\_** Android **\_\_** Date: **\_\_** By: **\_\_**

**Navigation and layout**

- [ ] Four tabs (Dnes, Klid, Přehledy, Pomoc) with Material Symbols, labels always visible, the
      active tab has the indicator pill and the gold tint; switching tabs keeps each tab's stack.
- [ ] Top app bar on each tab root: title left in Bricolage, no shadow, surface colour. Pushed
      screens (Ohlédnutí, Krizový plán) show the Up arrow; the tab bar stays visible.
- [ ] Edge-to-edge: content draws under the transparent status bar and the gesture bar; no
      control sits in the gesture zones; the window background matches the page colour during
      transitions (no white or black flash).
- [ ] Dnes header: "+" opens the check-in sheet, the gear opens Nastavení; both have TalkBack
      labels ("Nový check-in", "Nastavení") and ripple.
- [ ] Modal tasks: check-in (Zrušit ×, Zpět, Hotovo), questionnaire (Zavřít × on question 1,
      then back arrow "Předchozí otázka"), player and handover (Zavřít ×), Nastavení (Zavřít ×),
      crisis (Zavřít ×). Hardware/gesture Back inside the check-in sheet goes from step 2 to
      step 1 without a dialog.
- [ ] Discard guards: Back from a dirty check-in step 1, a questionnaire with an answer, or a
      changed crisis-plan section opens a system dialog with "Zrušit" and the destructive verb;
      "Zrušit" is never the default. Saving leaves without a dialog.
- [ ] Deep links: `lumi://reflection` and `lumi://plan/signals` open with the tab underneath;
      `lumi://crisis` opens before onboarding is finished; an unknown path shows "Nenalezeno"
      with "Zpět na Dnes".

**Appearance**

- [ ] Dark theme from the system: every screen, the tab bar, the headers, the check-in sheet,
      the questionnaire, Nastavení and the splash background follow it; cards show a hairline in
      dark; crisis buttons are clay300 with ink text.
- [ ] Light theme: crisis buttons are clay700 with white text; selected chips and mood tiles show
      the sun600 outline and the check mark; the slider track is readable.
- [ ] Font size 200 % and display size large: onboarding scrolls, buttons grow in height instead
      of clipping, the chip rows and the Přehledy header wrap, the WHO-5 ring grows at most 1.3×,
      the tab labels stay readable, no text is cut.
- [ ] Bold text / high-contrast text (Android accessibility settings): titles remain readable.
- [ ] Icons: Material Symbols render (no empty squares) on first launch; weights follow the text.

**TalkBack**

- [ ] Onboarding: "Jak ti říkat?" field with its hint, age radios announce "selected", the crisis
      link is reachable, the buttons read Začít → Pokračovat → Hotovo.
- [ ] Check-in: mood tiles are radios with name and state; words and tags are buttons with the
      selected state; a custom tag offers the "Smazat" action in the actions menu; saving
      announces "Uloženo".
- [ ] Questionnaire: each step announces "Otázka X z Y"; the answer rows are buttons; the support
      page after PHQ-9 question 9 announces itself and offers Pomoc and the call button.
- [ ] Klid: the breathing circle announces Nádech / Výdech; the 4-7-8 player announces phases and
      the end; Dech naslepo announces the countdown and offers "Ukončit cvičení" as an action and
      as a visible button on the dark surface.
- [ ] Přehledy: day dots and month cells read "day — state, intensity" or "bez záznamu"; the
      segmented buttons are radios; section titles are headings (headings navigation works).
- [ ] Nastavení: switches read the label without a state word ("Sdílet data pro výzkum",
      "Haptická odezva") and the state separately; "Smazat štítek X" buttons work.
- [ ] Decorative icons are skipped; the phone icon rows read as links "Zavolat …".

**Reminders**

- [ ] Turning on "Denní připomínka" asks for the notification permission in context (never at
      launch); a denial shows the explanation and "Otevřít nastavení systému" opens the app's
      system settings page.
- [ ] A delivered reminder appears in the "Připomínky" channel with default importance; on the
      lock screen its text is hidden (private visibility); no streak or guilt wording.

**Haptics and motion**

- [ ] Haptics on selection, save, breathing phases; the Nastavení switch turns them off at once
      and after a restart.
- [ ] "Remove animations" (Android accessibility): the breathing circle stops scaling, the label
      still changes and haptics continue.

## 2. iOS

Device: **\_\_** iOS **\_\_** Date: **\_\_** By: **\_\_**

- [ ] Tab bar: system bar with Liquid Glass on iOS 26 (blur on earlier versions), SF Symbols
      outlined when idle and filled when selected, labels under the icons, gold tint for the
      selected tab, content scrolls under the bar.
- [ ] Headers: large titles on the four tab roots collapse on scroll; Back is the chevron without
      text; bar items are native (SF Symbols "+", gear, xmark; text items Zrušit and the
      prominent Hotovo). On iOS 26 the items sit in glass; on earlier versions "prominent" must
      still render (if it does not, switch `variant` to `done` in `HeaderItems.tsx`).
- [ ] Sheets: the check-in sheet has a grabber-less card look, swipe-down with a dirty step opens
      an action sheet (destructive "Zahodit" on top, "Zrušit" at the bottom) and the sheet snaps
      back when cancelled; the questionnaire behaves the same after the first answer; the support
      page cannot be swiped away.
- [ ] Full-screen modals (player, handover) have no swipe-down and close with xmark; the blind
      breath surface hides the header while running.
- [ ] Dark Mode, Increase Contrast, Reduce Transparency: every screen readable, the tab bar and
      headers adapt, no custom bar background fights the system material.
- [ ] Dynamic Type up to AX5 on Dnes, Přehledy and Pomoc: titles wrap, buttons grow, nothing is
      clipped; Bold Text makes the Bricolage titles use the 700 cut.
- [ ] Reduce Motion: the breathing circle cross-fades labels instead of scaling.
- [ ] VoiceOver: the same flows as TalkBack above; the escape gesture (two-finger Z) and magic tap
      end Dech naslepo; the rotor lists headings on every screen.
- [ ] `tel:` links open the dialer; on an iPad or simulator without a dialer nothing crashes.
- [ ] The native segmented control on Přehledy switches week/month.

## 3. Web (smoke only; web is out of scope)

- [ ] `npx expo start --web`: Lucide icons render, the JS tab bar works, nothing crashes on load.

## 4. Open questions for Anna

- "Co dělat, když…" guides: write the content for `src/features/help/guides.ts` or drop the
  section for the pilot.
- Chat Linky bezpečí: confirm the URL and hours before it goes into `CHAT_LINES`.
- "Všímavá procházka": content or removal (it shows "připravujeme").
- The Klid tab glyph: `leaf` / `spa` (current) or `wind` / `air`.
- 116 006: confirm the hours shown ("nonstop, zdarma") against the source.
- Predictive back on Android stays off for the pilot (the discard guard cannot veto the
  predictive animation); turning it on needs a persisted check-in draft.
- The title "Pomoc je blízko" on the Pomoc tab and the shorter copy from the writing pass.
