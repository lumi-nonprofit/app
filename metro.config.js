// Metro bundles the Drizzle migrations as .sql files (see drizzle/migrations.js).
const { getDefaultConfig } = require("expo/metro-config");

const config = getDefaultConfig(__dirname);
config.resolver.sourceExts.push("sql");
// expo-sqlite on the web: the wasm build of SQLite is an asset in the bundle.
config.resolver.assetExts.push("wasm");

module.exports = config;
