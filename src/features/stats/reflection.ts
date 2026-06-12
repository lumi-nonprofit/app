/* Týdenní reflexe — okno viditelnosti a rozsah reflektovaného týdne.
   Karta v Přehledech se ukazuje od neděle 17:00 do konce pondělí. */
import { toISODate, type ISODate } from "../../model";

export function isReflectionWindowOpen(now: Date): boolean {
  const day = now.getDay(); // 0 = neděle, 1 = pondělí
  return (day === 0 && now.getHours() >= 17) || day === 1;
}

export interface ReflectionRange {
  from: ISODate;
  to: ISODate;
}

/** Rozsah reflektovaného týdne (Po–Ne): v neděli aktuální týden,
    jinak (pondělí i přímé otevření routy) naposledy dokončený týden. */
export function reflectionWeekRange(now: Date): ReflectionRange {
  const monday = new Date(now);
  const fromMondayOffset = (now.getDay() + 6) % 7; // Po=0 … Ne=6
  monday.setDate(now.getDate() - fromMondayOffset);
  if (now.getDay() !== 0) monday.setDate(monday.getDate() - 7); // mimo neděli minulý týden
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  return { from: toISODate(monday), to: toISODate(sunday) };
}
