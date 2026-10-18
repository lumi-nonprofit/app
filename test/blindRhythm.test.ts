/* "Dech naslepo": the haptic events over time for the rhythms 4-4 and 4-7-8. */
import { blindEventAt, cycleSeconds } from "../src/features/calm/blindRhythm";

describe("rhythm 4-4 (cycle of 8 s)", () => {
  it("inhales at 0, exhales twice at 4 and repeats", () => {
    expect(cycleSeconds("4-4")).toBe(8);
    expect(blindEventAt("4-4", 0)).toBe("inhale");
    expect(blindEventAt("4-4", 1)).toBeNull();
    expect(blindEventAt("4-4", 4)).toBe("exhale-double");
    expect(blindEventAt("4-4", 7)).toBeNull();
    expect(blindEventAt("4-4", 8)).toBe("inhale"); // next cycle
    expect(blindEventAt("4-4", 12)).toBe("exhale-double");
  });
  it("has no hold in 4-4, thus no tick", () => {
    for (let s = 0; s < 16; s++) expect(blindEventAt("4-4", s)).not.toBe("hold-tick");
  });
});

describe("rhythm 4-7-8 (cycle of 19 s)", () => {
  it("inhales at 0, ticks in the middle of the hold (7 s), exhales twice at 11 and starts the next cycle at 19", () => {
    expect(cycleSeconds("4-7-8")).toBe(19);
    expect(blindEventAt("4-7-8", 0)).toBe("inhale");
    expect(blindEventAt("4-7-8", 4)).toBeNull(); // start of the hold without a pulse
    expect(blindEventAt("4-7-8", 7)).toBe("hold-tick"); // floor(7/2) = 3, so 4 + 3
    expect(blindEventAt("4-7-8", 11)).toBe("exhale-double");
    expect(blindEventAt("4-7-8", 18)).toBeNull();
    expect(blindEventAt("4-7-8", 19)).toBe("inhale");
    expect(blindEventAt("4-7-8", 26)).toBe("hold-tick");
    expect(blindEventAt("4-7-8", 30)).toBe("exhale-double");
  });
});
