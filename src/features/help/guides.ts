/* Krátké návody „Co dělat, když…“ a chat Linky bezpečí. Obsah zatím není
   hotový — sekce se v Pomoci vykreslí, až tu něco bude (žádné mrtvé řádky
   s chevronem). Chat Linky bezpečí přibude jako `url`, až bude ověřená
   adresa a hodiny (docs/cz-crisis-data-checklist.md). */
import type { IconName } from "../../ds/Icon";

export interface Guide {
  id: string;
  icon: IconName;
  title: string;
  subtitle: string;
  /** Krátké kroky zobrazené po otevření; prázdné = návod se nenabízí. */
  steps: readonly string[];
}

export const GUIDES: readonly Guide[] = [];

export interface ChatLine {
  name: string;
  url: string;
  meta: string;
}

/** Chat Linky bezpečí: doplnit ověřenou adresu a hodiny; do té doby se nenabízí. */
export const CHAT_LINES: readonly ChatLine[] = [];
