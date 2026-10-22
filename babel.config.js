module.exports = function (api) {
  api.cache(true);
  return {
    presets: ["babel-preset-expo"],
    // The .sql files of the Drizzle migrations import as a string (drizzle/migrations.js).
    plugins: [["inline-import", { extensions: [".sql"] }]],
  };
};
