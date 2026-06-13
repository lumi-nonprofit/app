# iOS State of Mind — zjištění a plán (experiment)

Stav k 13. 6. 2026. Záměr: při uloženém check-inu volitelně (opt-in)
zapsat záznam State of Mind do Apple Zdraví — pouze zápis, žádné čtení,
jen na iOS. Viz fáze 5 zadání.

## Rozhodnutí: zatím neimplementovat

Zadání říká „pokud knihovna State of Mind nepodporuje nebo je integrace
křehká, neimplementuj“ — a přesně to nastalo. V kódu zůstává jen feature
flag `STATE_OF_MIND_ENABLED` (`src/lib/featureFlags.ts`, default `false`).

## Zjištění

1. **`@kingstinct/react-native-healthkit`** (poslední release 5. 6. 2026,
   v9.x, Nitro Modules): dokumentace ani veřejné API **neobsahují žádnou
   podporu State of Mind** — žádné `saveStateOfMindSample`,
   `HKStateOfMind`, valence ani mood API. Pokrývá quantity/category/
   workout/correlation typy. Ověřeno v README repozitáře i v referenci
   na [kingstinct.com/react-native-healthkit](https://kingstinct.com/react-native-healthkit/).
2. **Apple API**: `HKStateOfMind` existuje od iOS 18 (WWDC24; zadání
   uvádí iOS 17+ — ve skutečnosti je potřeba iOS 18). Zápis vyžaduje
   HealthKit entitlement, `NSHealthUpdateUsageDescription` a explicitní
   per-type autorizaci od uživatele.
3. **Expo**: knihovna funguje jen v development buildu (ne v Expo Go),
   s config pluginem `@kingstinct/react-native-healthkit`, který
   entitlementy a Info.plist klíče nastaví. To by nám vyhovovalo —
   dev build už kvůli SQLCipheru používáme.
4. V tomhle prostředí navíc nelze iOS build ani spustit, takže by
   integrace vznikla naslepo — přesně ta „křehkost“, před kterou
   zadání varuje.

## Mapování (až to půjde)

| Lumi             | HKStateOfMind                                 |
| ---------------- | --------------------------------------------- |
| kvadrant Energie | valence kladná (pleasant), arousal vysoký     |
| kvadrant Klid    | valence kladná (pleasant), arousal nízký      |
| kvadrant Napětí  | valence záporná (unpleasant), arousal vysoký  |
| kvadrant Útlum   | valence záporná (unpleasant), arousal nízký   |
| intenzita 1–5    | velikost valence škálovaná do 0,2–1,0         |
| slova (words)    | `HKStateOfMind.Label` nejbližší ekvivalent    |
| typ záznamu      | `momentaryEmotion` (check-in je „teď a tady“) |

Pozn.: HKStateOfMind má valence −1…+1; mapujeme znaménko z kvadrantu
a velikost z intenzity. Zapisuje se **pouze** se zapnutým togglem
(default vypnuto) a mikrotextem, že data jdou do Apple Zdraví podle
jeho pravidel. Android a web volbu vůbec nezobrazují.

## Možnosti dál

1. **Sledovat `@kingstinct/react-native-healthkit`** — Nitro architektura
   přidávání typů zjednodušuje; až přibude State of Mind, integrace je
   ~1 den práce (toggle v Přehledech + zápis v `save()` Step2Screen za
   flagem + `Platform.OS === "ios"`).
2. **Vlastní Expo Module** (Swift, ~150 řádků): plná kontrola, ale
   údržba HealthKit kódu na nás; dává smysl jen pokud (1) dlouho nebude.
3. **Jiné knihovny**: `react-native-health` State of Mind také nemá
   a projekt je méně udržovaný — nesledovat.

## Kontrolní seznam před zapnutím flagu

- [ ] knihovna umí `saveStateOfMindSample` (nebo ekvivalent)
- [ ] dev build na reálném iPhonu s iOS 18+
- [ ] toggle „Zapisovat nálady do Zdraví (iOS)“ v Přehledech, default
      vypnuto, mikrotext o Apple Zdraví
- [ ] zápis jen při uloženém check-inu, pouze write, žádné čtení
- [ ] Android/web: volba se nezobrazuje
- [ ] test: mapování kvadrant→valence, intenzita→míra
