# Lumi

Česká aplikace pro podporu duševní pohody — check-in emocí, klidová cvičení,
přehledy a pomoc v krizi. Zdarma, neziskově, česky.

Implementace vychází z high-fidelity prototypu **„Lumi Prototyp“** z Claude
Designu (handoff z 12. 6. 2026) a z **Lumi design systemu** (tokeny v
`src/theme.js` jsou převzaté 1:1, komponenty v `src/ds/` odpovídají DS bundle).
Nativní mobilní aplikace v **Expo / React Native** (iOS, Android, web přes
react-native-web), návrhový rozměr 390×844, světlý režim.

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

## Co je hotové

- **Onboarding (3 obrazovky):** jméno → věkové pásmo (určuje primární
  krizovou linku) → soukromí. Bez tab baru.
- **Dnes:** pozdrav podle denní doby, dominantní check-in karta (po dnešním
  zápisu se změní na shrnutí), wellbeing index, „Pro tebe“, krizová karta.
- **Check-in:** krok 1 (stav + intenzita 1–5) → krok 2 (slova 1–2, kontextové
  štítky, nepovinná poznámka) → potvrzení s kontextovým tipem podle stavu.
- **Klid:** dechový kruh (4 s nádech / 4 s výdech, respektuje systémovou
  redukci pohybu), seznam aktivit, Večerka.
- **Přehledy:** týden/měsíc jako tečky, wellbeing index s kadencí 14 dní,
  přepínač „Data pro výzkum“ (default vypnuto).
- **Pomoc:** krizové linky s `tel:` odkazy, trvalý řádek 155/112, krizový
  plán, rychlé zklidnění, rozcestník „Co dělat, když…“, kontakty.

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

Záznamy se ukládají **jen do telefonu** (AsyncStorage, klíč `lumi-app-v1`).
Žádný backend, žádná telemetrie. Přepínač „Data pro výzkum“ je výhradně
opt-in, default vypnuto — a zatím nic neodesílá; je to připravené UI pro
budoucí anonymní export.

## Adaptace na Expo / React Native

- CSS tokeny DS jsou převedené 1:1 do `src/theme.js` (barvy, spacing, rádiusy,
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

- **WHO-5 dotazník** — obrazovka nebyla součástí návrhu. Datový model je
  připravený (`who5: [{ score, date }]` ve storu), karty wellbeingu všechny
  stavy už umí; „Vyplnit první dotazník“ zatím vede na Přehledy.
- **Detailní obsah** — aktivity v Klidu (audio/meditace), sekce krizového
  plánu, rozcestník „Co dělat, když…“ a chat Linky bezpečí jsou navržené
  rozcestníky bez cílových obrazovek.
- **Před ostrým nasazením ověřit** telefonní linky a provozní doby
  (116 111, 116 123, 606 021 021) a doplnit skutečné logo.

## Struktura

```
index.js           vstup (registerRootComponent)
app.json           Expo konfigurace (ikony, splash, web manifest)
assets/            logo + generované ikony aplikace
src/
  theme.js         tokeny DS 1:1 (barvy, typografie, spacing, stíny, motion)
  ds/              DS komponenty (Button, Card, Chip, Input, Switch, …)
  components/      sdílené prvky (MoodShape, Header, CTA, Breath, TabBar,
                   Screen, LumiMark)
  screens/         Onboarding, Home, Checkin, Calm, Stats, Help
  model.js         stavy, slovník, agregace týdne/měsíce, WHO-5 texty
  store.js         persistovaný stav (AsyncStorage)
  App.jsx          routing a propojení flow
test/              jest-expo + @testing-library/react-native
```
