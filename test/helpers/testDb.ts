/* Testovací databáze: better-sqlite3 v paměti se stejným Drizzle schématem
   a stejnými migracemi jako nativní expo-sqlite (oba synchronní sqlite
   dialekt). setup.ts tímhle modulem mockuje src/db/connect. */
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import * as schema from "../../src/db/schema";
import type { LumiDb } from "../../src/db/types";

export function createTestDb(): LumiDb {
  const sqlite = new Database(":memory:");
  const db = drizzle(sqlite, { schema });
  migrate(db, { migrationsFolder: "drizzle" });
  return db as unknown as LumiDb;
}

let current: LumiDb = createTestDb();

/** Mock src/db/connect.connectDb — vrací sdílenou in-memory DB testu. */
export async function connectDb(): Promise<LumiDb> {
  return current;
}

export const DB_NAME = ":memory: (test)";

/** Čistá DB pro každý test (volá setup.ts v beforeEach). */
export function __resetTestDb(): void {
  current = createTestDb();
}

/** Přímý přístup k DB aktuálního testu (asserce na uložená data). */
export function getTestDb(): LumiDb {
  return current;
}
