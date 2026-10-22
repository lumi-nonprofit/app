/* Opens the encrypted database (expo-sqlite + SQLCipher) and registers the Drizzle
   migrations. This module is the only place that touches the native SQLite: the tests
   mock it with better-sqlite3 (the same schema and queries).

   SQLCipher does not work in Expo Go: a development build is necessary,
   see the README section "Vývoj". */
import { Platform } from "react-native";
import { openDatabaseSync } from "expo-sqlite";
import { drizzle } from "drizzle-orm/expo-sqlite";
import { migrate } from "drizzle-orm/expo-sqlite/migrator";
import migrations from "../../drizzle/migrations";
import { runDataMigrations } from "./dataMigrations";
import { getOrCreateDbKey } from "./key";
import * as schema from "./schema";
import type { LumiDb } from "./types";

export const DB_NAME = "lumi.db";

export async function connectDb(): Promise<LumiDb> {
  const raw = openDatabaseSync(DB_NAME);
  if (Platform.OS !== "web") {
    // the key goes from the secure store straight into the PRAGMA; never log it anywhere
    const key = await getOrCreateDbKey();
    raw.execSync(`PRAGMA key = "x'${key}'"`);
  }
  /* the web has no SQLCipher (wasm sqlite): a development mode, see the README */
  const db = drizzle(raw, { schema });
  await migrate(db, migrations);
  runDataMigrations(db as LumiDb);
  return db as LumiDb;
}
