/* The common database type for the app (expo-sqlite) and the tests (better-sqlite3):
   both drivers are the synchronous sqlite dialect, so the repo functions work
   on a common base. */
import type { BaseSQLiteDatabase } from "drizzle-orm/sqlite-core";
import type * as schema from "./schema";

export type LumiDb = BaseSQLiteDatabase<"sync", unknown, typeof schema>;
