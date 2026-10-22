/* Reminders in Settings: the daily invitation schedules 7 weekly notifications and saves the
   setting, the switch off cancels them; without the permission the switch stays off.
   expo-notifications is a mock: the tests check the scheduling and the persistence, not the
   behaviour of the OS. */
import * as Notifications from "expo-notifications";
// The enum comes from the real expo-modules-core (the mock of expo-notifications does not carry it).
import { PermissionStatus } from "expo-modules-core";
import { fireEvent, userEvent, waitFor } from "@testing-library/react-native";
import { renderRouter, screen } from "expo-router/testing-library";
import { EVENING_ENABLED_KEY, REMINDER_ENABLED_KEY } from "../src/features/settings/reminders";
import { getSetting } from "../src/db/repo";
import { getTestDb } from "./helpers/testDb";

jest.mock("expo-notifications", () => ({
  setNotificationHandler: jest.fn(),
  getPermissionsAsync: jest.fn(async () => ({ granted: true })),
  requestPermissionsAsync: jest.fn(async () => ({ granted: true })),
  scheduleNotificationAsync: jest.fn(async () => "id"),
  cancelScheduledNotificationAsync: jest.fn(async () => undefined),
  setNotificationChannelAsync: jest.fn(async () => null),
  SchedulableTriggerInputTypes: { DAILY: "daily", WEEKLY: "weekly" },
  AndroidImportance: { DEFAULT: 3 },
  AndroidNotificationVisibility: { PRIVATE: 0, PUBLIC: 1, SECRET: -1 },
}));

const scheduleMock = jest.mocked(Notifications.scheduleNotificationAsync);
const cancelMock = jest.mocked(Notifications.cancelScheduledNotificationAsync);

type User = ReturnType<typeof userEvent.setup>;

async function finishOnboarding(user: User): Promise<void> {
  expect(await screen.findByText("Ahoj, tady Lumi.")).toBeOnTheScreen();
  await user.type(screen.getByLabelText(/Jak ti říkat/), "Janko");
  await user.press(screen.getByRole("button", { name: "Začít" }));
  await user.press(screen.getByRole("radio", { name: /do 26 let/ }));
  await user.press(screen.getByRole("button", { name: "Pokračovat" }));
  await user.press(screen.getByRole("button", { name: "Hotovo" }));
  expect(await screen.findByText("Jak se dnes cítíš?")).toBeOnTheScreen();
}

async function openSettings(user: User): Promise<void> {
  await user.press(screen.getByRole("button", { name: "Nastavení" }));
  expect(await screen.findByText("Připomínky")).toBeOnTheScreen();
}

describe("Reminders", () => {
  beforeEach(() => {
    /* The mocks from the module factory do not follow restoreAllMocks: the test clears the calls by hand. */
    jest.clearAllMocks();
  });

  it("schedules 7 weekly notifications and saves the setting; the switch off cancels them", async () => {
    const user = userEvent.setup();
    await renderRouter("app");
    await finishOnboarding(user);
    await openSettings(user);

    const toggle = screen.getByRole("switch", { name: "Denní připomínka" });
    expect(toggle).not.toBeChecked();
    // The dependent options are visible only after the main switch is on.
    expect(screen.queryByRole("switch", { name: "Večerka ve 21:00" })).toBeNull();

    await fireEvent(toggle, "valueChange", true);
    await waitFor(() =>
      expect(screen.getByRole("switch", { name: "Denní připomínka" })).toBeChecked(),
    );

    // 7 weekly notifications (one for each day) at the default 19:00, on Android in the
    // channel "Připomínky" (a private view on the lock screen).
    expect(scheduleMock).toHaveBeenCalledTimes(7);
    expect(scheduleMock.mock.calls.map(([req]) => req.trigger)).toEqual(
      Array.from({ length: 7 }, (_, i) => ({
        type: "weekly",
        weekday: i + 1,
        hour: 19,
        minute: 0,
        channelId: "reminders",
      })),
    );
    expect(Notifications.setNotificationChannelAsync).toHaveBeenCalledWith(
      "reminders",
      expect.objectContaining({
        importance: Notifications.AndroidImportance.DEFAULT,
        lockscreenVisibility: Notifications.AndroidNotificationVisibility.PRIVATE,
      }),
    );
    expect(getSetting<boolean>(getTestDb(), REMINDER_ENABLED_KEY)).toBe(true);
    expect(screen.getByRole("switch", { name: "Večerka ve 21:00" })).toBeOnTheScreen();
    expect(screen.getByRole("switch", { name: "Nedělní ohlédnutí za týdnem" })).toBeOnTheScreen();

    cancelMock.mockClear();
    await fireEvent(screen.getByRole("switch", { name: "Denní připomínka" }), "valueChange", false);
    await waitFor(() =>
      expect(screen.getByRole("switch", { name: "Denní připomínka" })).not.toBeChecked(),
    );
    // The module cancels all 7 daily notifications and the setting is off.
    await waitFor(() =>
      expect(cancelMock.mock.calls.map(([id]) => id)).toEqual(
        expect.arrayContaining(Array.from({ length: 7 }, (_, i) => `lumi-reminder-${i + 1}`)),
      ),
    );
    expect(getSetting<boolean>(getTestDb(), REMINDER_ENABLED_KEY)).toBe(false);
  });

  it("keeps the switch off and shows an explanation without the permission", async () => {
    const deniedResponse: Notifications.NotificationPermissionsStatus = {
      granted: false,
      canAskAgain: false,
      expires: "never",
      status: PermissionStatus.DENIED,
    };
    jest.mocked(Notifications.getPermissionsAsync).mockResolvedValueOnce(deniedResponse);
    jest.mocked(Notifications.requestPermissionsAsync).mockResolvedValueOnce(deniedResponse);

    const user = userEvent.setup();
    await renderRouter("app");
    await finishOnboarding(user);
    await openSettings(user);

    await fireEvent(screen.getByRole("switch", { name: "Denní připomínka" }), "valueChange", true);

    expect(await screen.findByText(/Bez povolení notifikací to nepůjde/)).toBeOnTheScreen();
    expect(screen.getByRole("switch", { name: "Denní připomínka" })).not.toBeChecked();
    expect(scheduleMock).not.toHaveBeenCalled();
    expect(getSetting<boolean>(getTestDb(), REMINDER_ENABLED_KEY)).not.toBe(true);
  });

  it("schedules the evening reminder daily at 21:00 and saves the setting", async () => {
    const user = userEvent.setup();
    await renderRouter("app");
    await finishOnboarding(user);
    await openSettings(user);

    await fireEvent(screen.getByRole("switch", { name: "Denní připomínka" }), "valueChange", true);
    await waitFor(() =>
      expect(screen.getByRole("switch", { name: "Denní připomínka" })).toBeChecked(),
    );

    scheduleMock.mockClear();
    await fireEvent(screen.getByRole("switch", { name: "Večerka ve 21:00" }), "valueChange", true);
    await waitFor(() => expect(scheduleMock).toHaveBeenCalledTimes(1));
    expect(scheduleMock).toHaveBeenCalledWith(
      expect.objectContaining({
        identifier: "lumi-evening",
        trigger: { type: "daily", hour: 21, minute: 0, channelId: "reminders" },
      }),
    );
    expect(getSetting<boolean>(getTestDb(), EVENING_ENABLED_KEY)).toBe(true);
  });
});
