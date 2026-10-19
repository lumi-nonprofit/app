# Instructions for AI agents

This file is for AI agents that write code (Claude Code, Codex, Copilot and others). `CLAUDE.md`
is an identical copy; `npm run check:agents` fails when the 2 files differ. Change both files
together.

## The rule

Follow `README.md`, section "Standards". It lists each standard, its scope and the gate that checks
it. `CONTRIBUTING.md` explains how to pass each gate. The sections below repeat the points that
agents get wrong most often.

## Before you push

1. Run `npm run check:all`. It runs the type check, ESLint, Jest (the Android and the web project)
   and the catalog check. It also runs the format check, markdownlint, cspell, Vale, the
   English-source check and the agents check.
2. Push only when every command passes. Vale is an external binary; `CONTRIBUTING.md`, section
   "Set up the tools", says how to install the pinned version.
3. For a change in `core/` or `server/`, also run `cargo test` in that workspace. For a change in
   `core/lumi-ffi-cabi/src/`, regenerate `core/lumi-ffi-cabi/include/lumi_ffi_cabi.h` with
   cbindgen.

## Documentation and comments

- Write every Markdown file, every comment and every commit body in Simplified Technical English.
  `docs/writing-rules.md` lists the rules. The short form: 1 instruction per sentence, at most 25
  words per sentence, active voice, present tense. No -ing verb forms, no contractions, "must"
  and "can".
- Put code, paths, commands and quoted user-interface text in backticks.
- Use 1 meaning per term (`docs/glossary.md`). Czech is allowed only in quotes, in backticks and
  in the message catalogs.
- Never copy the ASD-STE100 dictionary into the repository. ASD holds its copyright. The project
  keeps its own vocabulary in `.vale/styles/config/vocabularies/Lumi/accept.txt`.

## Text that the user sees

- Never hardcode a string that the user sees. Call `t("namespace:key")` from `src/i18n`, or
  `contentText()` from `src/i18n/content.ts` for text that the code finds by an id.
- Add every key to `src/i18n/locales/cs/` (the source) and `src/i18n/locales/en/`. Both catalogs
  are complete.
- Plural keys end in `_one`, `_few`, `_many`, `_other` (cs) and `_one`, `_other` (en). Do not use
  the i18next `context` option; write 1 explicit key per variant.
- Write full sentences with `{{placeholders}}`. Never join translated fragments.
- Format dates, numbers and lists with `src/i18n/format.ts`.

## Accessibility

- Build screens from `src/ds`. Text goes through `ds/Text`. Sizes and colours come from the theme
  roles; a raw `fontSize` or a hex colour in a screen is a lint error.
- Every control has a role, a name and a state. Every screen has 1 element with the role
  `header`. Touch targets are 44 pt on iOS and 48 dp on Android. `test/a11y/screens.test.tsx`
  fails otherwise.
- Keep every colour pair in `src/theme/contrastPairs.ts` so that `test/contrast.test.ts` sees it.

## Content that needs the owner

- Do not change the wording of WHO-5, PHQ-9 or GAD-7 without the owner. Do not change a crisis
  number or its hours without `docs/cz-crisis-data-checklist.md` and the sign-off of the owner.
- Do not renumber or rename an ADR heading. Source files and workflows cite them.

## Commits and pull requests

- Conventional Commits with a lowercase subject and an STE body (`CONTRIBUTING.md`, section
  "Write a commit message").
- Record a change of project state in `docs/STATUS.md`. Record a decision in a new ADR in
  `docs/adr/`.
- One topic per pull request. CI must be green before you ask for a review.
