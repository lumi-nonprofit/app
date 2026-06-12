# Audio pro Klid

Sem patří audio soubory aktivit z `src/features/calm/content.ts`.

- Název souboru = id aktivity: `ticha-louka.m4a`, `vecerka.m4a`, …
- Po dodání souboru nastav v manifestu (cesta z `src/features/calm/content.ts`):

  ```ts
  file: require("../../../assets/audio/<id>.m4a"),
  ```

  Metro soubor zabalí do aplikace — vše zůstává lokální, bez sítě.

- Režim přehrávání řídí `audioMode` v manifestu: `"mix"` nechá hudbu
  uživatele hrát dál (krátká cvičení), `"duck"` ji po dobu přehrávání
  jen ztiší (vedené meditace). Nikdy nepoužíváme `doNotMix`.
