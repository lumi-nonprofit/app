module.exports = {
  root: true,
  extends: ["expo", "plugin:react-native-a11y/all"],
  rules: {
    // HIG VoiceOver: hint jen tam, kde výsledek akce neplyne z labelu. Preset
    // `all` vyžaduje hint ke každému labelu, což vede k redundantním hintům.
    "react-native-a11y/has-accessibility-hint": "off",
  },
  // spikes/ holds superseded reference kits (stale RN/expo-file-system APIs); excluded from lint
  // for the same reason they're excluded from tsc (tsconfig.json). Retiring them properly is backlog.
  ignorePatterns: ["node_modules/", ".expo/", "dist/", "web-build/", "spikes/"],
};
