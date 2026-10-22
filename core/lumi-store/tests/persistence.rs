//! lumi-store tests (host, full toolchain). 2 halves:
//!  1. lumi-vault's behaviours run against the rusqlite store over a real temp DB FILE.
//!  2. real-persistence proofs: data + shred survive a connection close/reopen, faithful column
//!     round-trips, and secure_delete actually scrubs a shredded wrapped key from the file.

use std::path::{Path, PathBuf};
use std::sync::atomic::{AtomicU64, Ordering};

use lumi_store::SqliteStore;
use lumi_vault::{Error, RecordId, RecordRow, VaultManager, VaultRow, VaultStore};

// --- temp DB file with cleanup (no external tempfile dep) ---

static COUNTER: AtomicU64 = AtomicU64::new(0);

struct TempDb {
    path: PathBuf,
}
impl TempDb {
    fn new() -> Self {
        let n = COUNTER.fetch_add(1, Ordering::Relaxed);
        let path = std::env::temp_dir().join(format!("lumi-store-test-{}-{}.db", std::process::id(), n));
        let me = TempDb { path };
        me.wipe();
        me
    }
    fn path(&self) -> &Path {
        &self.path
    }
    fn wipe(&self) {
        for suffix in ["", "-journal", "-wal", "-shm"] {
            let _ = std::fs::remove_file(format!("{}{}", self.path.display(), suffix));
        }
    }
}
impl Drop for TempDb {
    fn drop(&mut self) {
        self.wipe();
    }
}

fn file_contains(path: &Path, needle: &[u8]) -> bool {
    let data = std::fs::read(path).expect("read db file");
    !needle.is_empty() && data.windows(needle.len()).any(|w| w == needle)
}

fn checkin_json(mood: &str, intensity: u8, note: &str) -> String {
    format!(r#"{{"mood":"{mood}","intensity":{intensity},"note":"{note}"}}"#)
}

// =========================================================================
// 1. lumi-vault behaviours over the rusqlite store (file-backed)
// =========================================================================

#[test]
fn behaviours_over_sqlite_file() {
    let tmp = TempDb::new();
    let mut m = VaultManager::new(SqliteStore::open(tmp.path()).unwrap());
    let h = m.unlock_vault("correct horse battery staple").unwrap();

    let p1 = checkin_json("klid", 3, "ok");
    let p2 = checkin_json("napeti", 5, "");
    let id1 = m.put_checkin(h, &p1, 100).unwrap();
    let id2 = m.put_checkin(h, &p2, 200).unwrap();
    assert_ne!(id1, id2);

    // round-trip + order
    let list = m.list_checkins(h).unwrap();
    assert_eq!(list.len(), 2);
    assert_eq!(list[0].record_id, id1);
    assert_eq!(list[0].payload, p1);
    assert_eq!(list[1].payload, p2);

    // get + crypto-shred + fail-closed handle checks
    assert_eq!(m.get_checkin(h, id1).unwrap().payload, p1);
    m.shred_checkin(h, id1).unwrap();
    assert!(matches!(m.get_checkin(h, id1).unwrap_err(), Error::NotFoundOrShredded));
    assert!(matches!(m.shred_checkin(h, id1).unwrap_err(), Error::NotFoundOrShredded)); // double-shred
    assert_eq!(m.list_checkins(h).unwrap().len(), 1);

    m.lock(h);
    assert!(matches!(m.list_checkins(h).unwrap_err(), Error::BadHandle));
}

#[test]
fn wrong_pin_fails_closed_over_sqlite_file() {
    let tmp = TempDb::new();
    {
        let mut m = VaultManager::new(SqliteStore::open(tmp.path()).unwrap());
        let h = m.unlock_vault("the right pin").unwrap();
        m.put_checkin(h, &checkin_json("klid", 2, "secret"), 1).unwrap();
    }
    let mut m2 = VaultManager::new(SqliteStore::open(tmp.path()).unwrap());
    assert!(matches!(m2.unlock_vault("the WRONG pin").unwrap_err(), Error::WrongPinOrCorruptVault));
}

#[test]
fn many_records_distinct_nonces_survive_db_round_trip() {
    use std::collections::HashSet;
    let tmp = TempDb::new();
    let mut m = VaultManager::new(SqliteStore::open(tmp.path()).unwrap());
    let h = m.unlock_vault("pin").unwrap();
    const N: usize = 128;
    for i in 0..N {
        m.put_checkin(h, &checkin_json("klid", 1, ""), i as i64).unwrap();
    }
    // read the raw rows back through the store and confirm the nonce blobs round-trip + are distinct
    let store = SqliteStore::open(tmp.path()).unwrap();
    let rows = store.list_records().unwrap();
    assert_eq!(rows.len(), N);
    let mut nonces: HashSet<Vec<u8>> = HashSet::new();
    for r in &rows {
        assert_eq!(r.key_nonce.len(), 24);
        assert_eq!(r.content_nonce.len(), 24);
        assert!(nonces.insert(r.key_nonce.clone()));
        assert!(nonces.insert(r.content_nonce.clone()));
    }
    assert_eq!(nonces.len(), 2 * N);
}

// =========================================================================
// 2. Real persistence across a connection close/reopen
// =========================================================================

#[test]
fn records_persist_across_connection_close_and_reopen() {
    let tmp = TempDb::new();
    let (id_a, id_b);
    {
        let mut m = VaultManager::new(SqliteStore::open(tmp.path()).unwrap());
        let h = m.unlock_vault("pin-A").unwrap();
        id_a = m.put_checkin(h, &checkin_json("klid", 2, "first"), 10).unwrap();
        id_b = m.put_checkin(h, &checkin_json("napeti", 4, "second"), 20).unwrap();
        // m (and its SqliteStore connection) drops here -> file closed
    }

    // brand-new connection on the same FILE
    let mut m2 = VaultManager::new(SqliteStore::open(tmp.path()).unwrap());
    let h2 = m2.unlock_vault("pin-A").unwrap();
    let list = m2.list_checkins(h2).unwrap();
    assert_eq!(list.len(), 2, "records must survive close/reopen");
    assert_eq!(list[0].record_id, id_a);
    assert_eq!(list[0].payload, checkin_json("klid", 2, "first"));
    assert_eq!(list[1].record_id, id_b);
    assert_eq!(list[1].payload, checkin_json("napeti", 4, "second"));
}

#[test]
fn shred_persists_across_reopen() {
    let tmp = TempDb::new();
    let (keep, erase);
    {
        let mut m = VaultManager::new(SqliteStore::open(tmp.path()).unwrap());
        let h = m.unlock_vault("pin").unwrap();
        keep = m.put_checkin(h, &checkin_json("klid", 2, "keep"), 1).unwrap();
        erase = m.put_checkin(h, &checkin_json("napeti", 4, "erase"), 2).unwrap();
        m.shred_checkin(h, erase).unwrap();
    }
    // reopen: the shred is durable; the record is permanently gone, the other remains
    let mut m2 = VaultManager::new(SqliteStore::open(tmp.path()).unwrap());
    let h2 = m2.unlock_vault("pin").unwrap();
    let list = m2.list_checkins(h2).unwrap();
    assert_eq!(list.len(), 1);
    assert_eq!(list[0].record_id, keep);
    assert!(matches!(m2.get_checkin(h2, erase).unwrap_err(), Error::NotFoundOrShredded));
}

// =========================================================================
// 3. Faithful column mapping + secure_delete forensics (store-level)
// =========================================================================

#[test]
fn vault_and_record_rows_round_trip_faithfully() {
    let tmp = TempDb::new();
    let mut store = SqliteStore::open(tmp.path()).unwrap();

    let vault = VaultRow {
        format_version: 1,
        salt: vec![0xA1; 16],
        argon2_m_cost_kib: 64 * 1024,
        argon2_t_cost: 3,
        argon2_p_cost: 1,
        wrapped_vault_key: vec![0xB2; 48],
        vault_nonce: vec![0xC3; 24],
    };
    store.save_vault(&vault).unwrap();
    assert_eq!(store.load_vault().unwrap().unwrap(), vault, "vault row must round-trip every field");

    let rec = RecordRow {
        record_id: [7u8; 16],
        format_version: 1,
        wrapped_content_key: Some(vec![0xD4; 48]),
        key_nonce: vec![0xE5; 24],
        content_nonce: vec![0xF6; 24],
        ciphertext: vec![0x17; 100],
        created_at: 42,
    };
    store.insert_record(&rec).unwrap();
    assert_eq!(store.get_record(&rec.record_id).unwrap().unwrap(), rec, "record row must round-trip every field");

    // save_vault is INSERT OR REPLACE -> an update of the singleton works
    let mut vault2 = vault.clone();
    vault2.wrapped_vault_key = vec![0x99; 48];
    store.save_vault(&vault2).unwrap();
    assert_eq!(store.load_vault().unwrap().unwrap(), vault2);
}

#[test]
fn secure_delete_overwrites_wrapped_key_on_shred() {
    let tmp = TempDb::new();
    // a distinctive, unique blob so a file scan is meaningful (it will not collide with SQLite internals)
    let canary = b"LUMI-secure-delete-canary-DO-NOT-FIND-AFTER-SHRED".to_vec();
    let id: RecordId = [0x5A; 16];
    let row = RecordRow {
        record_id: id,
        format_version: 1,
        wrapped_content_key: Some(canary.clone()),
        key_nonce: vec![1u8; 24],
        content_nonce: vec![2u8; 24],
        ciphertext: vec![3u8; 64],
        created_at: 1,
    };

    {
        let mut store = SqliteStore::open(tmp.path()).unwrap();
        store.insert_record(&row).unwrap();
    } // close -> flush to file
    assert!(file_contains(tmp.path(), &canary), "sanity: the wrapped key should be on disk before shred");

    {
        let mut store = SqliteStore::open(tmp.path()).unwrap();
        assert!(store.shred_record(&id).unwrap(), "shred should report a real erasure");
        assert!(store.get_record(&id).unwrap().is_none(), "shredded record must be gone");
    } // close -> flush

    // The main-file scan is only sound if we are NOT in WAL mode (else scrubbed bytes could
    // linger in the -wal sidecar). init() pins DELETE journal; assert no -wal sidecar exists.
    assert!(
        !Path::new(&format!("{}-wal", tmp.path().display())).exists(),
        "DB must not be in WAL mode, or the secure_delete file scan would be unsound",
    );
    assert!(
        !file_contains(tmp.path(), &canary),
        "secure_delete=ON must overwrite the shredded wrapped content key's bytes on disk",
    );
}

/// Corrupt / adversarial DB content must fail closed as StoreError, never panic (the promise in
/// the crate docs). An attacker who changes the DB file at rest can influence the rows, so the
/// checked DB->Rust conversions must hold. Injects malformed rows through a raw connection.
#[test]
fn corrupt_db_content_fails_closed_without_panic() {
    // (1) a too-short record_id blob -> to_record_id length check -> StoreError
    {
        let tmp = TempDb::new();
        let _ = SqliteStore::open(tmp.path()).unwrap(); // create schema
        let raw = rusqlite::Connection::open(tmp.path()).unwrap();
        raw.execute(
            "INSERT INTO records (record_id, format_version, wrapped_content_key, key_nonce, content_nonce, ciphertext, created_at) \
             VALUES (?1, 1, NULL, ?2, ?3, ?4, 1)",
            rusqlite::params![&[1u8, 2, 3, 4][..], vec![0u8; 24], vec![0u8; 24], vec![0u8; 8]],
        )
        .unwrap();
        drop(raw);
        let store = SqliteStore::open(tmp.path()).unwrap();
        assert!(matches!(store.list_records(), Err(_)), "short record_id must surface StoreError, not panic");
    }

    // (2) an out-of-u8-range record format_version -> to_u8 check -> StoreError
    {
        let tmp = TempDb::new();
        let _ = SqliteStore::open(tmp.path()).unwrap();
        let raw = rusqlite::Connection::open(tmp.path()).unwrap();
        raw.execute(
            "INSERT INTO records (record_id, format_version, wrapped_content_key, key_nonce, content_nonce, ciphertext, created_at) \
             VALUES (?1, 99999, NULL, ?2, ?3, ?4, 1)",
            rusqlite::params![&[7u8; 16][..], vec![0u8; 24], vec![0u8; 24], vec![0u8; 8]],
        )
        .unwrap();
        drop(raw);
        let store = SqliteStore::open(tmp.path()).unwrap();
        assert!(matches!(store.list_records(), Err(_)), "out-of-range format_version must surface StoreError");
    }

    // (3) an out-of-range vault format_version -> load_vault to_u8 check -> StoreError
    {
        let tmp = TempDb::new();
        let _ = SqliteStore::open(tmp.path()).unwrap();
        let raw = rusqlite::Connection::open(tmp.path()).unwrap();
        raw.execute(
            "INSERT OR REPLACE INTO vault (id, format_version, salt, argon2_m_cost_kib, argon2_t_cost, argon2_p_cost, wrapped_vault_key, vault_nonce) \
             VALUES (1, 99999, ?1, 65536, 3, 1, ?2, ?3)",
            rusqlite::params![vec![0u8; 16], vec![0u8; 48], vec![0u8; 24]],
        )
        .unwrap();
        drop(raw);
        let store = SqliteStore::open(tmp.path()).unwrap();
        assert!(matches!(store.load_vault(), Err(_)), "out-of-range vault format_version must surface StoreError");
    }
}

#[test]
fn shred_of_missing_record_reports_false() {
    let tmp = TempDb::new();
    let mut store = SqliteStore::open(tmp.path()).unwrap();
    assert!(!store.shred_record(&[0u8; 16]).unwrap(), "shredding a non-existent id erases nothing");
}
