/* The weekly reflection: the window in which the card is visible, and the range of the week
   that the reflection covers. The card in the overview shows from Sunday 17:00 to the end of
   Monday. */
import { toISODate, type ISODate } from "../../model";

export function isReflectionWindowOpen(now: Date): boolean {
  const day = now.getDay(); // 0 = Sunday, 1 = Monday
  return (day === 0 && now.getHours() >= 17) || day === 1;
}

export interface ReflectionRange {
  from: ISODate;
  to: ISODate;
}

/** The range of the reflected week (Monday to Sunday): on Sunday the current week, on every
    other day (Monday, or a direct open of the route) the last complete week. */
export function reflectionWeekRange(now: Date): ReflectionRange {
  const monday = new Date(now);
  const fromMondayOffset = (now.getDay() + 6) % 7; // Monday = 0 ... Sunday = 6
  monday.setDate(now.getDate() - fromMondayOffset);
  if (now.getDay() !== 0) monday.setDate(monday.getDate() - 7); // not Sunday: the last week
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  return { from: toISODate(monday), to: toISODate(sunday) };
}
