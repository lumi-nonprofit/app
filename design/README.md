# Lumi design tokens

The single source of truth for the visual tokens of Lumi.
[Style Dictionary](https://styledictionary.com) generates the code for every UI surface from this
one source, so the platforms cannot drift apart (ADR 0001 §2.3, §7).

```bash
npm install
npm run build      # writes ../src/theme/tokens.generated.ts and build/{js,css,ios,compose}/
```

- `tokens/` — the source: 5 files. `color.json` holds the cream, ink, sun, sage, lake, lilac and
  clay palette plus the locked **mood** colours. `motion.json`, `radius.json`, `semantic.json` and
  `space.json` hold the other tokens.
- `../src/theme/tokens.generated.ts` — the build writes this file, and git tracks it. The CI job
  `tokens` runs the build and fails when the file has drift. The theme in `src/theme/` builds on
  this file.
- `build/` — generated and git-ignored. Targets: JS (`tokens.js`), CSS variables, iOS Swift
  (`LumiTokens.swift`) and Android Compose (`LumiTokens.kt`).

## Locked mood encoding

Mood is **never colour alone** (ADR 0001 §2.3). The colour lives here. The paired **shape** lives
in code (`src/components/MoodShape.tsx`):

| Mood      | Colour token   | Shape   |
| --------- | -------------- | ------- |
| `energie` | `mood.energie` | circle  |
| `napeti`  | `mood.napeti`  | diamond |
| `klid`    | `mood.klid`    | square  |
| `utlum`   | `mood.utlum`   | half    |

The space, radius and motion tokens are in `tokens/`. Typography and shadow tokens are not there
yet: the theme defines them in `src/theme/` (`elevation.ts` holds the shadows). `src/theme.ts` no
longer exists; the theme is the folder `src/theme/`.
