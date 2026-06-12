/* Dotazníkové nástroje: WHO-5, PHQ-9, GAD-7 — všechny volně použitelné,
   všechny se ptají na poslední 2 týdny (kadence 14 dní).
   Znění otázek i škál vychází ze standardních českých verzí nástrojů;
   validace přesného znění před releasem viz TODO(Anna) níže. Tvar (a)
   drží rodovou neutralitu způsobem běžným v tištěných verzích. */
import type { MeasurementType } from "../../db/repo";

export interface AnswerOption {
  label: string;
  value: number;
}

export interface Instrument {
  type: MeasurementType;
  title: string;
  /** Rámec otázek — zobrazuje se nad každou kartou otázky. */
  intro: string;
  questions: string[];
  options: AnswerOption[];
  maxScore: number;
}

/* škála frekvence pro PHQ-9 i GAD-7 (0–3) */
// TODO(Anna): ověřit znění proti validované české verzi před releasem
const FREQUENCY_OPTIONS: AnswerOption[] = [
  { label: "Vůbec ne", value: 0 },
  { label: "Několik dní", value: 1 },
  { label: "Více než polovinu dní", value: 2 },
  { label: "Téměř každý den", value: 3 },
];

/* škála WHO-5 (0–5, od „Nikdy“ po „Po celou dobu“) */
// TODO(Anna): ověřit znění proti validované české verzi před releasem
const WHO5_OPTIONS: AnswerOption[] = [
  { label: "Po celou dobu", value: 5 },
  { label: "Většinu času", value: 4 },
  { label: "Více než polovinu času", value: 3 },
  { label: "Méně než polovinu času", value: 2 },
  { label: "Občas", value: 1 },
  { label: "Nikdy", value: 0 },
];

// TODO(Anna): ověřit znění proti validované české verzi před releasem
const WHO5_QUESTIONS = [
  "Cítil(a) jsem se veselý(á) a v dobré náladě.",
  "Cítil(a) jsem se klidný(á) a uvolněný(á).",
  "Cítil(a) jsem se aktivní a plný(á) energie.",
  "Když jsem se probudil(a), cítil(a) jsem se svěží a odpočinutý(á).",
  "Můj každodenní život byl naplněný věcmi, které mě zajímají.",
];

// TODO(Anna): ověřit znění proti validované české verzi před releasem
const PHQ9_QUESTIONS = [
  "Malý zájem nebo potěšení z věcí, které děláš",
  "Pokleslá nálada, sklíčenost nebo beznaděj",
  "Problémy s usínáním, přerušovaný spánek, nebo naopak nadměrné spaní",
  "Pocit únavy nebo nedostatku energie",
  "Nechutenství nebo přejídání",
  "Špatné mínění o sobě — pocit, že jsi selhal(a) nebo zklamal(a) sebe či své blízké",
  "Problémy se soustředěním, třeba při čtení nebo sledování videa",
  "Zpomalené pohyby či řeč, kterých si všimli ostatní — nebo naopak neklid a přecházení",
  "Myšlenky na to, že by bylo lepší nežít, nebo na to, že si ublížíš",
];

/** Index otázky PHQ-9 o myšlenkách na smrt / sebepoškození (od nuly). */
export const PHQ9_RISK_QUESTION_INDEX = 8;

// TODO(Anna): ověřit znění proti validované české verzi před releasem
const GAD7_QUESTIONS = [
  "Pocit nervozity, úzkosti nebo napětí",
  "Neschopnost zastavit obavy nebo je mít pod kontrolou",
  "Nadměrné obavy z různých věcí",
  "Potíže se uvolnit",
  "Takový neklid, že je těžké vydržet v klidu sedět",
  "Snadná podrážděnost nebo mrzutost",
  "Strach, že se stane něco hrozného",
];

export const INSTRUMENTS: Record<MeasurementType, Instrument> = {
  who5: {
    type: "who5",
    title: "Wellbeing index",
    intro: "Jak ti bylo posledních 14 dní?",
    questions: WHO5_QUESTIONS,
    options: WHO5_OPTIONS,
    maxScore: 100,
  },
  phq9: {
    type: "phq9",
    title: "Nálada do hloubky",
    intro: "Jak často tě v posledních 2 týdnech trápilo následující?",
    questions: PHQ9_QUESTIONS,
    options: FREQUENCY_OPTIONS,
    maxScore: 27,
  },
  gad7: {
    type: "gad7",
    title: "Napětí a obavy do hloubky",
    intro: "Jak často tě v posledních 2 týdnech trápilo následující?",
    questions: GAD7_QUESTIONS,
    options: FREQUENCY_OPTIONS,
    maxScore: 21,
  },
};

export const MEASUREMENT_TYPES: MeasurementType[] = ["who5", "phq9", "gad7"];

export function isMeasurementType(v: string | undefined): v is MeasurementType {
  return v === "who5" || v === "phq9" || v === "gad7";
}
