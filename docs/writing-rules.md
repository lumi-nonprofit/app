# Text rules: Simplified Technical English in this repository

This document lists the rules of ASD-STE100 (Simplified Technical English, Issue 9) that the
repository follows. It says which rule a tool checks and how you fix a finding. The specification
is at <https://www.asd-ste100.org/>. ASD holds the copyright of its dictionary: the repository does
not hold a copy, and the project keeps its own vocabulary (section "Vocabulary").

## Scope

The rules apply to:

- every Markdown file (`README.md`, `docs/`, ADRs, proposals, spike reports, runbooks);
- every comment in the source code (`.ts`, `.tsx`, `.js`, `.mjs`, `.cjs`, `.rs`, `.kt`, `.kts`,
  `.cpp`, `.hpp`, `.h`, `.yml`, `.yaml`, `.toml`, `.sh`, `.gradle`, `.cmake`);
- the body of every commit message.

The rules do not apply to:

- the user-interface texts in the message catalogs (`src/i18n/locales/`); they are product copy;
- quotations in block quotes, inline code and code blocks in Markdown;
- generated files (`src/theme/tokens.generated.ts`, `core/lumi-ffi-cabi/include/`, `drizzle/`);
- `CODE_OF_CONDUCT.md`, which is the Contributor Covenant text as published;
- the Czech assertions in tests: a test proves that the catalog reproduces the user interface;
- the Czech legacy labels in `src/db/vocab.ts`: they are data for the migration of old entries.

`npm run lint:docs` runs Vale with the style in `.vale/styles/STE/`. `scripts/vale.sh` gives Vale
the file list from git. `scripts/lint-commit-bodies.sh` runs the same rules over commit bodies.

## Rules that Vale checks

| Rule                      | Level   | What it finds                                                                               | Write instead                                                                                                                       |
| ------------------------- | ------- | ------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| `SentenceLength`          | error   | A sentence with more than 25 words.                                                         | Split the sentence. 1 instruction or 1 fact per sentence.                                                                           |
| `ProcedureSentenceLength` | error   | A sentence with more than 20 words in a procedure file.                                     | Split the step. Procedures: `docs/pilot-release.md`, `docs/device-verification.md`, the checklist, the runbooks, `CONTRIBUTING.md`. |
| `ParagraphLength`         | error   | A Markdown paragraph with more than 6 sentences.                                            | Split the paragraph, or use a list.                                                                                                 |
| `Passive`                 | warning | A form of "be" with a past participle: `the key is stored by`.                              | Name who or what does the action: `the keystore stores the key`.                                                                    |
| `PassiveProcedure`        | error   | The passive voice in a procedure file.                                                      | Write the step in the imperative: `Install the build`.                                                                              |
| `Gerund`                  | error   | An -ing verb form: `when running`, `for sharing`.                                           | `when you run`, `to share`. Nouns such as `setting`, `warning`, `onboarding` and listed technical names pass.                       |
| `Contractions`            | error   | `don't`, `it's`, `can't`.                                                                   | `do not`, `it is`, `cannot`.                                                                                                        |
| `LatinAbbreviations`      | error   | `e.g.`, `i.e.`, `etc.`, `vs.`, `via`, `ad hoc`, `de facto`.                                 | `for example`, `that is`, name the items, `compared with`, `through`, `as needed`, `in practice`.                                   |
| `Unapproved`              | error   | A word with a shorter approved alternative: `utilise`, `prior to`, `in order to`, `ensure`. | `use`, `before`, `to`, `make sure`. Also `but` (not `however`), `more` (not `additional`), `about` (not `regarding`).               |
| `Avoid`                   | warning | A word with a likely alternative: `therefore`, `indicate`, `approximately`.                 | `thus`, `show`, `about`. Also `enough`, `do`, `get`, `give`, `different`, `many`.                                                   |
| `AndOr`                   | error   | `and/or`.                                                                                   | 2 sentences, or "A, or B, or both".                                                                                                 |
| `Modal`                   | error   | `should`, `may`, `might`.                                                                   | `must` for a requirement, `can` for a possibility.                                                                                  |
| `Polite`                  | error   | `please`.                                                                                   | Delete it. An instruction is an imperative.                                                                                         |
| `DoubleNegative`          | warning | `not unusual`, `not incomplete`.                                                            | The positive form: `usual`, `complete`.                                                                                             |
| `Numbers`                 | warning | A number as a word: `two`, `twelve`.                                                        | Digits: 2, 12.                                                                                                                      |
| `NonEnglish`              | error   | A word with Czech diacritics outside quotes, backticks and the list of proper nouns.        | Write English. Put a Czech data label in quotes. The glossary and the rule list the proper nouns.                                   |

In Markdown, Vale skips inline code, code blocks and block quotes. In a code comment, Vale reads
plain text: backticks do not exempt a word there. A technical name that ends in -ing (`Linking`,
`onSubmitEditing`) thus goes into the vocabulary, or the comment names it in other words.
The exceptions are case-sensitive: `string` passes, and the vocabulary lists `String` as well
where a sentence starts with it.

## Rules that a person checks in review

These rules have no reliable regular expression. Reviewers check them.

- **One instruction per sentence.** A step does 1 thing. A second action is a second sentence.
- **One meaning per word.** Use the same word for the same thing in the whole repository
  (`docs/glossary.md`). Do not use "entry" and "record" for the same object.
- **Articles.** Use "a", "an" and "the". STE does not drop articles: "the key", not "key".
- **Noun clusters.** At most 3 nouns in a row. "The database key file" is the limit; split a
  longer cluster with "of" or a clause.
- **Present tense.** Describe what the code does now. "will" is allowed for a future event that
  the text promises, not for a description.
- **Imperative in procedures.** `Run the build`, not `The build is run`.
- **Lists for sequences.** 3 or more steps become a numbered list.
- **No ALL-CAPS emphasis and no arrows in prose.** Bold is enough; "then" replaces an arrow.
- **Citations stay exact.** `ADR 0001 §11`, `ADR 0004 (e)`, `HIG Tab bars`, `S12`, `finding 8`
  keep their form.

## Vocabulary

STE allows a technical name that the industry uses, with 1 meaning. The project keeps its names
in 2 places:

- `.vale/styles/config/vocabularies/Lumi/accept.txt`: 1 technical name or proper noun per line.
  cspell and Vale share the file. A name in the list is also an exception of the `Gerund` rule
  (`autolinking`, `Linking`).
- `.vale/styles/config/vocabularies/Lumi/reject.txt`: words that the project does not use
  (`whitelist`, `sanity`, `dummy`, `basically`).

`docs/glossary.md` explains each term with its 1 meaning and lists the Czech proper nouns that
pass the `NonEnglish` rule.

To add a term: append the line to `accept.txt`, add the meaning to the glossary, and say why in
the pull request. Add only a real technical name, a product, a crate, a tool or a proper noun.
Never add an ordinary word to silence a rule, and never copy a word list from the ASD-STE100
dictionary.

## Examples

| Before                                                                                          | After                                                              |
| ----------------------------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| `The key should be stored in the keystore when running on Android, e.g. via expo-secure-store.` | On Android, `expo-secure-store` stores the key in the keystore.    |
| `It's important to ensure that the migration isn't run twice.`                                  | The migration runs once. `data-version` records the run.           |
| `Prior to pushing, the developer must perform all checks and/or fix the remaining failures.`    | Before you push, run `npm run check:all`. Fix every failure.       |
| `The user can't see the crisis lines if the DB fails (see finding 3), which is unacceptable.`   | The crisis lines stay visible when the database fails (finding 3). |

## Commit bodies

The same rules apply to the body of a commit. `scripts/lint-commit-bodies.sh <base> <head>`
removes the trailers (`Co-Authored-By`, `Signed-off-by`) and runs Vale over the rest. Merge
commits and Dependabot commits are exempt. `CONTRIBUTING.md`, section "Write a commit message",
has an example.
