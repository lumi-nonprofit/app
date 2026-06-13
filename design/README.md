# Lumi design tokens

Single source of truth for Lumi's visual tokens, with [Style Dictionary](https://styledictionary.com)
codegen to every UI surface. One source → no per-platform drift (ADR 0001 §2.3, §7).

```bash
npm install
npm run build      # writes build/{js,css,ios,compose}/
```

- `tokens/` — the source (currently `color.json`: the cream/ink/sun/sage/lake/lilac/clay
  palette, lifted 1:1 from `src/theme.ts`, plus the locked **mood** colours).
- `build/` — generated, git-ignored. Targets: RN/JS (`tokens.js`), CSS variables,
  iOS Swift (`LumiTokens.swift`), Android Compose (`LumiTokens.kt`).

## Locked mood encoding

Mood is **never colour alone** (ADR 0001 §2.3). Colour lives here; the paired
**shape** lives in code (`src/components/MoodShape.tsx`):

| Mood | Colour token | Shape |
|------|--------------|-------|
| energie | `mood.energie` | circle |
| napeti  | `mood.napeti`  | diamond |
| klid    | `mood.klid`    | square |
| utlum   | `mood.utlum`   | half |

Spacing, radii, typography, shadows, and motion tokens are added here as the v1
app migrates them off `src/theme.ts`.
