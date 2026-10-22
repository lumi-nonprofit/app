/* The test database: better-sqlite3 in memory with the same Drizzle schema and the same
   migrations as the native expo-sqlite (both use the synchronous SQLite dialect).
   `setup.ts` mocks `src/db/connect` with this module. */
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { runDataMigrations } from "../../src/db/dataMigrations";
import * as schema from "../../src/db/schema";
import type { LumiDb } from "../../src/db/types";

export function createTestDb(): LumiDb {
  const sqlite = new Database(":memory:");
  const db = drizzle(sqlite, { schema });
  migrate(db, { migrationsFolder: "drizzle" });
  runDataMigrations(db as unknown as LumiDb);
  return db as unknown as LumiDb;
}

let current: LumiDb = createTestDb();

/** The mock of `src/db/connect.connectDb`: returns the shared in-memory DB of the test. */
export async function connectDb(): Promise<LumiDb> {
  return current;
}

export const DB_NAME = ":memory: (test)";

/** A clean DB for each test (`setup.ts` calls it in `beforeEach`). */
export function __resetTestDb(): void {
  current = createTestDb();
}

/** Direct access to the DB of the current test (assertions on the stored data). */
export function getTestDb(): LumiDb {
  return current;
}
