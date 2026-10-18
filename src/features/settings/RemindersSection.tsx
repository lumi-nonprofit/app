/* Reminders (Settings): the daily invitation to write an entry as a local notification (the
   scheduling lives in ./reminders), the optional evening reminder and the Sunday reflection.
   All of it is opt-in, off by default; the app asks for the notification permission when the
   person turns the switch on (HIG Privacy: in the context of the feature). After a refusal, a
   button leads to the system settings. No blame, no streaks. The times of the evening and the
   weekly reminders come from the constants in ./reminders and go through formatTime. */
import React from "react";
import { Platform, Pressable, View } from "react-native";
import DateTimePicker, { type DateTimePickerEvent } from "@react-native-community/datetimepicker";
import { Button, Card, Icon, Switch, Text } from "../../ds";
import { pressFeedback, pressedStyle } from "../../ds/press";
import { SectionLabel } from "../../components/Header";
import { useDb } from "../../db/provider";
import { useDbWriter } from "../../db/hooks";
import { getSetting, setSetting } from "../../db/repo";
import { currentLocale, useTranslation } from "../../i18n";
import { formatTime, uses24Hour } from "../../i18n/format";
import { announce } from "../../lib/a11y";
import {
  DEFAULT_REMINDER_TIME,
  EVENING_ENABLED_KEY,
  EVENING_TIME,
  REMINDER_ENABLED_KEY,
  REMINDER_TIME_KEY,
  WEEKLY_ENABLED_KEY,
  WEEKLY_REFLECTION_TIME,
  cancelDailyReminder,
  cancelEveningReminder,
  cancelWeeklyReflection,
  openSystemNotificationSettings,
  requestReminderPermission,
  scheduleDailyReminder,
  scheduleEveningReminder,
  scheduleWeeklyReflection,
  type ReminderTime,
} from "./reminders";
import { createThemedStyles, useTheme } from "../../theme";

export default function RemindersSection() {
  const { t } = useTranslation("settings");
  const db = useDb();
  const write = useDbWriter();
  const theme = useTheme();
  const styles = useStyles();

  /* The state of the switches lives in the settings table; the initial values come from a direct read. */
  const [enabled, setEnabled] = React.useState<boolean>(
    () => getSetting<boolean>(db, REMINDER_ENABLED_KEY) ?? false,
  );
  const [time, setTime] = React.useState<ReminderTime>(
    () => getSetting<ReminderTime>(db, REMINDER_TIME_KEY) ?? DEFAULT_REMINDER_TIME,
  );
  const [evening, setEvening] = React.useState<boolean>(
    () => getSetting<boolean>(db, EVENING_ENABLED_KEY) ?? false,
  );
  const [weekly, setWeekly] = React.useState<boolean>(
    () => getSetting<boolean>(db, WEEKLY_ENABLED_KEY) ?? false,
  );
  const [denied, setDenied] = React.useState(false);
  const [picking, setPicking] = React.useState(false);

  const toggleMain = async (value: boolean): Promise<void> => {
    if (!value) {
      /* The switch off also cancels the dependent notifications. Their options stay saved and
         come back with the next switch on (a hidden switch must not keep its notifications alive). */
      setEnabled(false);
      setPicking(false);
      write((d) => setSetting(d, REMINDER_ENABLED_KEY, false));
      await Promise.all([cancelDailyReminder(), cancelEveningReminder(), cancelWeeklyReflection()]);
      return;
    }
    const granted = await requestReminderPermission();
    if (!granted) {
      /* Without the permission the switch stays off: an explanation without blame and a path to the system. */
      setDenied(true);
      announce(t("reminders.denied.announce"));
      return;
    }
    setDenied(false);
    await scheduleDailyReminder(time);
    /* The dependent reminders that were on before come back. */
    if (evening) await scheduleEveningReminder();
    if (weekly) await scheduleWeeklyReflection();
    setEnabled(true);
    write((d) => setSetting(d, REMINDER_ENABLED_KEY, true));
  };

  const applyTime = (next: ReminderTime): void => {
    setTime(next);
    write((d) => setSetting(d, REMINDER_TIME_KEY, next));
    if (enabled) void scheduleDailyReminder(next);
  };

  const onPickTime = (event: DateTimePickerEvent, date?: Date): void => {
    /* The Android dialog closes after each action; the iOS spinner stays open. */
    if (Platform.OS === "android") setPicking(false);
    if (event.type === "set" && date) {
      applyTime({ hour: date.getHours(), minute: date.getMinutes() });
    }
  };

  const toggleEvening = async (value: boolean): Promise<void> => {
    setEvening(value);
    write((d) => setSetting(d, EVENING_ENABLED_KEY, value));
    if (value) await scheduleEveningReminder();
    else await cancelEveningReminder();
  };

  const toggleWeekly = async (value: boolean): Promise<void> => {
    setWeekly(value);
    write((d) => setSetting(d, WEEKLY_ENABLED_KEY, value));
    if (value) await scheduleWeeklyReflection();
    else await cancelWeeklyReflection();
  };

  const timeLabel = t("reminders.time.label", { time: formatTime(time) });
  const weeklyTime = formatTime(WEEKLY_REFLECTION_TIME);

  return (
    <View>
      <SectionLabel>{t("reminders.title")}</SectionLabel>
      <Card style={styles.card}>
        <Switch
          checked={enabled}
          onChange={(v) => void toggleMain(v)}
          label={t("reminders.daily.label")}
          description={t("reminders.daily.description")}
          accessibilityHint={t("reminders.daily.a11yHint")}
        />

        {denied ? (
          <View style={styles.denied}>
            <Text variant="subheadline">{t("reminders.denied.text")}</Text>
            <Button variant="secondary" size="sm" onPress={openSystemNotificationSettings}>
              {t("reminders.denied.openSettings")}
            </Button>
          </View>
        ) : null}

        <Pressable
          accessibilityRole="button"
          accessibilityLabel={timeLabel}
          accessibilityHint={picking ? t("reminders.time.closeHint") : t("reminders.time.openHint")}
          onPress={() => setPicking((p) => !p)}
          {...pressFeedback(theme)}
          style={({ pressed }) => [styles.timeRow, pressedStyle(theme, pressed)]}
        >
          <Text variant="body" weight="semibold" color="textStrong">
            {timeLabel}
          </Text>
          <Icon name="chevron-right" size={18} color={theme.colors.textOnSunken} />
        </Pressable>

        {picking ? (
          <DateTimePicker
            value={new Date(2000, 0, 1, time.hour, time.minute)}
            mode="time"
            is24Hour={uses24Hour()}
            locale={currentLocale()}
            display={Platform.OS === "ios" ? "spinner" : "default"}
            onChange={onPickTime}
          />
        ) : null}

        {enabled ? (
          <View style={styles.subToggles}>
            <Switch
              checked={evening}
              onChange={(v) => void toggleEvening(v)}
              label={t("reminders.evening.label", { time: formatTime(EVENING_TIME) })}
              description={t("reminders.evening.description")}
              accessibilityHint={t("reminders.evening.a11yHint")}
            />
            <Switch
              checked={weekly}
              onChange={(v) => void toggleWeekly(v)}
              label={t("reminders.weekly.label")}
              description={t("reminders.weekly.description", { time: weeklyTime })}
              accessibilityHint={t("reminders.weekly.a11yHint", { time: weeklyTime })}
            />
          </View>
        ) : null}

        <Text variant="footnote" color="textMuted">
          {t("reminders.footer")}
        </Text>
      </Card>
    </View>
  );
}

const useStyles = createThemedStyles((t) => ({
  card: { marginTop: 6, gap: 12 },
  denied: { gap: 10 },
  /* The time row: a sunken background and an arrow, so the tap target is not only a colour. */
  timeRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
    minHeight: t.platform.minTouch,
    paddingHorizontal: 14,
    borderRadius: t.radius.sm,
    backgroundColor: t.colors.surfaceSunken,
    overflow: "hidden",
  },
  subToggles: { gap: 12 },
}));
