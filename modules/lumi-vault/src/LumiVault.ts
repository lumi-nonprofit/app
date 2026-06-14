// Step 4a — the JS/TS wrapper around the Nitro Hybrid Object. Provides a typed surface and does
// the "double-decode": listCheckinsJson returns a JSON array string whose `payload` is itself a
// JSON string, so we JSON.parse the array AND then JSON.parse each payload.
import { NitroModules } from 'react-native-nitro-modules';
import type { LumiVault as LumiVaultSpec } from './LumiVault.nitro';

const native = NitroModules.createHybridObject<LumiVaultSpec>('LumiVault');

export interface Checkin {
  recordId: string; // 16-byte opaque id, hex
  createdAt: number; // ms (JS-number-safe; < 2^53)
  payload: unknown; // the decoded record object
}

interface RawRow {
  record_id: string;
  created_at: number;
  payload: string; // a JSON string -> needs a second parse
}

export const LumiVault = {
  /** Open the DB + init the process-global manager. Throws on error. */
  open: (dbPath: string): void => native.open(dbPath),
  close: (): void => native.close(),
  /** Unlock (or create) the vault; returns an opaque handle. Throws on wrong PIN. */
  unlock: (pin: string): number => native.unlock(pin),
  /** Seal a check-in; `record` is serialized to JSON here. `createdAtMs` must be < 2^53. */
  putCheckin: (handle: number, record: unknown, createdAtMs: number): string =>
    native.putCheckin(handle, JSON.stringify(record), createdAtMs),
  /** Decrypt + return all live records, double-decoding each payload. Throws on tampering. */
  listCheckins: (handle: number): Checkin[] => {
    const rows = JSON.parse(native.listCheckinsJson(handle)) as RawRow[];
    return rows.map((r) => ({
      recordId: r.record_id,
      createdAt: r.created_at,
      payload: JSON.parse(r.payload), // second decode
    }));
  },
  /** Crypto-shred a record; returns whether a live record was destroyed. */
  shredCheckin: (handle: number, recordId: string): boolean => native.shredCheckin(handle, recordId),
};
