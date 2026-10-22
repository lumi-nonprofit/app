/* The window of the weekly reflection (Sunday 17:00 to Monday) and the range of the week. */
import { isReflectionWindowOpen, reflectionWeekRange } from "../src/features/stats/reflection";

describe("isReflectionWindowOpen", () => {
  it("opens on Sunday at 17:00, stays open all Monday, and is closed on other days", () => {
    expect(isReflectionWindowOpen(new Date("2026-06-14T16:59:00"))).toBe(false); // Sunday
    expect(isReflectionWindowOpen(new Date("2026-06-14T17:00:00"))).toBe(true);
    expect(isReflectionWindowOpen(new Date("2026-06-15T08:00:00"))).toBe(true); // Monday
    expect(isReflectionWindowOpen(new Date("2026-06-15T23:30:00"))).toBe(true);
    expect(isReflectionWindowOpen(new Date("2026-06-16T10:00:00"))).toBe(false); // Tuesday
    expect(isReflectionWindowOpen(new Date("2026-06-12T19:00:00"))).toBe(false); // Friday
  });
});

describe("reflectionWeekRange", () => {
  it("reflects the week that ends on Sunday (Monday to Sunday)", () => {
    expect(reflectionWeekRange(new Date("2026-06-14T18:00:00"))).toEqual({
      from: "2026-06-08",
      to: "2026-06-14",
    });
  });
  it("reflects the last week on Monday", () => {
    expect(reflectionWeekRange(new Date("2026-06-15T09:00:00"))).toEqual({
      from: "2026-06-08",
      to: "2026-06-14",
    });
  });
  it("reflects the last complete week outside the window (a direct open)", () => {
    expect(reflectionWeekRange(new Date("2026-06-17T12:00:00"))).toEqual({
      from: "2026-06-08",
      to: "2026-06-14",
    });
  });
});
