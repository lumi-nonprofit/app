/* Feature flagy experimentů. Zapínat až po ověření na zařízení. */

/** iOS State of Mind (Apple Zdraví): zápis nálad z check-inu.
    Záměrně NEIMPLEMENTOVÁNO — knihovna @kingstinct/react-native-healthkit
    State of Mind zatím nepodporuje; zjištění a plán viz docs/state-of-mind.md.
    Flag existuje, aby budoucí integrace měla jedno místo zapnutí. */
export const STATE_OF_MIND_ENABLED = false;

/** M1 walking-skeleton obrazovka (/m1-checkin) nad Rust trezorem.
    Vypnuto: app/_layout.tsx routu odstraní a nativní modul lumi-vault se
    do buildu nelinkuje (package.json → expo.autolinking.exclude).
    Zapnutí = odebrat lumi-vault z exclude a postavit Rust knihovnu podle
    modules/lumi-vault/RUNBOOK.md. Do buildu pro testery nezapínat
    (výchozí PIN, ADR 0004 (e), docs/STATUS.md). */
export const M1_VAULT_SKELETON_ENABLED = false;
