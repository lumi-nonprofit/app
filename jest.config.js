/* Jest runs 2 projects. "android" is the pilot platform (ADR 0007): the tests run with
   Platform.OS === "android", with the Material branches of the components (dialogs, ripple,
   segmented buttons). "web" renders the design-system components with react-native-web in
   jsdom and runs axe-core on the DOM (test/a11y/ds.web.test.tsx). `npm test` runs both. */

/* The import of lucide-react-native resolves to its ES module build (.mjs) on Android and on the
   web. The Babel transform of the jest-expo presets does not cover .mjs files. The CommonJS build
   has the same icons, so both projects map the import to it. */
const lucideCommonJs = {
  "^lucide-react-native$":
    "<rootDir>/node_modules/lucide-react-native/dist/cjs/lucide-react-native.js",
};

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
      moduleNameMapper: lucideCommonJs,
    },
    {
      displayName: "web",
      preset: "jest-expo/web",
      testMatch: ["<rootDir>/test/**/*.web.test.tsx"],
      setupFilesAfterEnv: ["<rootDir>/test/setup.web.ts"],
      moduleNameMapper: lucideCommonJs,
    },
  ],
};
