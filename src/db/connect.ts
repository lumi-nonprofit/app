/* Otevření šifrované databáze (expo-sqlite + SQLCipher) a registrace
   Drizzle migrací. Tenhle modul je jediné místo, které sahá na nativní
   SQLite — testy ho mockují na better-sqlite3 (stejné schéma i dotazy).

   SQLCipher nefunguje v Expo Go — je potřeba development build,
   viz README sekce „Vývoj“. */
import { Platform } from "react-native";
import { openDatabaseSync } from "expo-sqlite";
import { drizzle } from "drizzle-orm/expo-sqlite";
import { migrate } from "drizzle-orm/expo-sqlite/migrator";
import migrations from "../../drizzle/migrations";
import { getOrCreateDbKey } from "./key";
import * as schema from "./schema";
import type { LumiDb } from "./types";

export const DB_NAME = "lumi.db";

export async function connectDb(): Promise<LumiDb> {
  const raw = openDatabaseSync(DB_NAME);
  if (Platform.OS !== "web") {
    // klíč jde ze secure-store rovnou do PRAGMA; nikam ho nelogovat
    const key = await getOrCreateDbKey();
    raw.execSync(`PRAGMA key = "x'${key}'"`);
  }
  /* na webu SQLCipher není (wasm sqlite) — vývojový režim, viz README */
  const db = drizzle(raw, { schema });
  await migrate(db, migrations);
  return db as LumiDb;
}
