module.exports = function (api) {
  api.cache(true);
  return {
    presets: ["babel-preset-expo"],
    // .sql soubory Drizzle migrací se importují jako string (drizzle/migrations.js)
    plugins: [["inline-import", { extensions: [".sql"] }]],
  };
};
