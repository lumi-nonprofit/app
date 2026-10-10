/* Routa /m1-checkin (M1 skeleton nad Rust trezorem) je vypnutá flagem
   M1_VAULT_SKELETON_ENABLED. Deep link na ni nesmí otevřít obrazovku trezoru
   ani skončit na prázdné obrazovce — otevře první dostupnou obrazovku. */
import { renderRouter, screen } from "expo-router/testing-library";
import { writeProfile } from "../src/db/repo";
import { M1_VAULT_SKELETON_ENABLED } from "../src/lib/featureFlags";
import { getTestDb } from "./helpers/testDb";

describe("routa /m1-checkin s vypnutým flagem", () => {
  it("flag je ve výchozím stavu vypnutý", () => {
    expect(M1_VAULT_SKELETON_ENABLED).toBe(false);
  });

  it("před onboardingem otevře onboarding", async () => {
    await renderRouter("app", { initialUrl: "/m1-checkin" });
    expect(await screen.findByText("Ahoj, tady Lumi.")).toBeOnTheScreen();
  });

  it("po onboardingu otevře Dnes", async () => {
    writeProfile(getTestDb(), { onboarded: true, name: "Janko", age: "u26", share: false });
    await renderRouter("app", { initialUrl: "/m1-checkin" });
    expect(await screen.findByText("Jak se dnes cítíš?")).toBeOnTheScreen();
  });
});
