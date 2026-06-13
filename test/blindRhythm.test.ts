/* Dech naslepo: haptické události v čase pro rytmy 4-4 a 4-7-8. */
import { blindEventAt, cycleSeconds } from "../src/features/calm/blindRhythm";

describe("rytmus 4-4 (cyklus 8 s)", () => {
  it("nádech na 0, dvojitý výdech na 4, opakuje se", () => {
    expect(cycleSeconds("4-4")).toBe(8);
    expect(blindEventAt("4-4", 0)).toBe("inhale");
    expect(blindEventAt("4-4", 1)).toBeNull();
    expect(blindEventAt("4-4", 4)).toBe("exhale-double");
    expect(blindEventAt("4-4", 7)).toBeNull();
    expect(blindEventAt("4-4", 8)).toBe("inhale"); // další cyklus
    expect(blindEventAt("4-4", 12)).toBe("exhale-double");
  });
  it("4-4 nemá zádrž, tedy žádný tik", () => {
    for (let s = 0; s < 16; s++) expect(blindEventAt("4-4", s)).not.toBe("hold-tick");
  });
});

describe("rytmus 4-7-8 (cyklus 19 s)", () => {
  it("nádech 0, tik uprostřed zádrže (7 s), dvojitý výdech 11, další cyklus 19", () => {
    expect(cycleSeconds("4-7-8")).toBe(19);
    expect(blindEventAt("4-7-8", 0)).toBe("inhale");
    expect(blindEventAt("4-7-8", 4)).toBeNull(); // začátek zádrže bez impulzu
    expect(blindEventAt("4-7-8", 7)).toBe("hold-tick"); // floor(7/2)=3 → 4+3
    expect(blindEventAt("4-7-8", 11)).toBe("exhale-double");
    expect(blindEventAt("4-7-8", 18)).toBeNull();
    expect(blindEventAt("4-7-8", 19)).toBe("inhale");
    expect(blindEventAt("4-7-8", 26)).toBe("hold-tick");
    expect(blindEventAt("4-7-8", 30)).toBe("exhale-double");
  });
});
