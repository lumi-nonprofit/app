/* Local reminders (expo-notifications; the options live in Settings): only scheduled local
   notifications, no push token, no mention of a missed entry. The texts are gentle and gender
   neutral and rotate by the day of the week; the module reads them from the catalog at schedule
   time, in the active language. The app asks for the permission when the person turns the switch
   on, never at the start.

   Note: expo-notifications is not deprecated. In SDK 53 and later only the remote push
   notification left Expo Go (Android). Local scheduled notifications (this module) work in the
   development build, which the app needs anyway because of SQLCipher. In Expo Go a warning
   appears and the module does not schedule the notification, so always test on a development
   build. */
import { Linking, Platform } from "react-native";
import * as Notifications from "expo-notifications";
import i18n from "../../i18n";

export const REMINDER_ENABLED_KEY = "reminder-enabled";
export const REMINDER_TIME_KEY = "reminder-time"; // { hour, minute }
export const EVENING_ENABLED_KEY = "reminder-evening-enabled";
export const WEEKLY_ENABLED_KEY = "reminder-weekly-enabled";

export interface ReminderTime {
  hour: number;
  minute: number;
}

export const DEFAULT_REMINDER_TIME: ReminderTime = { hour: 19, minute: 0 };
/** The fixed time of the optional evening reminder. */
export const EVENING_TIME: ReminderTime = { hour: 21, minute: 0 };
/** The weekly reflection runs on Sunday (expo-notifications WEEKLY: 1 = Sunday, 7 = Saturday). */
export const WEEKLY_REFLECTION_WEEKDAY = 1;
export const WEEKLY_REFLECTION_TIME: ReminderTime = { hour: 17, minute: 0 };

/* The rotation over the days of the week: no blame, no missed entry. */
function dailyTexts(): string[] {
  return [
    i18n.t("settings:reminders.notification.dailyMoment"),
    i18n.t("settings:reminders.notification.dailyHowAreYou"),
    i18n.t("settings:reminders.notification.dailyHere"),
  ];
}

/* Android: an own channel with the default importance and a private view on the lock screen.
   Content about mental health never shows on the lock screen (Android guides: notifications,
   lock-screen visibility private). */
export const REMINDER_CHANNEL_ID = "reminders";
let channelReady = false;
async function ensureChannel(): Promise<void> {
  if (channelReady || Platform.OS !== "android") return;
  channelReady = true;
  try {
    await Notifications.setNotificationChannelAsync(REMINDER_CHANNEL_ID, {
      name: i18n.t("settings:reminders.notification.channelName"),
      importance: Notifications.AndroidImportance.DEFAULT,
      lockscreenVisibility: Notifications.AndroidNotificationVisibility.PRIVATE,
      enableVibrate: false,
      sound: null,
    });
  } catch {
    channelReady = false;
  }
}
const channelId = Platform.OS === "android" ? REMINDER_CHANNEL_ID : undefined;

/** After a refusal of the permission, the only path leads through the system settings. */
export function openSystemNotificationSettings(): void {
  Linking.openSettings().catch(() => {});
}

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

/** Asks for the permission (call it only when the person turns the switch on). */
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

/** Schedules the daily reminder: 7 weekly notifications with the texts in rotation. */
export async function scheduleDailyReminder(time: ReminderTime): Promise<void> {
  await cancelDailyReminder();
  await ensureChannel();
  const texts = dailyTexts();
  const title = i18n.t("common:appName");
  for (let weekday = 1; weekday <= 7; weekday++) {
    await Notifications.scheduleNotificationAsync({
      identifier: `${DAILY_ID_PREFIX}${weekday}`,
      content: { title, body: texts[(weekday - 1) % texts.length] },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
        /* expo-notifications WEEKLY: 1 = Sunday, 7 = Saturday (JS Date.getDay(): 0 = Sunday, 6 = Saturday). */
        weekday,
        hour: time.hour,
        minute: time.minute,
        channelId,
      },
    });
  }
}

export async function cancelDailyReminder(): Promise<void> {
  await cancelByIds(Array.from({ length: 7 }, (_, i) => `${DAILY_ID_PREFIX}${i + 1}`));
}

/** The optional evening reminder (EVENING_TIME): an invitation to calm sleep. */
export async function scheduleEveningReminder(): Promise<void> {
  await cancelEveningReminder();
  await ensureChannel();
  await Notifications.scheduleNotificationAsync({
    identifier: EVENING_ID,
    content: {
      title: i18n.t("common:appName"),
      body: i18n.t("settings:reminders.notification.evening"),
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour: EVENING_TIME.hour,
      minute: EVENING_TIME.minute,
      channelId,
    },
  });
}

export async function cancelEveningReminder(): Promise<void> {
  await cancelByIds([EVENING_ID]);
}

/** The optional Sunday reflection on the week (WEEKLY_REFLECTION_TIME). */
export async function scheduleWeeklyReflection(): Promise<void> {
  await cancelWeeklyReflection();
  await ensureChannel();
  await Notifications.scheduleNotificationAsync({
    identifier: WEEKLY_ID,
    content: {
      title: i18n.t("common:appName"),
      body: i18n.t("settings:reminders.notification.weekly"),
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
      weekday: WEEKLY_REFLECTION_WEEKDAY,
      hour: WEEKLY_REFLECTION_TIME.hour,
      minute: WEEKLY_REFLECTION_TIME.minute,
      channelId,
    },
  });
}

export async function cancelWeeklyReflection(): Promise<void> {
  await cancelByIds([WEEKLY_ID]);
}
