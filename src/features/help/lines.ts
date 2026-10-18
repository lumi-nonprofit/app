/* Krizové a podpůrné linky — jeden zdroj pro Pomoc (seznam kontaktů), tísňová
   čísla a popisky. Primární/sekundární linku podle věku drží HELP_LINES
   v modelu (sdílí ji onboarding, dotazník i nouzové obrazovky). Hodiny a čísla
   se ověřují per release podle docs/cz-crisis-data-checklist.md. */
import type { Tone } from "../../ds";
import type { IconName } from "../../ds/Icon";

export interface ContactLine {
  id: string;
  name: string;
  /** Telefon tak, jak se zobrazuje; `href` z něj vznikne bez mezer. */
  phone: string;
  meta: string;
  icon: IconName;
  tone: Tone;
}

export const telHref = (phone: string): string => `tel:${phone.replace(/\s/g, "")}`;

export const CONTACT_LINES: readonly ContactLine[] = [
  {
    id: "linka-bezpeci",
    name: "Linka bezpečí",
    phone: "116 111",
    meta: "nonstop, zdarma · děti a studenti do 26 let",
    icon: "phone",
    tone: "danger",
  },
  {
    id: "lppp",
    name: "Linka první psychické pomoci",
    phone: "116 123",
    meta: "nonstop, zdarma · dospělí",
    icon: "phone",
    tone: "danger",
  },
  {
    id: "obetem",
    name: "Linka pomoci obětem",
    phone: "116 006",
    meta: "nonstop, zdarma · pro oběti násilí a trestných činů",
    icon: "phone",
    tone: "danger",
  },
  {
    id: "rodicovska",
    name: "Rodičovská linka",
    phone: "606 021 021",
    meta: "Po–Čt 9–21 · Pá 9–17 · rodiče a blízcí dětí · běžný tarif",
    icon: "phone",
    tone: "info",
  },
];

/** Tísňová čísla — vždy volatelná, bez ohledu na věk a profil. */
export const EMERGENCY_LINES: readonly ContactLine[] = [
  {
    id: "zachranka",
    name: "155 · Záchranná služba",
    phone: "155",
    meta: "při bezprostředním ohrožení života",
    icon: "phone",
    tone: "danger",
  },
  {
    id: "tisen",
    name: "112 · Tísňová linka",
    phone: "112",
    meta: "jednotné evropské číslo, i bez SIM",
    icon: "phone",
    tone: "danger",
  },
];
