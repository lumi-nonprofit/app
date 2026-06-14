//! `lumi-store` — a rusqlite (**bundled SQLite**) implementation of the [`VaultStore`] trait
//! that `lumi-vault` defines. This crate **only persists** the wrapped/ciphertext material
//! lumi-vault hands it; it performs **no** key derivation or AEAD.
//!
//! - **Plain SQLite, no SQLCipher** (ADR 0004 (e)): the at-rest *content* is already sealed by
//!   lumi-vault's app-layer per-record AEAD, so there is **no database-level key** here (the old
//!   `PRAGMA key`-from-JS §1 violation is gone — the Rust core owns the connection and no key
//!   exists at this layer). SQLCipher-over-the-index is the committed pre-ship hardening, not built.
//! - **`PRAGMA secure_delete = ON`** so crypto-shredding actually overwrites freed bytes (the old
//!   wrapped content key is scrubbed, not left in a freelist page).
//! - Writes + shred are **atomic + durable** (explicit transaction + commit; `synchronous = FULL`).
//! - The schema is shaped for **forward-compatibility**: `PRAGMA user_version` gates future
//!   migrations, and the recovery-key wrap / biometric-keystore copy / sync metadata can be added
//!   later as nullable `ALTER TABLE ADD COLUMN`s **without reformatting** persisted rows. None built now.

#![forbid(unsafe_code)]

use std::path::Path;

use lumi_vault::{RecordId, RecordRow, StoreError, StoreResult, VaultRow, VaultStore};
use rusqlite::{Connection, OptionalExtension};

/// On-disk schema version (`PRAGMA user_version`). Bump + migrate (additively) to evolve the schema.
const SCHEMA_VERSION: i64 = 1;

fn err<E: std::fmt::Display>(e: E) -> StoreError {
    StoreError(e.to_string())
}

/// A vault database backed by a single rusqlite connection owned by the Rust core.
pub struct SqliteStore {
    conn: Connection,
}

impl SqliteStore {
    /// Open (creating + migrating if needed) a vault database file at `path`.
    pub fn open(path: impl AsRef<Path>) -> StoreResult<Self> {
        let conn = Connection::open(path).map_err(err)?;
        Self::init(conn)
    }

    /// In-memory database (tests/diagnostics only — does **not** persist across connections).
    pub fn open_in_memory() -> StoreResult<Self> {
        let conn = Connection::open_in_memory().map_err(err)?;
        Self::init(conn)
    }

    fn init(conn: Connection) -> StoreResult<Self> {
        // secure_delete: overwrite freed content with zeros, so a crypto-shred genuinely scrubs the
        // old wrapped-content-key bytes. Set on every connection (it is a per-connection setting).
        conn.pragma_update(None, "secure_delete", "ON").map_err(err)?;
        // Durability: full fsync at each commit.
        conn.pragma_update(None, "synchronous", "FULL").map_err(err)?;
        // Pin the rollback (DELETE) journal explicitly: secure_delete scrubs the freed cell in the
        // MAIN db file on commit. Under WAL, shredded bytes could linger in the -wal sidecar until a
        // checkpoint — weakening the crypto-shred guarantee — so we must NOT use WAL here. (PRAGMA
        // journal_mode returns the resulting mode; for in-memory DBs it stays "memory" — harmless.)
        conn.query_row("PRAGMA journal_mode = DELETE", [], |_| Ok(())).map_err(err)?;

        // Forward-compat: any future migration column (recovery-key wrap, biometric/keystore copy,
        // sync metadata) MUST be nullable / DEFAULT-ed — ADD COLUMN on a populated table forbids a
        // bare NOT NULL. The tables avoid STRICT / WITHOUT ROWID so the additive path stays open.
        conn.execute_batch(
            "BEGIN;
             CREATE TABLE IF NOT EXISTS vault (
                 id                INTEGER PRIMARY KEY CHECK (id = 1),   -- singleton row
                 format_version    INTEGER NOT NULL,
                 salt              BLOB    NOT NULL,
                 argon2_m_cost_kib INTEGER NOT NULL,
                 argon2_t_cost     INTEGER NOT NULL,
                 argon2_p_cost     INTEGER NOT NULL,
                 wrapped_vault_key BLOB    NOT NULL,
                 vault_nonce       BLOB    NOT NULL
             );
             CREATE TABLE IF NOT EXISTS records (
                 record_id           BLOB    PRIMARY KEY NOT NULL,
                 format_version      INTEGER NOT NULL,
                 wrapped_content_key BLOB,                              -- NULL once crypto-shredded
                 key_nonce           BLOB    NOT NULL,
                 content_nonce       BLOB    NOT NULL,
                 ciphertext          BLOB    NOT NULL,
                 created_at          INTEGER NOT NULL                   -- plaintext ordering index
             );
             CREATE INDEX IF NOT EXISTS records_created_at_idx ON records (created_at, record_id);
             COMMIT;",
        )
        .map_err(err)?;
        conn.pragma_update(None, "user_version", SCHEMA_VERSION).map_err(err)?;
        Ok(Self { conn })
    }
}

// ---- checked DB -> Rust conversions (never panic on corrupt rows; surface StoreError) ----

fn to_record_id(v: Vec<u8>) -> StoreResult<RecordId> {
    let len = v.len();
    v.try_into().map_err(|_| StoreError(format!("record_id is {len} bytes, expected 16")))
}

fn to_u8(v: i64) -> StoreResult<u8> {
    u8::try_from(v).map_err(|_| StoreError(format!("value {v} out of u8 range")))
}

fn to_u32(v: i64) -> StoreResult<u32> {
    u32::try_from(v).map_err(|_| StoreError(format!("value {v} out of u32 range")))
}

/// Raw record columns (pre-validation), read inside a rusqlite closure.
struct RawRecord {
    record_id: Vec<u8>,
    format_version: i64,
    wrapped_content_key: Option<Vec<u8>>,
    key_nonce: Vec<u8>,
    content_nonce: Vec<u8>,
    ciphertext: Vec<u8>,
    created_at: i64,
}

fn read_raw_record(row: &rusqlite::Row<'_>) -> rusqlite::Result<RawRecord> {
    Ok(RawRecord {
        record_id: row.get(0)?,
        format_version: row.get(1)?,
        wrapped_content_key: row.get(2)?,
        key_nonce: row.get(3)?,
        content_nonce: row.get(4)?,
        ciphertext: row.get(5)?,
        created_at: row.get(6)?,
    })
}

fn raw_to_record(r: RawRecord) -> StoreResult<RecordRow> {
    Ok(RecordRow {
        record_id: to_record_id(r.record_id)?,
        format_version: to_u8(r.format_version)?,
        wrapped_content_key: r.wrapped_content_key,
        key_nonce: r.key_nonce,
        content_nonce: r.content_nonce,
        ciphertext: r.ciphertext,
        created_at: r.created_at,
    })
}

const RECORD_COLS: &str =
    "record_id, format_version, wrapped_content_key, key_nonce, content_nonce, ciphertext, created_at";

impl VaultStore for SqliteStore {
    fn load_vault(&self) -> StoreResult<Option<VaultRow>> {
        let raw = self
            .conn
            .query_row(
                "SELECT format_version, salt, argon2_m_cost_kib, argon2_t_cost, argon2_p_cost, \
                 wrapped_vault_key, vault_nonce FROM vault WHERE id = 1",
                [],
                |row| {
                    Ok((
                        row.get::<_, i64>(0)?,
                        row.get::<_, Vec<u8>>(1)?,
                        row.get::<_, i64>(2)?,
                        row.get::<_, i64>(3)?,
                        row.get::<_, i64>(4)?,
                        row.get::<_, Vec<u8>>(5)?,
                        row.get::<_, Vec<u8>>(6)?,
                    ))
                },
            )
            .optional()
            .map_err(err)?;

        match raw {
            None => Ok(None),
            Some((fv, salt, m, t, p, wrapped_vault_key, vault_nonce)) => Ok(Some(VaultRow {
                format_version: to_u8(fv)?,
                salt,
                argon2_m_cost_kib: to_u32(m)?,
                argon2_t_cost: to_u32(t)?,
                argon2_p_cost: to_u32(p)?,
                wrapped_vault_key,
                vault_nonce,
            })),
        }
    }

    fn save_vault(&mut self, row: &VaultRow) -> StoreResult<()> {
        let tx = self.conn.transaction().map_err(err)?;
        tx.execute(
            "INSERT OR REPLACE INTO vault \
             (id, format_version, salt, argon2_m_cost_kib, argon2_t_cost, argon2_p_cost, wrapped_vault_key, vault_nonce) \
             VALUES (1, ?1, ?2, ?3, ?4, ?5, ?6, ?7)",
            rusqlite::params![
                row.format_version as i64,
                row.salt,
                row.argon2_m_cost_kib as i64,
                row.argon2_t_cost as i64,
                row.argon2_p_cost as i64,
                row.wrapped_vault_key,
                row.vault_nonce,
            ],
        )
        .map_err(err)?;
        tx.commit().map_err(err)
    }

    fn insert_record(&mut self, row: &RecordRow) -> StoreResult<()> {
        let tx = self.conn.transaction().map_err(err)?;
        tx.execute(
            "INSERT INTO records \
             (record_id, format_version, wrapped_content_key, key_nonce, content_nonce, ciphertext, created_at) \
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
            rusqlite::params![
                &row.record_id[..],
                row.format_version as i64,
                row.wrapped_content_key.as_deref(),
                row.key_nonce,
                row.content_nonce,
                row.ciphertext,
                row.created_at,
            ],
        )
        .map_err(err)?;
        tx.commit().map_err(err)
    }

    fn list_records(&self) -> StoreResult<Vec<RecordRow>> {
        let sql = format!("SELECT {RECORD_COLS} FROM records ORDER BY created_at, record_id");
        let mut stmt = self.conn.prepare(&sql).map_err(err)?;
        let raws = stmt
            .query_map([], read_raw_record)
            .map_err(err)?
            .collect::<rusqlite::Result<Vec<RawRecord>>>()
            .map_err(err)?;
        raws.into_iter().map(raw_to_record).collect()
    }

    fn get_record(&self, id: &RecordId) -> StoreResult<Option<RecordRow>> {
        let sql = format!("SELECT {RECORD_COLS} FROM records WHERE record_id = ?1");
        let raw = self
            .conn
            .query_row(&sql, [&id[..]], read_raw_record)
            .optional()
            .map_err(err)?;
        raw.map(raw_to_record).transpose()
    }

    fn shred_record(&mut self, id: &RecordId) -> StoreResult<bool> {
        // Crypto-shred = a committed DELETE; with secure_delete=ON the freed cell (the wrapped
        // content key AND ciphertext) is overwritten with zeros. Returns true iff a row existed.
        let tx = self.conn.transaction().map_err(err)?;
        let affected = tx
            .execute("DELETE FROM records WHERE record_id = ?1", [&id[..]])
            .map_err(err)?;
        tx.commit().map_err(err)?;
        Ok(affected > 0)
    }
}
