module.exports = {
  // Pilotní platforma je Android (ADR 0007): testy běží s Platform.OS === "android",
  // tedy s Material větvemi komponent (dialogy, ripple, segmented buttons).
  preset: "jest-expo/android",
  setupFilesAfterEnv: ["./test/setup.ts"],
  // Full-app integration tests (app/measure/tags) render via expo-router and can
  // exceed Jest's 5s default on cold/slow CI runners. 30s keeps them reliable.
  testTimeout: 30000,
};
