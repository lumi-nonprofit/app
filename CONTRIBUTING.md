# How to contribute to Lumi

This guide tells you how to make a change that passes every gate of the repository. The gates
enforce the standards in `README.md`, section "Standards". Read that section first. The rules
apply to people and to AI agents in the same way (`AGENTS.md`).

## Set up the tools

1. Install Node 22 (`.nvmrc`) and run `npm ci`.
2. Install Vale 3.24.0. The CI step "Install Vale" in `.github/workflows/ci.yml` has the download
   URL and the checksum. Put the binary on your `PATH`, for example in `~/.local/bin`.
3. For the Rust crates, install a stable Rust toolchain. `core/Cargo.toml` and `server/Cargo.toml`
   are the 2 workspaces.
4. For a native build, follow `README.md`, section "Develop". Jest does not need a native build.

## Run the gates before you push

`npm run check:all` runs every gate that CI runs for the app. The table lists each gate, what it
checks and how you fix a failure.

| Command                 | What it checks                                                                                                                      | How to fix a failure                                                                                 |
| ----------------------- | ----------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| `npm run typecheck`     | TypeScript in strict mode. The Czech catalog types the keys: `t("stats:nope")` is a type error.                                     | Use a key that exists in the cs catalog.                                                             |
| `npm run lint`          | ESLint: the Expo rules, `react-native-a11y`, `i18next/no-literal-string`. Also the HIG and Material rules (theme roles, `ds/Text`). | Move the text to a catalog. Take sizes and colours from the theme.                                   |
| `npm test`              | Jest, 2 projects. Android: units, screens, database, contrast and the screen audit. Web: axe-core over the design system.           | The audit message names the rule, the path and the element. `test/a11y/audit.ts` explains each rule. |
| `npm run i18n:check`    | i18next-cli extracts the keys from the code; no change is allowed. Then `scripts/check-i18n.mjs` compares cs and en.                | Run `npm run i18n:extract`. Then fill the empty values in both catalogs.                             |
| `npm run format:check`  | Prettier (print width 100).                                                                                                         | `npm run format`                                                                                     |
| `npm run lint:md`       | markdownlint-cli2.                                                                                                                  | Keep 1 H1 per file, blank lines around lists and headings, and valid anchors.                        |
| `npm run spell`         | cspell with the project dictionary (`.vale/styles/config/vocabularies/Lumi/accept.txt`).                                            | Correct the word, or add a technical name to the dictionary.                                         |
| `npm run lint:docs`     | Vale with the `STE` style over every Markdown file and every comment.                                                               | `docs/writing-rules.md` lists each rule with a correct example.                                      |
| `npm run check:english` | Czech text in code, in comments and in test titles.                                                                                 | Move the text to a catalog. Put a Czech data label in quotes.                                        |
| `npm run check:agents`  | `AGENTS.md` and `CLAUDE.md` are identical.                                                                                          | Copy the changed file over the other one.                                                            |

CI also runs the gates that need other toolchains:

- `cargo test` for both Rust workspaces and the musl cross-build;
- the cbindgen check: `core/lumi-ffi-cabi/include/lumi_ffi_cabi.h` must match the Rust source;
- the Style Dictionary check: `src/theme/tokens.generated.ts` must match `design/tokens/`;
- the SBOM.

The job `Dependency audit (report-only)` can fail without a block. `docs/STATUS.md`, finding 8,
explains why.

## Write in Simplified Technical English

Every Markdown file, every comment and every commit body is English in the style of ASD-STE100.
The short version: 1 instruction per sentence and at most 25 words per sentence (20 in a
procedure). Use the active voice and the present tense. Use no -ing verb forms and no
contractions. Write "must" for a requirement and "can" for a possibility.

`docs/writing-rules.md` has the full list with examples. `docs/glossary.md` has 1 meaning for each
technical term.

Put code, paths, commands and quoted user-interface text in backticks. In Markdown, Vale skips
inline code, code blocks and block quotes. Czech is allowed only in quotes, in backticks and in
the message catalogs.

## Add or change a text that the user sees

1. Call `t("namespace:key")` from `src/i18n` with a literal key.
2. For a text that the code finds by an id, call `contentText()` from `src/i18n/content.ts`. The
   ids are moods, words, tags, help lines and instruments.
3. Run `npm run i18n:extract`. It adds the key to `src/i18n/locales/cs/` and `en/` with an empty
   value.
4. Fill the Czech text and the English text. The Czech catalog is the source. The English catalog
   is complete. The instrument items are the original English WHO-5, PHQ-9 and GAD-7 wording.
5. Run `npm run i18n:check`.

Rules for the keys and the texts:

- Keys are English camelCase paths that name the role of the text, not its content:
  `step2.newTag.placeholder`. Accessibility texts end with `.a11yLabel`, `.a11yHint` or
  `.announce`.
- Plural forms use the i18next suffixes: `_one`, `_few`, `_many`, `_other` in cs and `_one`,
  `_other` in en. Give the count as `{{count}}`.
- Do not use the i18next `context` option. Write 1 explicit key per variant. Select it with a
  ternary or a switch in the code.
- Write full sentences with `{{placeholders}}`. Never join translated fragments. Never change the
  case of a translated text in the code.
- Format dates, times, numbers, percentages and lists with `src/i18n/format.ts`. Do not build a
  date or a plural by hand.
- Tests run in the source locale (cs) and assert the Czech text. `test/i18n.test.ts` checks that
  every id in the data has its text in the `content` namespace.

## Keep the user interface accessible

- Build screens from the design system in `src/ds`. Text goes through `ds/Text` and its variants.
  Sizes and colours come from the theme roles. A raw `fontSize` or a hex colour in a screen is a
  lint error.
- Every control has a role, an accessible name and a state (`accessibilityState`,
  `accessibilityValue`). Every screen has 1 element with the role `header`.
- Touch targets are 44 pt on iOS and 48 dp on Android. `test/a11y/screens.test.tsx` renders every
  route and fails on a violation.
- Give an `accessibilityHint` only when the result of the action does not follow from the label.
- Announce a change that a screen reader cannot see with `announce()` from `src/lib/a11y.ts`.
- Add a gesture only with a button or an `accessibilityActions` alternative.
- Keep every colour pair in `src/theme/contrastPairs.ts`. `test/contrast.test.ts` checks both
  schemes against WCAG 2.2 AA.

## Write a commit message

Commits follow Conventional Commits. commitlint checks the header. `scripts/lint-commit-bodies.sh`
runs the STE rules over the body.

- Types: `feat`, `fix`, `docs`, `refactor`, `test`, `chore`, `ci`, `build`, `perf`, `style`,
  `revert`, `spike` (a time-boxed experiment) and `deps` (a dependency update). A scope is
  optional: `feat(stats): ...`.
- The subject is lowercase, in the imperative, without a full stop, at most 100 characters.
- The body says what changes and why, in STE. Use at most 25 words per sentence, the active voice
  and no -ing verb forms. Put code and paths in backticks.
- Keep the trailers that your tools add (`Co-Authored-By`, `Signed-off-by`). The STE check
  removes them before it reads the body.
- Dependabot commits are exempt.

Example:

```text
feat(stats): show the weekly reflection card on Sunday evening

The card appears from Sunday 17:00 to Monday. The texts come from the
`stats` catalog. The test covers both ends of the window.
```

## Open a pull request

- One topic per pull request. Describe the change in STE and name the gates you ran.
- CI must be green. `README.md`, section "Standards", lists the checks that the ruleset on `main`
  requires.
- A review bot can post findings. Fix a finding that blocks the merge. Otherwise explain in the
  thread why the code stays.
- Record a change of project state in `docs/STATUS.md`. Record a decision in a new ADR in
  `docs/adr/`. Do not renumber or rename an ADR heading: source files cite them.
- Do not change the questionnaire wording or the crisis numbers and hours without the owner. The
  owner signs `docs/cz-crisis-data-checklist.md`.

## Procedure documents

`docs/pilot-release.md`, `docs/device-verification.md` and `docs/cz-crisis-data-checklist.md` are
procedures. So are the runbooks and this file. Vale enforces 20 words per sentence and the active
voice in them. Write each step as 1 imperative sentence.
