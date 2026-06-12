/* Připomínky v Přehledech: denní pozvání k zápisu jako lokální notifikace
   (plánování viz ./reminders), volitelná Večerka a nedělní ohlédnutí.
   Vše opt-in s výchozím stavem vypnuto; o povolení notifikací se žádá až
   při zapnutí přepínače. Žádné výčitky, žádné streaky — jen jemné pozvání. */
import React from "react";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";
import DateTimePicker, { type DateTimePickerEvent } from "@react-native-community/datetimepicker";
import { Card, Icon, Switch } from "../../ds/index";
import { SectionLabel } from "../../components/Header";
import { useDb } from "../../db/provider";
import { useDbWriter } from "../../db/hooks";
import { getSetting, setSetting } from "../../db/repo";
import {
  DEFAULT_REMINDER_TIME,
  EVENING_ENABLED_KEY,
  REMINDER_ENABLED_KEY,
  REMINDER_TIME_KEY,
  WEEKLY_ENABLED_KEY,
  cancelDailyReminder,
  cancelEveningReminder,
  cancelWeeklyReflection,
  requestReminderPermission,
  scheduleDailyReminder,
  scheduleEveningReminder,
  scheduleWeeklyReflection,
  type ReminderTime,
} from "./reminders";
import { colors, font, leading, palette, radius, type } from "../../theme";

/** { hour: 19, minute: 0 } → "19:00" */
const formatTime = (t: ReminderTime): string => `${t.hour}:${String(t.minute).padStart(2, "0")}`;

export default function RemindersCard() {
  const db = useDb();
  const write = useDbWriter();

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
      /* bez povolení přepínač zůstává vypnutý; vysvětlení bez výčitek */
      setDenied(true);
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
      <SectionLabel>Připomínka</SectionLabel>
      <Card style={styles.card}>
        <Switch
          checked={enabled}
          onChange={(v) => void toggleMain(v)}
          label="Denní připomínka"
          accessibilityHint="Naplánuje každodenní jemné pozvání k zápisu."
        />

        {denied ? (
          <Text style={styles.denied}>
            Bez povolení notifikací to nepůjde — povol je v nastavení systému.
          </Text>
        ) : null}

        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Čas: ${formatTime(time)}`}
          accessibilityHint={
            picking ? "Zavře výběr času připomínky." : "Otevře výběr času denní připomínky."
          }
          onPress={() => setPicking((p) => !p)}
          style={({ pressed }) => [styles.timeRow, pressed ? styles.timeRowPressed : null]}
        >
          <Text style={styles.timeLabel}>Čas: {formatTime(time)}</Text>
          <Icon name="chevron-right" size={18} color={palette.ink500} />
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
              accessibilityHint="Každý večer pozvání ke klidnému usínání."
            />
            <Switch
              checked={weekly}
              onChange={(v) => void toggleWeekly(v)}
              label="Nedělní ohlédnutí za týdnem"
              accessibilityHint="Každou neděli v 17:00 pozvání k ohlédnutí za týdnem."
            />
          </View>
        ) : null}

        <Text style={styles.note}>Jen jemné pozvání — žádné výčitky, když zápis vynecháš.</Text>
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { marginTop: 6, gap: 12 },
  denied: {
    ...font.body(400),
    fontSize: type.sm,
    lineHeight: leading.body(type.sm),
    color: palette.ink700,
  },
  /* řádek s časem: sunken pozadí + šipka = klikatelnost není jen barvou */
  timeRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    minHeight: 44,
    paddingHorizontal: 14,
    borderRadius: radius.sm,
    backgroundColor: colors.surfaceSunken,
  },
  timeRowPressed: { transform: [{ scale: 0.99 }] },
  timeLabel: { ...font.body(600), fontSize: type.base, color: colors.textStrong },
  subToggles: { gap: 12 },
  note: {
    ...font.body(400),
    fontSize: type.xs,
    lineHeight: leading.body(type.xs),
    color: palette.ink500,
  },
});
