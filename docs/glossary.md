# Glossary

One meaning per term, for the documentation, the comments and the reviews (ASD-STE100: 1 word,
1 meaning). The tables group the terms by area. The last table lists the Czech proper nouns that
the `NonEnglish` rule of Vale accepts outside quotes; the rule in `.vale/styles/STE/NonEnglish.yml`
and the list in `scripts/check-english-source.mjs` mirror it.

## Product

| Term            | Meaning                                                                                                       |
| --------------- | ------------------------------------------------------------------------------------------------------------- |
| check-in        | The 2-step record of the current emotional state: a state with an intensity, then words, tags and a note.     |
| entry           | One saved check-in. The database table `entries` holds it.                                                    |
| state           | One of the 4 emotional states of the Mood Meter: Energie, Napětí, Klid, Útlum. Each has a colour and a shape. |
| intensity       | The strength of the state, 1 to 5.                                                                            |
| word            | A noun that refines the state ("stres", "radost"). The database stores its id (`src/db/vocab.ts`).            |
| tag             | A context of the entry ("škola", "spánek"). Built-in tags have ids; custom tags keep their label.             |
| questionnaire   | WHO-5, PHQ-9 or GAD-7. The app calls them instruments in the code (`src/features/measure/definitions.ts`).    |
| wellbeing index | The WHO-5 score as a percentage. The app compares it with the own average only.                               |
| band            | The interpretation range of a questionnaire result. It is never a diagnosis.                                  |
| trend           | The difference between the last 2 results of the same questionnaire.                                          |
| insights        | The descriptive patterns in Přehledy ("Co se ukazuje"): a state by a tag or by a time of day.                 |
| reflection      | The weekly card "Ohlédnutí za týdnem" from Sunday 17:00 to Monday.                                            |
| calm activity   | An item of Klid: a breath exercise, an audio track or "Dech naslepo".                                         |
| crisis plan     | The 3 editable sections in Pomoc: signals, what helps, contacts.                                              |
| crisis card     | The wallet card as a PDF with the plan and the lines.                                                         |
| handover        | The mode "Podej telefon": the screen for a third person who gets the phone.                                   |
| help line       | A crisis or support line in `src/features/help/lines.ts`. The primary line depends on the age band.           |
| age band        | `u26` (up to 26 years) or `plus27`. It selects the primary help line. It can stay empty.                      |
| recommendation  | An item of "Pro tebe" on Dnes. One source feeds the list.                                                     |

## Milestones (ADR 0001, section 12, and `docs/STATUS.md`)

| Term      | Meaning                                                                                                                                                                                                                                                                                                                                                                   |
| --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| MVP       | The pilot Android build of the current app (ADR 0007). It is not one of the milestones.                                                                                                                                                                                                                                                                                   |
| M0        | The architecture ADR, the Rust scaffold, CI and the SBOM. Done.                                                                                                                                                                                                                                                                                                           |
| M1        | The at-rest crypto core in Rust and 1 check-in through the stack on a device. Done.                                                                                                                                                                                                                                                                                       |
| M2        | Zero-knowledge sync and recovery. Design only.                                                                                                                                                                                                                                                                                                                            |
| M3        | The v1 mobile app on the Rust core, with the migration of the data. Not started.                                                                                                                                                                                                                                                                                          |
| M4        | The app lock (S4). Not started.                                                                                                                                                                                                                                                                                                                                           |
| M6        | The integrity heuristic (S11). Not started.                                                                                                                                                                                                                                                                                                                               |
| S1 to S12 | The security requirements of ADR 0001, section 9. S1: keys stay in the device. S2: an encrypted export. S3: encrypted web persistence. S4: the app lock. S5: no cloud backup of the database. S6: capture protection. S7: key rotation. S8: route and consent guards. S9: input hygiene. S10: supply-chain hygiene. S11: the integrity heuristic. S12: no sensitive logs. |

## Security and data

| Term                 | Meaning                                                                                              |
| -------------------- | ---------------------------------------------------------------------------------------------------- |
| vault                | The Rust store of encrypted records (`core/lumi-vault`). The app uses it only behind a feature flag. |
| vault key (VK)       | The symmetric key that encrypts the vault content.                                                   |
| PIN key              | The key that Argon2id derives from the PIN. It wraps the vault key.                                  |
| keystore wrap        | The wrap of the vault key under a key in the hardware keystore (planned, ADR 0005).                  |
| recovery wrap        | The wrap of the vault key under the recovery key (planned, ADR 0005).                                |
| zero-knowledge relay | The sync server design of ADR 0006: the server stores blobs it cannot read.                          |
| HLC                  | A hybrid logical clock. It orders records across devices.                                            |
| CRDT                 | A conflict-free replicated data type. The merge of records from 2 devices.                           |
| CMP                  | Compose Multiplatform. ADR 0001 compares it with Flutter and React Native for the v1 user interface. |
| SQLCipher            | The encryption layer of SQLite. The app database uses it through `expo-sqlite`.                      |
| Drizzle              | The TypeScript ORM and the migration tool of the app database (`drizzle-kit`).                       |
| Argon2id             | The password hash that derives the PIN key.                                                          |
| XChaCha20-Poly1305   | The authenticated cipher of the vault.                                                               |
| HPKE, X25519, ML-KEM | The planned key exchange of M2 (ADR 0005). Not in the code.                                          |
| post-quantum gate    | The condition in ADR 0004 (c) that decides when the ML-KEM layer comes.                              |
| data migration       | A one-time rewrite of stored data at start (`src/db/dataMigrations.ts`), recorded in `data-version`. |
| backup               | The JSON export and import in Nastavení (`src/db/backup.ts`, format 2; format 1 still imports).      |

## Tools and native code

| Term                 | Meaning                                                                                         |
| -------------------- | ----------------------------------------------------------------------------------------------- |
| Expo                 | The React Native framework and toolchain of the app (SDK 56).                                   |
| expo-router          | The file-based router of the app (`app/`), with typed routes.                                   |
| Hermes               | The JavaScript engine of React Native. It lacks some `Intl` features.                           |
| Reanimated           | The animation library (`react-native-reanimated`).                                              |
| Nitro                | Nitro Modules: the native binding framework of the vault module. `nitrogen` generates its glue. |
| cbindgen             | The tool that generates the C header `core/lumi-ffi-cabi/include/lumi_ffi_cabi.h` from Rust.    |
| C ABI                | The C-language convention for function calls; the FFI crate exports it.                         |
| UniFFI, wasm-bindgen | Alternative binding generators that the spikes and ADR 0001 compare.                            |
| musl                 | The C library of the portable Linux build. CI cross-builds the core crates against it.          |
| SBOM                 | The software bill of materials. CI generates it in the CycloneDX format.                        |
| Style Dictionary     | The tool that generates `src/theme/tokens.generated.ts` from `design/tokens/`.                  |
| Bricolage Grotesque  | The title font of the app.                                                                      |
| Lucide               | The icon set on the web.                                                                        |
| jest-expo            | The Jest preset of Expo. The tests use its Android project and its web project.                 |
| axe-core             | The accessibility engine that checks the design system on the web (`jest-axe`).                 |
| Vale                 | The prose linter that runs the `STE` style.                                                     |
| cspell               | The spell checker with the project dictionary.                                                  |
| markdownlint         | The Markdown structure linter (`markdownlint-cli2`).                                            |
| commitlint           | The checker of the commit header (Conventional Commits).                                        |
| i18next              | The internationalisation library; `i18next-cli` extracts the keys.                              |
| Dependabot           | The GitHub bot that opens dependency updates.                                                   |

## Platforms and accessibility

| Term                     | Meaning                                                                                                                                     |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------- |
| HIG                      | The Apple Human Interface Guidelines.                                                                                                       |
| Material 3               | The current Android design system, the base of the Android design guidelines.                                                               |
| Dynamic Type             | The system text scale of iOS. `ds/Text` maps its variants to the iOS text styles.                                                           |
| TalkBack, VoiceOver      | The screen readers of Android and iOS.                                                                                                      |
| EAA                      | The European Accessibility Act.                                                                                                             |
| EN 301 549               | The harmonised European standard for accessible ICT. It points to WCAG 2.1 AA.                                                              |
| WCAG 2.2 AA              | The project target for the user interface.                                                                                                  |
| role, name, state, value | The 4 properties of a control for a screen reader (`accessibilityRole`, the label or the text, `accessibilityState`, `accessibilityValue`). |
| header                   | The accessibility role of a title. Every screen has at least 1.                                                                             |
| touch target             | The size of a control: 44 pt on iOS, 48 dp on Android.                                                                                      |
| screen audit             | `test/a11y/audit.ts`: the rules over the rendered tree of every screen.                                                                     |

## Internationalisation

| Term            | Meaning                                                                                             |
| --------------- | --------------------------------------------------------------------------------------------------- |
| catalog         | One JSON file of texts for 1 locale and 1 namespace (`src/i18n/locales/<locale>/<namespace>.json`). |
| namespace       | A group of keys for 1 area of the app (`home`, `stats`, `content`).                                 |
| key             | The English camelCase path of 1 text (`step2.newTag.placeholder`).                                  |
| source locale   | Czech (`cs`). Every key exists in it; the tests run in it.                                          |
| plural form     | A key suffix for a count: `_one`, `_few`, `_many`, `_other` in cs; `_one`, `_other` in en.          |
| placeholder     | A value in a text: `{{count}}`, `{{time}}`.                                                         |
| `contentText()` | The typed accessor for texts that the code finds by an id (`src/i18n/content.ts`).                  |

## Text rules

| Term             | Meaning                                                                                                    |
| ---------------- | ---------------------------------------------------------------------------------------------------------- |
| STE              | ASD-STE100 Simplified Technical English, Issue 9. `docs/writing-rules.md` lists the checked rules.         |
| procedure        | A document of steps (`docs/pilot-release.md`, `docs/device-verification.md`, the checklist, the runbooks). |
| descriptive text | Every other document. 25 words per sentence; a procedure allows 20.                                        |
| technical name   | A word that the industry uses with 1 meaning. The project list is `accept.txt`.                            |
| ADR              | An architecture decision record in `docs/adr/`. Its headings are frozen: the code cites them.              |

## Czech proper nouns

| Term                                                  | Meaning                                                                        |
| ----------------------------------------------------- | ------------------------------------------------------------------------------ |
| Linka bezpečí (dative: Lince bezpečí)                 | The crisis line for children and young people, 116 111.                        |
| Linka první psychické pomoci                          | The first psychological aid line, 116 123.                                     |
| Linka pomoci obětem                                   | The line for victims of crime, 116 006.                                        |
| Rodičovská linka                                      | The line for parents, 606 021 021.                                             |
| Záchranná služba                                      | The emergency medical service, 155.                                            |
| Česká asociace pracovišť linek důvěry (ČAPLD)         | The Czech association of crisis lines.                                         |
| Linky důvěry v ČR                                     | The list of crisis lines in the Czech Republic.                                |
| Dnes, Klid, Přehledy, Pomoc, Nastavení                | The tabs and the settings screen: Today, Calm, Overviews, Help, Settings.      |
| Energie, Napětí, Klid, Útlum                          | The 4 states: energy, tension, calm, low energy.                               |
| Dech naslepo, Tichá louka, Večerka, Všímavá procházka | The calm activities: blind breath, quiet meadow, lights-out, mindful walk.     |
| Ohlédnutí za týdnem                                   | The weekly reflection card.                                                    |
| Krizový plán                                          | The crisis plan.                                                               |
| Pomoc hned, Pomoc blízkému, Podej telefon             | The sections of Pomoc: help now, help for a close person, hand over the phone. |
| Zdraví                                                | Apple Health (the iOS app).                                                    |
