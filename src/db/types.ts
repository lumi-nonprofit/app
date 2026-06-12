/* Společný typ databáze pro aplikaci (expo-sqlite) i testy (better-sqlite3):
   oba drivery jsou synchronní sqlite dialekt, takže repo funkce fungují
   nad společným základem. */
import type { BaseSQLiteDatabase } from "drizzle-orm/sqlite-core";
import type * as schema from "./schema";

export type LumiDb = BaseSQLiteDatabase<"sync", unknown, typeof schema>;
