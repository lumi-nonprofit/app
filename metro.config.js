// Drizzle migrace se bundlují jako .sql soubory (viz drizzle/migrations.js).
const { getDefaultConfig } = require("expo/metro-config");

const config = getDefaultConfig(__dirname);
config.resolver.sourceExts.push("sql");
// expo-sqlite na webu: wasm build sqlite se bundluje jako asset
config.resolver.assetExts.push("wasm");

module.exports = config;
