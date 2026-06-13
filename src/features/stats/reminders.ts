/* Lokální připomínky (expo-notifications) — jen plánované lokální
   notifikace, žádný push token, žádná zmínka o zmeškání. Texty gentle
   a rodově neutrální, rotují podle dne v týdnu. O povolení se žádá až
   při zapnutí přepínače, nikdy při startu aplikace.

   Pozn.: expo-notifications NEbylo zrušeno — v SDK 53+ jen zmizela
   vzdálená push notifikace z Expo Go (Android). Lokální plánované
   notifikace (tohle) fungují v development buildu, který appka stejně
   potřebuje kvůli SQLCipheru. V Expo Go se objeví varování a notifikace
   se nenaplánuje — proto vždy testovat na dev buildu. */
import { Platform } from "react-native";
import * as Notifications from "expo-notifications";

export const REMINDER_ENABLED_KEY = "reminder-enabled";
export const REMINDER_TIME_KEY = "reminder-time"; // { hour, minute }
export const EVENING_ENABLED_KEY = "reminder-evening-enabled";
export const WEEKLY_ENABLED_KEY = "reminder-weekly-enabled";

export interface ReminderTime {
  hour: number;
  minute: number;
}

export const DEFAULT_REMINDER_TIME: ReminderTime = { hour: 19, minute: 0 };

/* rotace přes dny v týdnu — žádná vina, žádné zmeškání */
export const REMINDER_TEXTS = [
  "Chvilka pro tebe?",
  "Jak je ti dnes?",
  "Lumi je tu, kdyby bylo potřeba se zastavit.",
];

const DAILY_ID_PREFIX = "lumi-reminder-";
const EVENING_ID = "lumi-evening";
const WEEKLY_ID = "lumi-weekly-reflection";

let handlerSet = false;
function ensureHandler(): void {
  if (handlerSet || Platform.OS === "web") return;
  handlerSet = true;
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: false,
      shouldSetBadge: false,
    }),
  });
}

/** Požádá o povolení (volat výhradně při zapnutí togglu). */
export async function requestReminderPermission(): Promise<boolean> {
  if (Platform.OS === "web") return false;
  ensureHandler();
  try {
    const current = await Notifications.getPermissionsAsync();
    if (current?.granted) return true;
    const asked = await Notifications.requestPermissionsAsync();
    return !!asked?.granted;
  } catch {
    return false;
  }
}

async function cancelByIds(ids: string[]): Promise<void> {
  await Promise.all(
    ids.map((id) => Notifications.cancelScheduledNotificationAsync(id).catch(() => {})),
  );
}

/** Naplánuje denní připomínku: 7 týdenních notifikací s rotujícími texty. */
export async function scheduleDailyReminder(time: ReminderTime): Promise<void> {
  await cancelDailyReminder();
  for (let weekday = 1; weekday <= 7; weekday++) {
    await Notifications.scheduleNotificationAsync({
      identifier: `${DAILY_ID_PREFIX}${weekday}`,
      content: { title: "Lumi", body: REMINDER_TEXTS[(weekday - 1) % REMINDER_TEXTS.length] },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
        weekday, // 1 = neděle … 7 = sobota
        hour: time.hour,
        minute: time.minute,
      },
    });
  }
}

export async function cancelDailyReminder(): Promise<void> {
  await cancelByIds(Array.from({ length: 7 }, (_, i) => `${DAILY_ID_PREFIX}${i + 1}`));
}

/** Volitelná Večerka ve 21:00 — pozvání ke klidnému usínání. */
export async function scheduleEveningReminder(): Promise<void> {
  await cancelEveningReminder();
  await Notifications.scheduleNotificationAsync({
    identifier: EVENING_ID,
    content: { title: "Lumi", body: "Večerka — klidné usínání, kdyby se hodilo." },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour: 21,
      minute: 0,
    },
  });
}

export async function cancelEveningReminder(): Promise<void> {
  await cancelByIds([EVENING_ID]);
}

/** Volitelné nedělní ohlédnutí za týdnem (17:00). */
export async function scheduleWeeklyReflection(): Promise<void> {
  await cancelWeeklyReflection();
  await Notifications.scheduleNotificationAsync({
    identifier: WEEKLY_ID,
    content: { title: "Lumi", body: "Ohlédnutí za týdnem je připravené." },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
      weekday: 1, // neděle
      hour: 17,
      minute: 0,
    },
  });
}

export async function cancelWeeklyReflection(): Promise<void> {
  await cancelByIds([WEEKLY_ID]);
}
