/* Short guides ("Co dělat, když…") and the chat of Linka bezpečí. The content is not ready yet:
   Help renders the section only when it has items (no dead rows with a chevron). The chat of
   Linka bezpečí comes as a `url` once someone checks the address and the hours
   (docs/cz-crisis-data-checklist.md). When the content arrives, its text belongs in the message
   catalog (the `content` namespace, read through getters like the lines), not in this module. */
import type { IconName } from "../../ds/Icon";

export interface Guide {
  id: string;
  icon: IconName;
  title: string;
  subtitle: string;
  /** Short steps that the guide shows after it opens; an empty list hides the guide. */
  steps: readonly string[];
}

export const GUIDES: readonly Guide[] = [];

export interface ChatLine {
  name: string;
  url: string;
  meta: string;
}

/** The chat of Linka bezpečí: add the checked address and hours; until then Help does not offer it. */
export const CHAT_LINES: readonly ChatLine[] = [];
