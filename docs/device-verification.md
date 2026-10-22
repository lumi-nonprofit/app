# Device verification — the HIG / Material frontend (PR #41)

Only `npm run typecheck`, `npm run lint` and `npm test` (jest-expo, Android preset) checked the
refactor of 2026-10-17. Native headers, native tabs, Dynamic Type, Dark Mode and the screen
readers behave differently on a device. Walk through this list on a development build before the
pilot. Tick each line, note the device and the OS version, and file each failure as an issue.

Build: `npx expo prebuild && npx expo run:android` (pilot), `npx expo run:ios` (macOS). The APK
from the `Android APK` workflow works too (`docs/pilot-release.md`).

## 1. Android (pilot platform)

Device: **\_\_** Android **\_\_** Date: **\_\_** By: **\_\_**

**Navigation and layout**

- [ ] 4 tabs (Dnes, Klid, Přehledy, Pomoc) with Material Symbols. The labels are always visible.
      The active tab has the indicator pill and the gold tint. A tab switch keeps the stack of
      each tab.
- [ ] Top app bar on each tab root: title left in Bricolage, no shadow, surface colour. Pushed
      screens ("Ohlédnutí", "Krizový plán") show the Up arrow; the tab bar stays visible.
- [ ] Edge-to-edge: content draws under the transparent status bar and the gesture bar. No
      control sits in the gesture zones. The window background matches the page colour during
      transitions (no white or black flash).
- [ ] Dnes header: "+" opens the check-in sheet, the gear opens Nastavení. Both have TalkBack
      labels ("Nový check-in", "Nastavení") and ripple.
- [ ] Modal tasks close with the standard controls. Check-in: "Zrušit" ×, "Zpět", "Hotovo".
      Questionnaire: "Zavřít" × on question 1, then the back arrow "Předchozí otázka". Player and
      handover: "Zavřít" ×. Nastavení: "Zavřít" ×. Crisis: "Zavřít" ×. Hardware or gesture Back
      inside the check-in sheet goes from step 2 to step 1 without a dialog.
- [ ] Discard guards: a system dialog with "Zrušit" and the destructive verb opens on Back from
      unsaved work. Unsaved work is a dirty check-in step 1, a questionnaire with an answer, or a
      changed crisis-plan section. "Zrušit" is never the default. A save leaves without a dialog.
- [ ] Deep links: `lumi://reflection` and `lumi://plan/signals` open with the tab underneath.
      `lumi://crisis` opens before the end of onboarding. An unknown path shows "Nenalezeno" with
      "Zpět na Dnes".

**Appearance**

- [ ] Dark theme from the system: every screen follows it. So do the tab bar, the headers, the
      check-in sheet, the questionnaire, Nastavení and the splash background. Cards show a
      hairline in dark. Crisis buttons are clay300 with ink text.
- [ ] Light theme: crisis buttons are clay700 with white text. Selected chips and mood tiles show
      the sun600 outline and the check mark. The slider track is readable.
- [ ] Font size 200 % and display size large: onboarding scrolls. Buttons grow in height instead
      of a clip. The chip rows and the Přehledy header wrap. The WHO-5 ring grows at most 1.3×.
      The tab labels stay readable. The layout cuts no text.
- [ ] Bold text and high-contrast text (Android accessibility settings): titles stay readable.
- [ ] Icons: Material Symbols render (no empty squares) on the first launch; the weights follow
      the text.
- [ ] Dates, times and plural forms read correctly in cs and in en (the device language).

**TalkBack**

- [ ] In the onboarding, the "Jak ti říkat?" field reads with its hint. The age radios announce
      "selected". The crisis link is reachable. The buttons read "Začít" → "Pokračovat" →
      "Hotovo".
- [ ] Check-in: mood tiles are radios with name and state. Words and tags are buttons with the
      selected state. A custom tag offers the "Smazat" action in the actions menu. A save
      announces "Uloženo".
- [ ] Questionnaire: each step announces "Otázka X z Y". The answer rows are buttons. The support
      page after PHQ-9 question 9 announces itself and offers Pomoc and the call button.
- [ ] Klid: the breath circle announces "Nádech" / "Výdech". The 4-7-8 player announces the
      phases and the end. Dech naslepo announces the countdown. It offers "Ukončit cvičení" as an
      action and as a visible button on the dark surface.
- [ ] Přehledy: day dots and month cells read "day — state, intensity" or "bez záznamu". The
      segmented buttons are radios. Section titles are headings (navigation by headings works).
- [ ] Nastavení: switches read the label without a state word ("Sdílet data pro výzkum",
      "Haptická odezva") and the state separately. The "Smazat štítek X" buttons work.
- [ ] The screen reader skips decorative icons. The phone icon rows read as links "Zavolat …".

**Reminders**

- [ ] The switch "Denní připomínka" asks for the notification permission in context (never at
      launch). After a denial, the screen shows the explanation, and "Otevřít nastavení systému"
      opens the system settings page of the app.
- [ ] A delivered reminder appears in the "Připomínky" channel with default importance. The lock
      screen hides its text (private visibility). No streak or guilt wording.

**Haptics and motion**

- [ ] Haptics on selection, save and breath phases. The Nastavení switch turns them off at once
      and after a restart.
- [ ] "Remove animations" (Android accessibility): the breath circle stops its scale animation,
      the label still changes, and haptics continue.

## 2. iOS

Device: **\_\_** iOS **\_\_** Date: **\_\_** By: **\_\_**

- [ ] Tab bar: system bar with Liquid Glass on iOS 26 (blur on earlier versions). SF Symbols show
      the outline variant when idle and the filled variant when selected. Labels sit under the
      icons. The selected tab has the gold tint. Content scrolls under the bar.
- [ ] Headers: large titles on the 4 tab roots collapse on scroll. Back is the chevron without
      text. Bar items are native (SF Symbols "+", gear, `xmark`; text items "Zrušit" and the
      prominent "Hotovo"). On iOS 26 the items sit in glass. On earlier versions "prominent" must
      still render; if it does not, switch `variant` to `done` in `HeaderItems.tsx`.
- [ ] Sheets: the check-in sheet has a card look without a grabber. A swipe down with a dirty
      step opens an action sheet (destructive "Zahodit" on top, "Zrušit" at the bottom). The sheet
      snaps back after a cancel. The questionnaire behaves the same after the first answer. The
      user cannot swipe the support page away.
- [ ] Full-screen modals (player, handover) have no swipe down and close with `xmark`. The blind
      breath surface hides the header while it runs.
- [ ] Dark Mode, Increase Contrast, Reduce Transparency: every screen is readable. The tab bar and
      the headers adapt. No custom bar background fights the system material.
- [ ] Dynamic Type up to AX5 on Dnes, Přehledy and Pomoc: titles wrap, buttons grow, the layout
      clips nothing. Bold Text makes the Bricolage titles use the 700 cut.
- [ ] Reduce Motion: the breath circle cross-fades the labels instead of a scale animation.
- [ ] VoiceOver: the same flows as TalkBack above. The escape gesture (2-finger Z) and the magic
      tap end Dech naslepo. The rotor lists headings on every screen.
- [ ] `tel:` links open the dialer. On an iPad or a simulator without a dialer, nothing crashes.
- [ ] The native segmented control on Přehledy switches week and month.

## 3. Web (smoke only; web is out of scope)

- [ ] `npx expo start --web`: Lucide icons render, the JS tab bar works, nothing crashes on load.

## 4. Open questions for Anna

- "Co dělat, když…" guides: write the content for `src/features/help/guides.ts`, or drop the
  section for the pilot.
- The chat of Linka bezpečí: confirm the URL and the hours before it goes into `CHAT_LINES`.
- "Všímavá procházka": content or removal (it shows "připravujeme").
- The Klid tab glyph: `leaf` / `spa` (current) or `wind` / `air`.
- 116 006: confirm the displayed hours ("nonstop, zdarma") against the source.
- Predictive back on Android stays off for the pilot (the discard guard cannot veto the
  predictive animation). To turn it on, the app needs a persisted check-in draft.
- The title "Pomoc je blízko" on the Pomoc tab and the shorter copy from the editorial pass.
