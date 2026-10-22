// ESLint configuration. The rules enforce the standards of README.md, section "Standards":
// accessibility (eslint-plugin-react-native-a11y), the design system (no raw Text, no raw palette,
// no raw type scale or colours in screens) and the message catalogs (no literal text for the user).
module.exports = {
  root: true,
  extends: ["expo", "plugin:react-native-a11y/all"],
  plugins: ["i18next"],
  rules: {
    // HIG VoiceOver: a hint only where the result of the action does not follow from the label.
    // The preset `all` wants a hint next to every label, which gives redundant hints.
    "react-native-a11y/has-accessibility-hint": "off",
  },
  overrides: [
    {
      // TypeScript checks the members of a namespace import (`npm run typecheck`). The import
      // plugin reads a file as a module only when a line starts with `export`. In the Expo SDK 58
      // build output, a comment comes first on that line, so the plugin sees no exports there.
      files: ["*.ts", "*.tsx"],
      rules: { "import/namespace": "off" },
    },
    {
      // Screens and components write text only through ds/Text (variants, Dynamic Type, theme
      // colours). The M1 skeleton is outside the design-system refactor.
      files: ["src/features/**/*.tsx", "src/components/**/*.tsx", "app/**/*.tsx"],
      excludedFiles: ["src/features/m1/**"],
      rules: {
        "no-restricted-imports": [
          "error",
          {
            paths: [
              {
                name: "react-native",
                importNames: ["Text"],
                message: "Use Text from src/ds (variants, Dynamic Type, theme colours).",
              },
            ],
          },
        ],
        // Apple HIG text styles and Material 3 type roles live in ds/Text; colours live in the
        // theme roles. A raw size or a raw colour in a screen breaks Dynamic Type, dark mode
        // and the contrast test.
        "no-restricted-syntax": [
          "error",
          {
            selector: "Property[key.name=/^(fontSize|lineHeight)$/] > Literal[raw=/^[0-9]/]",
            message: "The type scale lives in ds/Text variants (HIG text styles, M3 type roles).",
          },
          {
            selector: "Literal[value=/^#[0-9a-fA-F]{3,8}$/]",
            message: "Colours come from the theme roles (useTheme, createThemedStyles).",
          },
          {
            selector: "Literal[value=/^rgba?\\(/]",
            message: "Colours come from the theme roles (useTheme, createThemedStyles).",
          },
        ],
      },
    },
    {
      // Screens take colours only from the theme roles (useTheme, createThemedStyles, tone),
      // never from the raw palette: dark mode and the contrast test depend on it.
      files: ["src/features/**/*.tsx"],
      excludedFiles: ["src/features/m1/**"],
      rules: {
        "no-restricted-imports": [
          "error",
          {
            paths: [
              {
                name: "react-native",
                importNames: ["Text"],
                message: "Use Text from src/ds (variants, Dynamic Type, theme colours).",
              },
            ],
            patterns: [
              {
                group: ["**/theme", "**/theme/index", "**/theme/tokens.generated"],
                importNames: ["palette", "lightColors", "darkColors"],
                message: "The raw palette belongs to the theme layer. Use the roles of useTheme().",
              },
            ],
          },
        ],
      },
    },
    {
      // Every string that the user sees comes from the message catalogs (src/i18n/locales). A literal
      // in JSX, in a prop that the user sees, in a dialog or in a notification is an error.
      // Ids, routes, icon names, style values and keys pass through `words.exclude`.
      files: ["app/**/*.{ts,tsx}", "src/**/*.{ts,tsx}"],
      excludedFiles: [
        "src/theme/**",
        "src/db/schema.ts",
        "src/db/connect.ts",
        "src/i18n/**",
        "**/*.d.ts",
        "**/*.test.*",
      ],
      rules: {
        "i18next/no-literal-string": [
          "error",
          {
            mode: "all",
            "should-validate-template": true,
            "jsx-attributes": {
              include: [
                "^(title|label|placeholder|hint|description|subtitle|sublabel|kicker|message|confirmLabel|cancelLabel|loadingLabel|headerTitle|headerBackTitle|tabBarLabel|accessibilityLabel|accessibilityHint|dialogTitle|body|text)$",
              ],
              exclude: [
                "^(testID|sf|md|icon|name|href|variant|size|color|tone|weight|align|presentation|pathname|mimeType|behavior|display|mode|locale|keyboardType|autoComplete|textContentType|returnKeyType|autoCapitalize|accessibilityRole|importantForAccessibility|key|style|anchor|contentInsetAdjustmentBehavior|viewBox|fill|stroke|d)$",
              ],
            },
            callees: {
              include: [
                "^(Alert\\.alert|confirm|confirmDiscard|confirmDelete|notify|announce|scheduleNotificationAsync|Notifications\\.scheduleNotificationAsync|setNotificationChannelAsync|Notifications\\.setNotificationChannelAsync)$",
              ],
              // The plugin matches the whole callee text, so a prefix needs `.*` after it.
              exclude: [
                "console\\.\\w+",
                "\\w*Error",
                "jest\\.\\w+",
                "^require$",
                "^(getSetting|setSetting|openURL|execSync|replace|split|includes|startsWith|endsWith|padStart|join|indexOf|test|match|useState|useRef|createContext|t|i18n\\.t|contentText|contentTextOrNull|Date|RegExp|useAccessibilityFlag|addEventListener|removeEventListener|setTimeout|setInterval|parseInt|Number|String)$",
                "Intl\\.\\w+",
              ],
            },
            "object-properties": {
              include: [
                "^(title|message|body|label|subtitle|meta|placeholder|hint|text|intro|dialogTitle|confirmLabel|cancelLabel|accessibilityLabel|accessibilityHint)$",
              ],
            },
            words: {
              // Ids, routes, style values, theme roles (camelCase) and numbers are not text.
              exclude: [
                "^[a-z0-9_./:()\\[\\]#%,+*-]*$",
                "^[A-Z0-9_./-]+$",
                "^[a-z]+(?:[A-Z][a-z0-9]*)+$",
                "^[0-9][0-9 .,:-]*$",
                "^\\s*$",
                "^tel:",
              ],
            },
          },
        ],
      },
    },
  ],
  // spikes/ holds superseded reference kits (stale RN and expo-file-system APIs); they are out of
  // lint for the same reason they are out of tsc (tsconfig.json). The retirement is backlog.
  // design/ is a separate package (Style Dictionary, own node_modules installed only by the
  // `tokens` CI job): the root lint cannot resolve its imports.
  ignorePatterns: ["node_modules/", ".expo/", "dist/", "web-build/", "spikes/", "design/"],
};
