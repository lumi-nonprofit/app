/* Připomínky v Přehledech: zapnutí denního pozvání naplánuje 7 týdenních
   notifikací a uloží nastavení, vypnutí je zruší; bez povolení zůstává
   přepínač vypnutý. expo-notifications je mockované — testy ověřují
   plánování a persistenci, ne chování OS. */
import * as Notifications from "expo-notifications";
// enum bereme z nemockovaného expo-modules-core (mock expo-notifications ho nenese)
import { PermissionStatus } from "expo-modules-core";
import { fireEvent, userEvent, waitFor } from "@testing-library/react-native";
import { renderRouter, screen } from "expo-router/testing-library";
import { EVENING_ENABLED_KEY, REMINDER_ENABLED_KEY } from "../src/features/stats/reminders";
import { getSetting } from "../src/db/repo";
import { getTestDb } from "./helpers/testDb";

jest.mock("expo-notifications", () => ({
  setNotificationHandler: jest.fn(),
  getPermissionsAsync: jest.fn(async () => ({ granted: true })),
  requestPermissionsAsync: jest.fn(async () => ({ granted: true })),
  scheduleNotificationAsync: jest.fn(async () => "id"),
  cancelScheduledNotificationAsync: jest.fn(async () => undefined),
  SchedulableTriggerInputTypes: { DAILY: "daily", WEEKLY: "weekly" },
}));

const scheduleMock = jest.mocked(Notifications.scheduleNotificationAsync);
const cancelMock = jest.mocked(Notifications.cancelScheduledNotificationAsync);

type User = ReturnType<typeof userEvent.setup>;

async function finishOnboarding(user: User): Promise<void> {
  expect(await screen.findByText("Ahoj, tady Lumi.")).toBeOnTheScreen();
  await user.type(screen.getByLabelText(/Jak ti máme říkat/), "Janko");
  await user.press(screen.getByRole("button", { name: "Pokračovat" }));
  await user.press(screen.getByRole("radio", { name: /do 26 let/ }));
  await user.press(screen.getByRole("button", { name: "Pokračovat" }));
  await user.press(screen.getByRole("button", { name: "Rozumím, jdeme na to" }));
  expect(await screen.findByText("Jak se dnes cítíš?")).toBeOnTheScreen();
}

async function openStats(user: User): Promise<void> {
  await user.press(screen.getByRole("button", { name: "Přehledy" }));
  expect(await screen.findByText("Tvůj týden")).toBeOnTheScreen();
}

describe("Připomínky", () => {
  beforeEach(() => {
    /* mocky z module factory nepodléhají restoreAllMocks — čistíme volání ručně */
    jest.clearAllMocks();
  });

  it("zapnutí naplánuje 7 týdenních notifikací a uloží nastavení; vypnutí zruší", async () => {
    const user = userEvent.setup();
    await renderRouter("app");
    await finishOnboarding(user);
    await openStats(user);

    const toggle = screen.getByRole("switch", { name: "Denní připomínka" });
    expect(toggle).not.toBeChecked();
    // podřízené volby jsou vidět až po zapnutí hlavního přepínače
    expect(screen.queryByRole("switch", { name: "Večerka ve 21:00" })).toBeNull();

    await fireEvent(toggle, "valueChange", true);
    await waitFor(() =>
      expect(screen.getByRole("switch", { name: "Denní připomínka" })).toBeChecked(),
    );

    // 7 týdenních notifikací (po jedné pro každý den) ve výchozích 19:00
    expect(scheduleMock).toHaveBeenCalledTimes(7);
    expect(scheduleMock.mock.calls.map(([req]) => req.trigger)).toEqual(
      Array.from({ length: 7 }, (_, i) => ({
        type: "weekly",
        weekday: i + 1,
        hour: 19,
        minute: 0,
      })),
    );
    expect(getSetting<boolean>(getTestDb(), REMINDER_ENABLED_KEY)).toBe(true);
    expect(screen.getByRole("switch", { name: "Večerka ve 21:00" })).toBeOnTheScreen();
    expect(screen.getByRole("switch", { name: "Nedělní ohlédnutí za týdnem" })).toBeOnTheScreen();

    cancelMock.mockClear();
    await fireEvent(screen.getByRole("switch", { name: "Denní připomínka" }), "valueChange", false);
    await waitFor(() =>
      expect(screen.getByRole("switch", { name: "Denní připomínka" })).not.toBeChecked(),
    );
    // všech 7 denních notifikací je zrušených, nastavení vypnuté
    await waitFor(() =>
      expect(cancelMock.mock.calls.map(([id]) => id)).toEqual(
        expect.arrayContaining(Array.from({ length: 7 }, (_, i) => `lumi-reminder-${i + 1}`)),
      ),
    );
    expect(getSetting<boolean>(getTestDb(), REMINDER_ENABLED_KEY)).toBe(false);
  });

  it("bez povolení zůstává přepínač vypnutý a zobrazí se vysvětlení", async () => {
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
    await openStats(user);

    await fireEvent(screen.getByRole("switch", { name: "Denní připomínka" }), "valueChange", true);

    expect(await screen.findByText(/Bez povolení notifikací to nepůjde/)).toBeOnTheScreen();
    expect(screen.getByRole("switch", { name: "Denní připomínka" })).not.toBeChecked();
    expect(scheduleMock).not.toHaveBeenCalled();
    expect(getSetting<boolean>(getTestDb(), REMINDER_ENABLED_KEY)).not.toBe(true);
  });

  it("Večerka: zapnutí naplánuje denní notifikaci ve 21:00 a uloží nastavení", async () => {
    const user = userEvent.setup();
    await renderRouter("app");
    await finishOnboarding(user);
    await openStats(user);

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
        trigger: { type: "daily", hour: 21, minute: 0 },
      }),
    );
    expect(getSetting<boolean>(getTestDb(), EVENING_ENABLED_KEY)).toBe(true);
  });
});
