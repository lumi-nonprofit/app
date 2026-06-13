# Lumi

Česká aplikace pro podporu duševní pohody — check-in emocí, klidová cvičení,
přehledy a pomoc v krizi. Zdarma, neziskově, česky.

Implementace vychází z high-fidelity prototypu **„Lumi Prototyp“** z Claude
Designu (handoff z 12. 6. 2026) a z **Lumi design systemu** (tokeny v
`src/theme.ts` jsou převzaté 1:1, komponenty v `src/ds/` odpovídají DS bundle).
Nativní mobilní aplikace v **Expo / React Native** (iOS, Android, web přes
react-native-web), návrhový rozměr 390×844, světlý režim.

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
`npx expo export` pro web).

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

Kontroly: `npm test`, `npm run typecheck`, `npm run lint`, `npx expo-doctor`.

## Co je hotové

- **Onboarding (3 obrazovky):** jméno → věkové pásmo (určuje primární
  krizovou linku) → soukromí. Bez tab baru.
- **Dnes:** pozdrav podle denní doby, dominantní check-in karta (po dnešním
  zápisu se změní na shrnutí), wellbeing index z reálných dat, „Pro tebe“
  (jeden zdroj doporučení), krizová karta.
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
- **Přehledy:** týden/měsíc jako tečky, wellbeing index, **insights**
  („Co se ukazuje“ — deskriptivní vzorce), **týdenní reflexe**, **připomínky**
  (lokální notifikace, default vypnuto), **záloha** (export/import JSON),
  přepínač „Data pro výzkum“ (default vypnuto).
- **Pomoc:** krizové linky s `tel:` odkazy, trvalý řádek 155/112, editovatelný
  krizový plán + **tisk kartičky do peněženky** (PDF), rychlé zklidnění,
  režim **„Podej telefon“** pro třetí osobu, rozcestník, kontakty.

Spodní navigace: **Dnes · Klid · Check-in (+) · Přehledy · Pomoc**.

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

## Soukromí

Záznamy se ukládají **jen do telefonu**, do SQLite šifrované SQLCipherem
(emoční záznamy = zvláštní kategorie dle čl. 9 GDPR); klíč drží
Keychain/Keystore (expo-secure-store) a nikdy neopouští zařízení. Starší
data z AsyncStorage (klíč `lumi-app-v1`) se při prvním startu jednorázově
přelijí do databáze. Žádný backend, žádná telemetrie. Přepínač „Data pro
výzkum“ je výhradně opt-in, default vypnuto — a zatím nic neodesílá; je to
připravené UI pro budoucí anonymní export. Záloha v Přehledech exportuje
**nešifrovaný** JSON — o jeho bezpečné uložení se stará uživatel (appka to
říká rovnou v kartě zálohy).

## Adaptace na Expo / React Native

- CSS tokeny DS jsou převedené 1:1 do `src/theme.ts` (barvy, spacing, rádiusy,
  typografie, stíny, motion). RN Text nedědí styly, proto theme nabízí helpery
  `font.display(weight)` / `font.body(weight)` (statické řezy fontů),
  `leading.*` a `tracking.*` (převod em/unitless hodnot na body).
- Ikony: `lucide-react-native` (stejná sada jako CDN substituce deklarovaná
  v DS), stroke 1.75; `currentColor` v RN není — barva se předává explicitně.
- Fonty: Bricolage Grotesque + Instrument Sans přes `@expo-google-fonts/*`
  a `expo-font`; nahradit self-hosted, až budou brand fonty.
- Safe-area insety řeší `react-native-safe-area-context`; poslední karta
  zůstává celá viditelná nad tab barem.
- Dechový kruh animuje `Animated` API a respektuje systémové nastavení
  redukce pohybu (`AccessibilityInfo.isReduceMotionEnabled`).
- Tab bar je bez backdrop-bluru (web měl `backdrop-filter`), místo toho
  téměř neprůhledná krémová výplň.
- Tvary stavů a wellbeing ring kreslí `react-native-svg`; slider intenzity je
  `@react-native-community/slider`.
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
- **Rozcestník „Co dělat, když…“** a chat Linky bezpečí jsou navržené
  rozcestníky bez cílových obrazovek.
- **Znění dotazníků** WHO-5 / PHQ-9 / GAD-7 ověřit proti validovaným českým
  verzím (v kódu označeno `TODO(Anna)`); ověřit telefonní linky a provozní
  doby (116 111, 116 123, 606 021 021) a doplnit skutečné logo.
- **Nativní ověření na dev buildu:** šifrování DB na disku, haptika,
  notifikace, keep-awake u Dechu naslepo, tisk PDF kartičky.

## Struktura

```
app.json           Expo konfigurace (ikony, splash, plugins, web manifest)
app/               expo-router: routes (_layout, (tabs), onboarding, checkin,
                   measure/[type], calm/[id], plan/[section], handover, …)
drizzle/           vygenerované SQL migrace + journal
assets/            logo, generované ikony, audio/ (manifest cvičení)
docs/              poznámky (state-of-mind.md)
src/
  theme.ts         tokeny DS 1:1 (barvy, typografie, spacing, stíny, motion)
  model.ts         doménové typy, slovník, agregace, doporučení, WHO-5 texty
  store.tsx        profil/preference (paměť + settings tabulka)
  ds/              DS komponenty (Button, Card, Chip, Input, Switch, Icon, …)
  components/      sdílené prvky (MoodShape, Header, CTA, Breath, TabBar, …)
  db/              SQLite + SQLCipher + Drizzle: schema, connect, repo, hooks,
                   provider, migrateLegacy (z AsyncStorage), backup
  features/        feature-first obrazovky a logika:
                   checkin, calm, measure, stats, help, onboarding, home
  lib/             haptics, featureFlags
test/              jest-expo + @testing-library/react-native (vč. expo-router
                   testing-library); helpers/testDb = better-sqlite3 v paměti
```
