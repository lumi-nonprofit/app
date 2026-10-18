/* Potvrzovací dialogy podle platformy.
   iOS (HIG Action sheets): volby k úmyslné akci = action sheet, destruktivní
   volba nahoře, „Zrušit“ dole. Android (Android guides): systémový dialog,
   „Zrušit“ nikdy jako výchozí. Web: window.confirm. Všechny varianty vrací
   Promise<boolean> — true = uživatel akci potvrdil. */
import { ActionSheetIOS, Alert, Platform } from "react-native";

export interface ConfirmOptions {
  /** Titulek popisuje situaci („Zahodit rozepsaný zápis?“), ne „Chyba“. */
  title: string;
  message?: string;
  /** Sloveso, které popisuje výsledek („Zahodit“, „Smazat“), nikdy „OK“. */
  confirmLabel: string;
  cancelLabel?: string;
  /** Akce ničí data, která si člověk nevybral úmyslně → červený styl. */
  destructive?: boolean;
}

export function confirm({
  title,
  message,
  confirmLabel,
  cancelLabel = "Zrušit",
  destructive = false,
}: ConfirmOptions): Promise<boolean> {
  return new Promise((resolve) => {
    if (Platform.OS === "ios") {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          title,
          message,
          options: [confirmLabel, cancelLabel],
          destructiveButtonIndex: destructive ? 0 : undefined,
          cancelButtonIndex: 1,
        },
        (index) => resolve(index === 0),
      );
      return;
    }
    if (Platform.OS === "web") {
      const g = globalThis as { confirm?: (text: string) => boolean };
      resolve(
        typeof g.confirm === "function"
          ? g.confirm([title, message].filter(Boolean).join("\n"))
          : false,
      );
      return;
    }
    Alert.alert(
      title,
      message,
      [
        { text: cancelLabel, style: "cancel", onPress: () => resolve(false) },
        {
          text: confirmLabel,
          style: destructive ? "destructive" : "default",
          onPress: () => resolve(true),
        },
      ],
      { cancelable: true, onDismiss: () => resolve(false) },
    );
  });
}

/** Zahození rozpracované práce (check-in, dotazník, krizový plán). */
export function confirmDiscard(
  opts: Partial<ConfirmOptions> & { title: string; confirmLabel?: string },
): Promise<boolean> {
  return confirm({ confirmLabel: "Zahodit", destructive: true, ...opts });
}

/** Smazání položky (vlastní štítek apod.). */
export function confirmDelete(
  opts: Partial<ConfirmOptions> & { title: string; confirmLabel?: string },
): Promise<boolean> {
  return confirm({ confirmLabel: "Smazat", destructive: true, ...opts });
}
