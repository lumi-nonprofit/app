/* Okno týdenní reflexe (neděle 17:00 → pondělí) a rozsah týdne. */
import { isReflectionWindowOpen, reflectionWeekRange } from "../src/features/stats/reflection";

describe("isReflectionWindowOpen", () => {
  it("neděle před 17:00 ne, od 17:00 ano, pondělí celý den, úterý ne", () => {
    expect(isReflectionWindowOpen(new Date("2026-06-14T16:59:00"))).toBe(false); // neděle
    expect(isReflectionWindowOpen(new Date("2026-06-14T17:00:00"))).toBe(true);
    expect(isReflectionWindowOpen(new Date("2026-06-15T08:00:00"))).toBe(true); // pondělí
    expect(isReflectionWindowOpen(new Date("2026-06-15T23:30:00"))).toBe(true);
    expect(isReflectionWindowOpen(new Date("2026-06-16T10:00:00"))).toBe(false); // úterý
    expect(isReflectionWindowOpen(new Date("2026-06-12T19:00:00"))).toBe(false); // pátek
  });
});

describe("reflectionWeekRange", () => {
  it("v neděli reflektuje právě končící týden (Po–Ne)", () => {
    expect(reflectionWeekRange(new Date("2026-06-14T18:00:00"))).toEqual({
      from: "2026-06-08",
      to: "2026-06-14",
    });
  });
  it("v pondělí reflektuje minulý týden", () => {
    expect(reflectionWeekRange(new Date("2026-06-15T09:00:00"))).toEqual({
      from: "2026-06-08",
      to: "2026-06-14",
    });
  });
  it("mimo okno (přímé otevření) minulý dokončený týden", () => {
    expect(reflectionWeekRange(new Date("2026-06-17T12:00:00"))).toEqual({
      from: "2026-06-08",
      to: "2026-06-14",
    });
  });
});
