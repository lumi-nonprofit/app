# Lumi

Česká aplikace pro podporu duševní pohody — check-in emocí, klidová cvičení,
přehledy a pomoc v krizi. Zdarma, neziskově, česky.

**Stav projektu a další postup:** [`docs/STATUS.md`](docs/STATUS.md) (anglicky).

Implementace vychází z high-fidelity prototypu **„Lumi Prototyp“** z Claude
Designu (handoff z 12. 6. 2026) a z **Lumi design systemu** (tokeny jsou zdroj
pravdy v `design/tokens/`, generují se do `src/theme/tokens.generated.ts`;
komponenty v `src/ds/` odpovídají DS bundle). Nativní mobilní aplikace
v **Expo / React Native** (iOS, Android, web přes react-native-web). Rozhraní
se řídí **Apple HIG** na iOS a **Android design guidelines (Material 3)** na
Androidu; světlý i tmavý režim podle systému, text škáluje s Dynamic Type
(viz [Přístupnost](#přístupnost)).

**Stack:** Expo SDK 56 · React Native 0.85 · React 19 · TypeScript (strict) ·
expo-router (typed routes) · šifrovaná SQLite (SQLCipher) + Drizzle ORM ·
ESLint (expo + react-native-a11y) + Prettier. Vše local-first, offline,
bez backendu a telemetrie.

## Spuštění

```bash
npm install
npm start         # Expo dev server (QR kód pro Expo Go / dev client)
npm run android   # spustit na Androidu
npm run ios       # spustit na iOS
npm run web       # spustit v prohlížeči (react-native-web)
npm test          # testy (jest-expo + @testing-library/react-native)
```

Produkční buildy řeší standardní Expo pipeline (`eas build`, případně
`npx expo export` pro web). Pilotní Android APK staví GitHub Actions; postup
je v [`docs/pilot-release.md`](docs/pilot-release.md) (anglicky).

## Vývoj

Databáze je šifrovaná **SQLCipherem** (config plugin `expo-sqlite`), který
**nefunguje v Expo Go** — na zařízení/emulátoru je potřeba development build:

```bash
npx expo prebuild           # vygeneruje nativní projekty (android/, ios/)
npx expo run:android        # build + instalace na Android (emulátor/zařízení)
npx expo run:ios            # build + instalace na iOS (jen macOS)
```

Po úpravě schématu databáze (`src/db/schema.ts`) vygeneruj migraci:

```bash
npx drizzle-kit generate    # zapíše SQL + journal do drizzle/
```

Migrace se registrují automaticky při startu aplikace (`src/db/connect.ts`).
Testy běží proti stejnému schématu a migracím přes better-sqlite3 v paměti
(`test/helpers/testDb.ts`) — nativní build k vývoji logiky potřeba není.

Dev build potřebují i **lokální připomínky** (`expo-notifications`): knihovna
nezmizela, jen v SDK 53+ skončila vzdálená push notifikace v Expo Go. Lokální
plánované notifikace (které appka používá — žádný push token) běží
v development buildu; v Expo Go se jen objeví varování.

Kontroly: `npm test`, `npm run typecheck`, `npm run lint`, `npx expo-doctor`.

## Co je hotové

- **Onboarding (3 obrazovky):** jméno (nepovinné) → věkové pásmo (určuje
  primární krizovou linku; jde neuvést) → soukromí. Tlačítka Začít →
  Pokračovat → Hotovo, na každém kroku odkaz na krizovou pomoc (`/crisis`).
- **Dnes:** pozdrav podle denní doby, dominantní check-in karta (po dnešním
  zápisu se změní na shrnutí), wellbeing index z reálných dat, „Pro tebe“
  (jeden zdroj doporučení), krizová karta. V hlavičce „+“ (nový check-in)
  a ozubené kolo (Nastavení).
- **Check-in:** krok 1 (stav + intenzita 1–5) → krok 2 (slova 1–2, kontextové
  i **vlastní** štítky, nepovinná poznámka) → potvrzení s kontextovým tipem
  podle stavu. Výběr a uložení provází decentní **haptika**.
- **Dotazníky:** **WHO-5** (wellbeing index, kadence 14 dní), volitelně
  **PHQ-9** a **GAD-7** v sekci „Chceš jít víc do hloubky?“. Jedna otázka na
  kartu, výsledek jako pásmo + trend vůči vlastnímu měření, nikdy diagnóza.
  Disclaimer před prvním hlubším screeningem; **PHQ-9 ot. 9 > 0** vede na
  empatickou podpůrnou mezistránku místo výsledku.
- **Klid:** dechový kruh, přehrávač aktivit (Dech 4-7-8 s časovanými fázemi
  i bez audia, audio aktivity připravené), **Dech naslepo** (telefon v kapse,
  vedení vibracemi).
- **Přehledy:** týden/měsíc jako tečky (každá buňka má popisek pro čtečku),
  wellbeing index, **insights** („Co se ukazuje“ — deskriptivní vzorce),
  **týdenní reflexe**, hlubší screeningy.
- **Nastavení** (modal z Dnes a Přehledů): profil (jméno, věk), **připomínky**
  (lokální notifikace, default vypnuto; na Androidu kanál se soukromým
  zobrazením na zámku), přepínač „Sdílet data pro výzkum“ (default vypnuto),
  haptika, vlastní štítky, **záloha** (export/import JSON), o aplikaci.
  Vzhled se nenastavuje — sleduje systém.
- **Pomoc:** krizové linky s `tel:` odkazy (primární podle věku), volatelné
  řádky 155/112, kontakty z jednoho zdroje (`src/features/help/lines.ts`,
  vč. 116 006), editovatelný krizový plán + **tisk kartičky do peněženky**
  (PDF), rychlé zklidnění, režim **„Podej telefon“** pro třetí osobu.
  Rozcestník „Co dělat, když…“ se ukáže, až bude mít obsah (`guides.ts`).

Spodní navigace: nativní tab bar **Dnes · Klid · Přehledy · Pomoc** (iOS
systémový tab bar, Android navigation bar); check-in je akce z Dnes. Každý
tab má vlastní stack s nativní hlavičkou, modální úlohy (check-in, dotazník,
přehrávač, předání telefonu, nastavení, krizová pomoc) se zavírají
standardním Zrušit/Zavřít a rozpracovaný obsah se nezahodí bez dotazu.

### Stavy obrazovek jsou datové

Prototyp přepínal varianty obrazovek ručně (tweaks panel); v aplikaci je
řídí skutečná data:

| Navržená varianta            | Kdy nastane                                                    |
| ---------------------------- | -------------------------------------------------------------- |
| Dnes — první den             | žádné WHO-5 měření → místo procenta výzva k prvnímu dotazníku  |
| Check-in — disabled tlačítko | dokud není vybrán stav (krok 1) / aspoň jedno slovo (krok 2)   |
| Přehledy — prázdný týden     | 0–1 záznam v aktuálním týdnu → povzbuzení bez viny             |
| Přehledy — WHO-5 pod 50 %    | poslední skóre < 50 → empatická věta + tiché tlačítko na Pomoc |
| Dnes — shrnutí zápisu        | existuje dnešní záznam                                         |
| Dotazník — disclaimer        | první spuštění PHQ-9/GAD-7 → orientační nástroj, ne diagnóza   |
| PHQ-9 — podpůrná mezistránka | odpověď na otázku 9 (myšlenky na smrt) > 0 → akce nad foldem   |
| Insights — málo dat          | < 3 záznamy / vzorec pod prahem → povzbuzení místo nálezu      |
| Reflexe — okno viditelnosti  | karta „Ohlédnutí za týdnem“ od neděle 17:00 do pondělí         |
| Kartička — prázdný plán      | tisk bez vyplněného plánu → výzva k vyplnění, ne prázdné PDF   |

## Klíčová rozhodnutí (převzatá z handoff prototypu)

- **Přemapování barev stavů.** DS mapování (clay=napětí, lake=útlum) kopíruje
  vizuální podpis Mood Meteru, proto je prohozené: **Napětí→lake,
  Útlum→clay**. Každý stav má navíc vlastní tvar (kruh / kosočtverec /
  čtverec / půlkruh) — informace nikdy jen barvou.
- **Rodová neutralita.** Emoční stavy jako podstatná jména, výzvy jako
  společné otázky („Začneme?“). DS komponenty MoodPicker a BreathCircle mají
  rodově vázané texty, proto jsou nahrazené vlastními verzemi.
- **Přístupný disabled stav.** Hlavní CTA v disabled stavu = obrys +
  inkoustový text na zapuštěném podkladu (kontrast ≥ 4,5:1), ne snížená
  opacita; pod tlačítkem hint, co chybí.
- **Primary tlačítka = plný ink**, zlatá jen jako soft výplň/ring (pravidlo
  DS — zlatá výplň neprojde kontrastem). Krize = clay, nikdy alarm-red.
- **Žádná gamifikace, žádné guilt mechaniky, žádné srovnávání s ostatními** —
  interpretace wellbeingu jen vůči vlastnímu průměru.

## Přístupnost

- **Platformní UI.** iOS podle Apple HIG (nativní navigation bar s velkým titulkem, systémový
  tab bar, SF Symbols, action sheety), Android podle Android design guidelines / Material 3
  (top app bar, navigation bar, Material Symbols, ripple, dialogy). Vzhled sleduje systém —
  světlý i tmavý režim, žádný vlastní přepínač.
- **Kontrast.** Každý barevný pár z `src/theme/contrastPairs.ts` musí v obou režimech projít
  WCAG 2.2 AA (text 4,5:1, ne-textové prvky 3:1) — hlídá `test/contrast.test.ts`. Informace
  nikdy jen barvou (tvar stavu, fajfka u výběru, text u stavu).
- **Písmo.** Veškerý text jde přes `ds/Text`: varianty mapují iOS text styles (Dynamic Type) a
  Material type scale; Bricolage Grotesque jen pro titulky, tělo textu systémový font. Limity
  škálování jen tam, kde to layout vyžaduje (tlačítka 2×, chipy 1,6×, badge 1,5×).
- **Dotykové cíle** ≥ 44 pt (iOS) / 48 dp (Android), řádky seznamu 56 dp na Androidu.
- **Čtečky obrazovky.** Nadpisy mají roli `header`, stav nesou `accessibilityState` /
  `accessibilityValue` (ne text labelu), změny obsahu oznamuje `announce()` z `src/lib/a11y.ts`
  (fáze dechu, odpočet, posun otázky, uložení, výsledek zálohy). Ke každému gestu existuje
  tlačítko nebo `accessibilityActions` (smazání štítku, ukončení Dechu naslepo).
- **Hinty.** `accessibilityHint` jen tam, kde výsledek akce neplyne z labelu (pravidlo
  `react-native-a11y/has-accessibility-hint` je vypnuté záměrně).
- **Neuložená práce.** Zavření rozepsaného check-inu, dotazníku nebo editace plánu se nejdřív
  zeptá (`src/lib/useDiscardGuard.ts`); návrat o krok zpět uvnitř úlohy ne.
- **Haptika** je doplněk (nikdy jediný kanál) a dá se vypnout v Nastavení.

## Soukromí

Záznamy se ukládají **jen do telefonu**, do SQLite šifrované SQLCipherem
(emoční záznamy = zvláštní kategorie dle čl. 9 GDPR); klíč drží
Keychain/Keystore (expo-secure-store) a nikdy neopouští zařízení. Žádný
backend, žádná telemetrie. Přepínač „Data pro výzkum“ je výhradně opt-in,
default vypnuto — a zatím nic neodesílá; je to připravené UI pro budoucí
anonymní export. Záloha v Nastavení exportuje **nešifrovaný** JSON — o jeho
bezpečné uložení se stará uživatel (appka to říká rovnou v kartě zálohy).

## Adaptace na Expo / React Native

- Tokeny DS žijí v `design/tokens/*.json` (Style Dictionary, `cd design &&
npm run build`) a generují se do `src/theme/tokens.generated.ts` — CI hlídá,
  že vygenerovaný soubor odpovídá. `src/theme/` nad nimi staví světlé a tmavé
  schéma (`ThemeProvider`, `useTheme`, `createThemedStyles`), platformní
  konstanty (dotykové cíle 44/48, okraje 20/16) a kontrastní manifest.
- Text: jediná komponenta `ds/Text` s variantami (largeTitle … caption2,
  label, kicker) mapovanými na iOS text styles (`dynamicTypeRamp`) a Material
  type scale; Bricolage Grotesque 600/700 jen pro titulky, tělo textu systémový
  font (SF Pro / Roboto). RN `Text` je v obrazovkách zakázaný lintem.
- Ikony: `ds/Icon` kreslí SF Symbols na iOS a Material Symbols na Androidu
  (`expo-symbols`), Lucide na webu — jedna mapa názvů.
- Navigace: nativní stack (`expo-router`) s hlavičkami podle platformy
  (velké titulky, systémové Zpět bez textu, položky lišty přes
  `src/components/HeaderItems.tsx`), nativní taby
  (`expo-router/unstable-native-tabs`); horní i spodní insety řeší navigátor,
  `Screen` používá `contentInsetAdjustmentBehavior`.
- Zpětná vazba stisku podle platformy (`src/ds/press.ts`): Android ripple,
  iOS opacita. Dialogy a action sheety podle platformy (`src/lib/dialogs.ts`).
- Dechový kruh animuje `Animated` API a respektuje systémovou redukci pohybu
  (listener `reduceMotionChanged`); fáze oznamuje haptika i čtečka.
- Tvary stavů a wellbeing ring kreslí `react-native-svg`; slider intenzity je
  `@react-native-community/slider`; segmented control je na iOS nativní
  (`@react-native-segmented-control`), na Androidu Material segmented buttons.
- `tel:` odkazy otevírá `Linking.openURL`; tlačítka s `href` mají roli `link`.
- Ikona aplikace a splash se generují z `assets/lumi-mark.svg`
  (`assets/icon.png`, `adaptive-icon.png`, `splash-icon.png`, `favicon.png`).

## Co zatím není (další kroky)

- **Audio soubory** klidových aktivit (Tichá louka, Večerka) — přehrávač je
  připravený, položky bez souboru mají badge „připravujeme“; po dodání stačí
  doplnit `file` v `src/features/calm/content.ts` (viz `assets/audio/`).
- **iOS State of Mind** (zápis nálad do Apple Zdraví) — knihovna ho zatím
  nepodporuje, takže je za feature flagem a zdokumentovaný v
  `docs/state-of-mind.md`.
- **Rozcestník „Co dělat, když…“** a chat Linky bezpečí čekají na obsah
  (`src/features/help/guides.ts`); do té doby se v Pomoci nezobrazují.
- **Znění dotazníků** WHO-5 / PHQ-9 / GAD-7 ověřit proti validovaným českým
  verzím (v kódu označeno `TODO(Anna)`); podepsat ověření linek
  (`docs/cz-crisis-data-checklist.md` — 116 111, 116 123, 116 006,
  606 021 021) a doplnit skutečné logo.
- **Nativní ověření na dev buildu:** šifrování DB na disku, haptika,
  notifikace, keep-awake u Dechu naslepo, tisk PDF kartičky a celý průchod
  podle `docs/device-verification.md` (TalkBack/VoiceOver, 200 % písmo,
  tmavý režim, gesta, Liquid Glass na iOS 26).

## Struktura

```
app.json           Expo konfigurace (ikony, splash, plugins, web manifest)
app/               expo-router: routes (_layout, (tabs)/(home|calm|stats|help),
                   onboarding, checkin, measure/[type], calm/[id], handover,
                   settings, crisis, +not-found)
design/            tokeny DS (Style Dictionary) → src/theme/tokens.generated.ts
drizzle/           vygenerované SQL migrace + journal
assets/            logo, generované ikony, audio/ (manifest cvičení)
docs/              STATUS, ADR, pilot build, device-verification, state-of-mind
src/
  theme/           generované tokeny, světlé/tmavé schéma, kontrastní manifest
  model.ts         doménové typy, slovník, agregace, doporučení, WHO-5 texty
  store.tsx        profil/preference (paměť + settings tabulka)
  ds/              DS komponenty (Text, Button, Card, Chip, Input, Switch,
                   Icon, SegmentedControl, RadioRow, ListItem, …)
  components/      sdílené prvky (Screen, Header, HeaderItems, MoodShape,
                   Breath, navigation)
  db/              SQLite + SQLCipher + Drizzle: schema, connect, repo, hooks,
                   provider, migrateLegacy (z AsyncStorage), backup
  features/        feature-first obrazovky a logika: checkin, calm, measure,
                   stats, help, onboarding, home, settings
  lib/             a11y, dialogs, haptics, motion, useDiscardGuard, featureFlags
test/              jest-expo (Android preset) + @testing-library/react-native
                   (vč. expo-router testing-library); helpers/testDb =
                   better-sqlite3 v paměti; mocks/ = JS náhrada nativních tabů
```
