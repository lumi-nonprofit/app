/* Jest runs 2 projects. "android" is the pilot platform (ADR 0007): the tests run with
   Platform.OS === "android", with the Material branches of the components (dialogs, ripple,
   segmented buttons). "web" renders the design-system components with react-native-web in
   jsdom and runs axe-core on the DOM (test/a11y/ds.web.test.tsx). `npm test` runs both. */
module.exports = {
  /* The full-app tests (router, questionnaires, tags, audit) render through expo-router and can
     take more than the 5 s default on a cold or slow CI runner. 30 s keeps them reliable. */
  testTimeout: 30000,
  projects: [
    {
      displayName: "android",
      preset: "jest-expo/android",
      setupFilesAfterEnv: ["<rootDir>/test/setup.ts"],
      /* A project list replaces the ignore list of the preset, so the defaults of the preset
         repeat here. The web tests belong to the web project. */
      testPathIgnorePatterns: ["/node_modules/", "/__rsc_tests__/", "\\.web\\.test\\.tsx$"],
    },
    {
      displayName: "web",
      preset: "jest-expo/web",
      testMatch: ["<rootDir>/test/**/*.web.test.tsx"],
      setupFilesAfterEnv: ["<rootDir>/test/setup.web.ts"],
      /* The web build of lucide-react-native is an ES module (.mjs), which the Babel transform of
         the preset does not cover. The CommonJS build has the same icons. */
      moduleNameMapper: {
        "^lucide-react-native$":
          "<rootDir>/node_modules/lucide-react-native/dist/cjs/lucide-react-native.js",
      },
    },
  ],
};
