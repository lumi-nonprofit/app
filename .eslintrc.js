module.exports = {
  root: true,
  extends: ["expo", "plugin:react-native-a11y/all"],
  // spikes/ holds superseded reference kits (stale RN/expo-file-system APIs); excluded from lint
  // for the same reason they're excluded from tsc (tsconfig.json). Retiring them properly is backlog.
  ignorePatterns: ["node_modules/", ".expo/", "dist/", "web-build/", "spikes/"],
};
