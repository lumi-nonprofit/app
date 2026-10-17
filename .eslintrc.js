module.exports = {
  root: true,
  extends: ["expo", "plugin:react-native-a11y/all"],
  rules: {
    // HIG VoiceOver: hint jen tam, kde výsledek akce neplyne z labelu. Preset
    // `all` vyžaduje hint ke každému labelu, což vede k redundantním hintům.
    "react-native-a11y/has-accessibility-hint": "off",
  },
  overrides: [
    {
      // Obrazovky a komponenty píšou text jen přes ds/Text (varianty, Dynamic Type,
      // barvy tématu). M1 skeleton je mimo rozsah refaktoru.
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
                message: "Použij Text z src/ds (varianty, Dynamic Type, barvy tématu).",
              },
            ],
          },
        ],
      },
    },
    {
      // Obrazovky berou barvy jen z rolí tématu (useTheme / createThemedStyles / tone),
      // ne ze surové palety — jinak se rozpadne tmavý režim a kontrastní test nic nechytí.
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
                message: "Použij Text z src/ds (varianty, Dynamic Type, barvy tématu).",
              },
            ],
            patterns: [
              {
                group: ["**/theme", "**/theme/index", "**/theme/tokens.generated"],
                importNames: ["palette", "lightColors", "darkColors"],
                message: "Surová paleta patří jen do vrstvy tématu — použij role z useTheme().",
              },
            ],
          },
        ],
      },
    },
  ],
  // spikes/ holds superseded reference kits (stale RN/expo-file-system APIs); excluded from lint
  // for the same reason they're excluded from tsc (tsconfig.json). Retiring them properly is backlog.
  // design/ is a separate package (Style Dictionary, own node_modules installed only by the
  // `tokens` CI job) — the root lint cannot resolve its imports.
  ignorePatterns: ["node_modules/", ".expo/", "dist/", "web-build/", "spikes/", "design/"],
};
