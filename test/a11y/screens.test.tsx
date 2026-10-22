/* The accessibility audit of every screen and state of the app under the Android preset. The
   router renders each route with a seeded database (an onboarded profile, entries, measurements
   and a crisis plan), the test waits for the first heading and then runs the audit of
   test/a11y/audit.ts over the host tree. The expectation is an empty list of violations; the
   message names the rule, the path and the element. */
import { act, userEvent, waitFor } from "@testing-library/react-native";
import { renderRouter, screen } from "expo-router/testing-library";
import { CALM_ACTIVITIES } from "../../src/features/calm/content";
import { PLAN_SECTION_KEYS } from "../../src/features/help/plan";
import { INSTRUMENTS } from "../../src/features/measure/definitions";
import i18n from "../../src/i18n";
import { toISODate } from "../../src/model";
import { insertEntry, insertMeasurement, setSetting, writeProfile } from "../../src/db/repo";
import { getTestDb } from "../helpers/testDb";
import { auditTree, formatViolations } from "./audit";

/* 48 dp: the Android preset (ADR 0007). iOS asks for 44 pt. */
const AUDIT = { minTouch: 48 };

function seedOnboarded(): void {
  const db = getTestDb();
  writeProfile(db, { onboarded: true, name: "Janko", age: "u26", share: false });
  const today = toISODate();
  const entries = [
    { mood: "napeti", words: ["stress", "worry"], tags: ["school"], time: "8:30" },
    { mood: "klid", words: ["ease"], tags: ["sleep"], time: "13:10" },
    { mood: "energie", words: ["joy"], tags: [], time: "18:45" },
  ] as const;
  entries.forEach((e, i) =>
    insertEntry(db, {
      id: `audit-entry-${i}`,
      date: today,
      time: e.time,
      mood: e.mood,
      intensity: 3,
      words: [...e.words],
      tags: [...e.tags],
      note: "",
    }),
  );
  insertMeasurement(db, {
    id: "audit-who5",
    type: "who5",
    score: 64,
    date: today,
    answers: INSTRUMENTS.who5.questions.map(() => 3),
  });
  insertMeasurement(db, {
    id: "audit-phq9",
    type: "phq9",
    score: 6,
    date: today,
    answers: INSTRUMENTS.phq9.questions.map((_, i) => (i < 6 ? 1 : 0)),
  });
  setSetting(db, PLAN_SECTION_KEYS.signals, "Špatně spím a nechce se mi ven.");
  setSetting(db, PLAN_SECTION_KEYS.helps, "Projít se, zavolat Elišce.");
  setSetting(db, PLAN_SECTION_KEYS.contacts, "Eliška 777 000 000");
}

/* The screen is ready when it shows a heading. A screen without a heading fails here with the
   header rule of the audit, which is the intended message. */
async function ready(): Promise<void> {
  await waitFor(() => expect(screen.queryAllByRole("header").length).toBeGreaterThan(0), {
    timeout: 10_000,
  });
}

function expectClean(state: string): void {
  const report = auditTree(screen.toJSON(), AUDIT);
  expect(formatViolations(report.violations).map((line) => `${state}: ${line}`)).toEqual([]);
}

async function open(initialUrl: string): Promise<void> {
  await renderRouter("app", { initialUrl });
  await ready();
}

describe("accessibility audit of the screens (Android, 48 dp)", () => {
  describe("before the onboarding", () => {
    it.each(["/onboarding", "/onboarding/age", "/onboarding/privacy", "/crisis"])(
      "%s has no violations",
      async (url) => {
        await open(url);
        expectClean(url);
      },
    );
  });

  describe("after the onboarding", () => {
    beforeEach(seedOnboarded);

    it.each([
      "/",
      "/calm",
      "/stats",
      "/reflection",
      "/help",
      "/plan/signals",
      "/plan/helps",
      "/plan/contacts",
      "/settings",
      "/handover",
      "/crisis",
      "/not-a-route",
      "/checkin",
      "/measure/who5",
      "/measure/phq9",
      "/measure/gad7",
    ])("%s has no violations", async (url) => {
      await open(url);
      expectClean(url);
    });

    it.each(CALM_ACTIVITIES.map((a) => `/calm/${a.id}`))("%s has no violations", async (url) => {
      await open(url);
      expectClean(url);
    });

    it("the check-in words and confirmation steps have no violations", async () => {
      const user = userEvent.setup();
      await open("/checkin");
      await user.press(screen.getByRole("radio", { name: /Napětí/ }));
      await user.press(screen.getByRole("button", { name: i18n.t("common:actions.continue") }));
      expect(await screen.findByText(i18n.t("checkin:step2.title"))).toBeOnTheScreen();
      expectClean("/checkin/words");

      await user.press(screen.getByRole("button", { name: i18n.t("content:words.stress") }));
      await user.press(screen.getByRole("button", { name: i18n.t("checkin:step2.save") }));
      expect(await screen.findByText(i18n.t("checkin:confirm.title"))).toBeOnTheScreen();
      expectClean("/checkin/confirm");
    });

    it("the questionnaire question and result have no violations", async () => {
      const user = userEvent.setup();
      await open("/measure/phq9");
      /* The disclaimer first, then the questions, then the result. */
      await user.press(screen.getByRole("button", { name: i18n.t("common:actions.continue") }));
      const total = INSTRUMENTS.phq9.questions.length;
      expect(
        await screen.findByText(i18n.t("measure:question.progress", { number: 1, total })),
      ).toBeOnTheScreen();
      expectClean("/measure/phq9 question");
      const first = INSTRUMENTS.phq9.options[0].label;
      for (let n = 1; n <= total; n++) {
        expect(
          await screen.findByText(i18n.t("measure:question.progress", { number: n, total })),
        ).toBeOnTheScreen();
        /* The double-tap lockout of the screen waits 250 ms between answers. */
        await act(async () => {
          jest.advanceTimersByTime(300);
        });
        await user.press(screen.getByRole("button", { name: first }));
      }
      expect(await screen.findByText(i18n.t("measure:result.title"))).toBeOnTheScreen();
      expectClean("/measure/phq9 result");
    });
  });
});
