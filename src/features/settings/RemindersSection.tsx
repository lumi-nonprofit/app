/* Připomínky (Nastavení): denní pozvání k zápisu jako lokální notifikace
   (plánování viz ./reminders), volitelná Večerka a nedělní ohlédnutí.
   Vše opt-in s výchozím stavem vypnuto; o povolení notifikací se žádá až
   při zapnutí přepínače (HIG Privacy: v kontextu funkce). Při zamítnutí
   vede tlačítko do systémového nastavení. Žádné výčitky, žádné streaky. */
import React from "react";
import { Platform, Pressable, View } from "react-native";
import DateTimePicker, { type DateTimePickerEvent } from "@react-native-community/datetimepicker";
import { Button, Card, Icon, Switch, Text } from "../../ds";
import { pressFeedback, pressedStyle } from "../../ds/press";
import { SectionLabel } from "../../components/Header";
import { useDb } from "../../db/provider";
import { useDbWriter } from "../../db/hooks";
import { getSetting, setSetting } from "../../db/repo";
import { announce } from "../../lib/a11y";
import {
  DEFAULT_REMINDER_TIME,
  EVENING_ENABLED_KEY,
  REMINDER_ENABLED_KEY,
  REMINDER_TIME_KEY,
  WEEKLY_ENABLED_KEY,
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

/** { hour: 19, minute: 0 } → "19:00" */
const formatTime = (t: ReminderTime): string => `${t.hour}:${String(t.minute).padStart(2, "0")}`;

export default function RemindersSection() {
  const db = useDb();
  const write = useDbWriter();
  const theme = useTheme();
  const styles = useStyles();

  /* stav přepínačů žije v settings tabulce — inicializace přímým čtením */
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
      /* vypnutí ruší i podřízené notifikace — jejich volby zůstávají uložené
         a při dalším zapnutí se obnoví (skrytý přepínač nesmí dál pípat) */
      setEnabled(false);
      setPicking(false);
      write((d) => setSetting(d, REMINDER_ENABLED_KEY, false));
      await Promise.all([cancelDailyReminder(), cancelEveningReminder(), cancelWeeklyReflection()]);
      return;
    }
    const granted = await requestReminderPermission();
    if (!granted) {
      /* bez povolení přepínač zůstává vypnutý; vysvětlení bez výčitek + cesta do systému */
      setDenied(true);
      announce("Bez povolení notifikací to nepůjde. Povol je v nastavení systému.");
      return;
    }
    setDenied(false);
    await scheduleDailyReminder(time);
    /* obnova dřív zapnutých podřízených připomínek */
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
    /* Android dialog se zavírá při každé akci; iOS spinner zůstává otevřený */
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

  return (
    <View>
      <SectionLabel>Připomínky</SectionLabel>
      <Card style={styles.card}>
        <Switch
          checked={enabled}
          onChange={(v) => void toggleMain(v)}
          label="Denní připomínka"
          description="Jemné pozvání k zápisu, jednou denně."
          accessibilityHint="Naplánuje každodenní jemné pozvání k zápisu."
        />

        {denied ? (
          <View style={styles.denied}>
            <Text variant="subheadline">
              Bez povolení notifikací to nepůjde — povol je v nastavení systému.
            </Text>
            <Button variant="secondary" size="sm" onPress={openSystemNotificationSettings}>
              Otevřít nastavení systému
            </Button>
          </View>
        ) : null}

        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Čas: ${formatTime(time)}`}
          accessibilityHint={
            picking ? "Zavře výběr času připomínky." : "Otevře výběr času denní připomínky."
          }
          onPress={() => setPicking((p) => !p)}
          {...pressFeedback(theme)}
          style={({ pressed }) => [styles.timeRow, pressedStyle(theme, pressed)]}
        >
          <Text variant="body" weight="semibold" color="textStrong">
            Čas: {formatTime(time)}
          </Text>
          <Icon name="chevron-right" size={18} color={theme.colors.textOnSunken} />
        </Pressable>

        {picking ? (
          <DateTimePicker
            value={new Date(2000, 0, 1, time.hour, time.minute)}
            mode="time"
            is24Hour
            locale="cs"
            display={Platform.OS === "ios" ? "spinner" : "default"}
            onChange={onPickTime}
          />
        ) : null}

        {enabled ? (
          <View style={styles.subToggles}>
            <Switch
              checked={evening}
              onChange={(v) => void toggleEvening(v)}
              label="Večerka ve 21:00"
              description="Pozvání ke klidnému usínání."
              accessibilityHint="Každý večer pozvání ke klidnému usínání."
            />
            <Switch
              checked={weekly}
              onChange={(v) => void toggleWeekly(v)}
              label="Nedělní ohlédnutí za týdnem"
              description="V neděli v 17:00."
              accessibilityHint="Každou neděli v 17:00 pozvání k ohlédnutí za týdnem."
            />
          </View>
        ) : null}

        <Text variant="footnote" color="textMuted">
          Jen jemné pozvání — žádné výčitky, když zápis vynecháš. Na zamčené obrazovce se text
          nezobrazuje.
        </Text>
      </Card>
    </View>
  );
}

const useStyles = createThemedStyles((t) => ({
  card: { marginTop: 6, gap: 12 },
  denied: { gap: 10 },
  /* řádek s časem: sunken pozadí + šipka = klikatelnost není jen barvou */
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
