module.exports = {
  preset: "jest-expo",
  setupFilesAfterEnv: ["./test/setup.ts"],
  // Full-app integration tests (app/measure/tags) render via expo-router and can
  // exceed Jest's 5s default on cold/slow CI runners. 30s keeps them reliable.
  testTimeout: 30000,
};
