/* The flag `M1_VAULT_SKELETON_ENABLED` turns the route `/m1-checkin` (the M1 skeleton over
   the Rust vault) off. A deep link to it must not open the vault screen and must not end on
   an empty screen: it opens the first available screen. */
import { renderRouter, screen } from "expo-router/testing-library";
import { writeProfile } from "../src/db/repo";
import { M1_VAULT_SKELETON_ENABLED } from "../src/lib/featureFlags";
import { getTestDb } from "./helpers/testDb";

describe("route /m1-checkin with the flag off", () => {
  it("has the flag off by default", () => {
    expect(M1_VAULT_SKELETON_ENABLED).toBe(false);
  });

  it("opens the onboarding when the profile is not onboarded", async () => {
    await renderRouter("app", { initialUrl: "/m1-checkin" });
    expect(await screen.findByText("Ahoj, tady Lumi.")).toBeOnTheScreen();
  });

  it("opens Dnes after the onboarding", async () => {
    writeProfile(getTestDb(), { onboarded: true, name: "Janko", age: "u26", share: false });
    await renderRouter("app", { initialUrl: "/m1-checkin" });
    expect(await screen.findByText("Jak se dnes cítíš?")).toBeOnTheScreen();
  });
});
