// Lumi design tokens → per-platform codegen. One source (tokens/**), four targets:
// RN (JS) for the v1 app, plus CSS / iOS-Swift / Android-Compose so a future
// desktop/native surface (ADR 0001 §2.4a) stays token-faithful with no drift.
export default {
  source: ["tokens/**/*.json"],
  platforms: {
    js: {
      transformGroup: "js",
      buildPath: "build/js/",
      files: [{ destination: "tokens.js", format: "javascript/es6" }],
    },
    css: {
      transformGroup: "css",
      buildPath: "build/css/",
      files: [{ destination: "tokens.css", format: "css/variables" }],
    },
    ios: {
      transformGroup: "ios-swift",
      buildPath: "build/ios/",
      files: [
        {
          destination: "LumiTokens.swift",
          format: "ios-swift/enum.swift",
          options: { className: "LumiTokens" },
        },
      ],
    },
    compose: {
      transformGroup: "compose",
      buildPath: "build/compose/",
      files: [
        {
          destination: "LumiTokens.kt",
          format: "compose/object",
          options: { className: "LumiTokens", packageName: "app.lumi.tokens" },
        },
      ],
    },
  },
};
