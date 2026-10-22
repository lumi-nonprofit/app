//! `lumi-vault` — Lumi's at-rest crypto: the vault key hierarchy, per-record content
//! keys, and crypto-shredding (ADR 0001 §3 / ADR 0004).
//!
//! **Hierarchy.** A user PIN → **Argon2id** → *PIN key*, which AEAD-wraps a random 32-byte
//! **vault key**; the vault key AEAD-wraps a fresh per-record **content key** that seals
//! each record's payload (**XChaCha20-Poly1305**, fresh 24-byte nonce, AAD = record id ‖
//! format version). Erasure is by **crypto-shredding**: destroy a record's wrapped content
//! key and its ciphertext is permanently unrecoverable (GDPR Art. 17, ADR 0001 §4).
//!
//! **Invariants.**
//! - **§1:** secret/derived keys never leave Rust. They live in an in-process registry
//!   behind an opaque [`VaultHandle`]; the API returns handles, plaintext domain records,
//!   record ids, and errors — **never key bytes**. The PIN crosses *in* (it is user input,
//!   not a key); Argon2id runs here and the derived keys stay here (the ADR 0004 §1 interpretation).
//! - Pure-Rust RustCrypto only (musl-buildable); `#![forbid(unsafe_code)]`; no hand-rolled
//!   crypto; secrets live in [`zeroize::Zeroizing`], which wipes them on drop.
//! - This crate **never logs** keys, the PIN, or plaintext.
//!
//! [`VaultStore`] abstracts **storage**, so SQLite can satisfy it later (lumi-store,
//! the next build step). [`memory::InMemoryStore`] is the in-process reference impl used by
//! tests; there is **no SQLite / C-ABI / app integration in this crate**.

#![forbid(unsafe_code)]

use std::collections::HashMap;

use argon2::{Algorithm, Argon2, ParamsBuilder, Version};
use chacha20poly1305::{
    aead::{Aead, Payload},
    KeyInit, XChaCha20Poly1305, XNonce,
};
use zeroize::{Zeroize, Zeroizing};

/// On-disk format version (a bump is a migration). Bound into every AEAD AAD.
pub const FORMAT_VERSION: u8 = 1;

/// Argon2id cost floor (ADR 0001 §3): m = 64 MiB, t = 3, p = 1. Persisted *per vault* so a
/// later cost bump never locks out a vault that already exists. On-device cost adjustment lands
/// in a later step.
pub const ARGON2_M_COST_KIB: u32 = 64 * 1024;
/// Argon2id passes (t). See [`ARGON2_M_COST_KIB`].
pub const ARGON2_T_COST: u32 = 3;
/// Argon2id parallelism (p). See [`ARGON2_M_COST_KIB`].
pub const ARGON2_P_COST: u32 = 1;

const KEY_LEN: usize = 32;
const NONCE_LEN: usize = 24;
const SALT_LEN: usize = 16;
const RECORD_ID_LEN: usize = 16;

/// Opaque per-record identifier (16 CSPRNG bytes; never time-derived — ADR 0001 §4).
pub type RecordId = [u8; RECORD_ID_LEN];

/// Opaque handle to an unlocked vault. The vault key lives in the manager's registry,
/// **never in this value** (§1).
#[derive(Clone, Copy, PartialEq, Eq, Hash, Debug)]
pub struct VaultHandle(u64);

/// A decrypted check-in returned across the API (a plaintext domain object — allowed by §1).
#[derive(Clone, Debug, PartialEq, Eq)]
pub struct Checkin {
    pub record_id: RecordId,
    pub created_at: i64,
    /// The opaque record payload (for example the serialized Entry JSON). `lumi-vault` does not parse it.
    pub payload: String,
}

/// Persisted vault row (singleton). Holds only public / wrapped material — safe to store.
#[derive(Clone, Debug, PartialEq, Eq)]
pub struct VaultRow {
    pub format_version: u8,
    pub salt: Vec<u8>,
    pub argon2_m_cost_kib: u32,
    pub argon2_t_cost: u32,
    pub argon2_p_cost: u32,
    /// The vault key, AEAD-wrapped under the Argon2id PIN key.
    pub wrapped_vault_key: Vec<u8>,
    /// 24-byte nonce for the vault-key wrap.
    pub vault_nonce: Vec<u8>,
}

/// Persisted record row. Holds only ciphertext / wrapped material + plaintext index columns.
#[derive(Clone, Debug, PartialEq, Eq)]
pub struct RecordRow {
    pub record_id: RecordId,
    pub format_version: u8,
    /// The content key wrapped under the vault key; `None` once the record is crypto-shredded.
    pub wrapped_content_key: Option<Vec<u8>>,
    /// 24-byte nonce for the content-key wrap.
    pub key_nonce: Vec<u8>,
    /// 24-byte nonce for the payload seal.
    pub content_nonce: Vec<u8>,
    /// XChaCha20-Poly1305-sealed payload (ciphertext ‖ tag).
    pub ciphertext: Vec<u8>,
    /// Plaintext index column for the timeline order (slice-accepted per ADR 0004 (e);
    /// index hardening is a committed pre-ship follow-up).
    pub created_at: i64,
}

/// Storage backend error (opaque message; the SQLite impl maps its errors into this later).
#[derive(Clone, Debug)]
pub struct StoreError(pub String);

impl std::fmt::Display for StoreError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "vault store error: {}", self.0)
    }
}
impl std::error::Error for StoreError {}

/// Result alias for storage operations.
pub type StoreResult<T> = std::result::Result<T, StoreError>;

/// Persistence seam for the vault — designed to be satisfiable by SQLite (lumi-store, next step).
///
/// Implementations persist only the wrapped/ciphertext material in [`VaultRow`] / [`RecordRow`];
/// no key derivation or AEAD happens here.
pub trait VaultStore {
    /// Load the singleton vault row, if a vault exists.
    fn load_vault(&self) -> StoreResult<Option<VaultRow>>;
    /// Persist (create or replace) the singleton vault row.
    fn save_vault(&mut self, row: &VaultRow) -> StoreResult<()>;
    /// Insert a new record row.
    fn insert_record(&mut self, row: &RecordRow) -> StoreResult<()>;
    /// All record rows (order unspecified; the manager sorts).
    fn list_records(&self) -> StoreResult<Vec<RecordRow>>;
    /// Fetch one record row by id, if present.
    fn get_record(&self, id: &RecordId) -> StoreResult<Option<RecordRow>>;
    /// Crypto-shred: destroy the record's wrapped content key (its ciphertext becomes
    /// permanently unrecoverable). The row can persist as a tombstone. Returns `true` iff a
    /// live record's key was actually destroyed (so callers can confirm a real Art. 17
    /// erasure); `false` if the id was absent or already shredded. (The SQLite impl maps a
    /// 0-rows-affected `UPDATE` to `false`.)
    fn shred_record(&mut self, id: &RecordId) -> StoreResult<bool>;
}

/// Vault errors. **Carry no secret material** (safe to `Debug`/surface).
#[derive(Debug)]
pub enum Error {
    /// Handle not found / vault still locked.
    BadHandle,
    /// The unwrap of the vault key failed: **wrong PIN** or a tampered vault row. Fails closed.
    WrongPinOrCorruptVault,
    /// A record failed AEAD authentication (tampered/truncated ciphertext, AAD, or wrapped key).
    RecordIntegrity,
    /// Record not found or already crypto-shredded.
    NotFoundOrShredded,
    /// Argon2id failure (for example invalid parameters).
    Argon2,
    /// Unexpected AEAD / encoding failure during the seal step.
    Crypto,
    /// Storage backend error.
    Store(StoreError),
    /// Decrypted payload was not valid UTF-8.
    Encoding,
}

impl std::fmt::Display for Error {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        let s = match self {
            Error::BadHandle => "invalid or locked vault handle",
            Error::WrongPinOrCorruptVault => "wrong PIN or corrupt vault (failed closed)",
            Error::RecordIntegrity => "record failed authentication (tampered or truncated)",
            Error::NotFoundOrShredded => "record not found or crypto-shredded",
            Error::Argon2 => "Argon2id failure",
            Error::Crypto => "cryptographic failure",
            Error::Store(e) => return write!(f, "{e}"),
            Error::Encoding => "decrypted payload was not valid UTF-8",
        };
        f.write_str(s)
    }
}
impl std::error::Error for Error {}
impl From<StoreError> for Error {
    fn from(e: StoreError) -> Self {
        Error::Store(e)
    }
}

/// Result alias for vault operations.
pub type Result<T> = std::result::Result<T, Error>;

// ---------------------------------------------------------------------------
// CSPRNG + AAD helpers
// ---------------------------------------------------------------------------

fn fill_random(buf: &mut [u8]) -> Result<()> {
    getrandom::getrandom(buf).map_err(|_| Error::Crypto)
}

fn random_nonce() -> Result<[u8; NONCE_LEN]> {
    let mut n = [0u8; NONCE_LEN];
    fill_random(&mut n)?;
    Ok(n)
}

/// AAD operation-role tags. The content-key *wrap* and the payload *seal* already use
/// different keys (vault key vs content key), so they are domain-separated; the explicit
/// role tag is defense-in-depth + self-explanatory, and guards a future refactor that could
/// unify the keys.
const AAD_ROLE_WRAP: &[u8] = b"wrap";
const AAD_ROLE_SEAL: &[u8] = b"seal";

/// AAD binding a record AEAD to its id, format version, and operation role.
fn record_aad(id: &RecordId, fmt: u8, role: &[u8]) -> Vec<u8> {
    let mut a = Vec::with_capacity(RECORD_ID_LEN + 1 + role.len());
    a.extend_from_slice(id);
    a.push(fmt);
    a.extend_from_slice(role);
    a
}

/// AAD (domain separation) for the vault-key wrap.
fn vault_aad(fmt: u8) -> Vec<u8> {
    let mut a = b"lumi-vault-key".to_vec();
    a.push(fmt);
    a
}

// ---------------------------------------------------------------------------
// AEAD (XChaCha20-Poly1305) wrap / open
// ---------------------------------------------------------------------------

fn aead_seal(key: &[u8; KEY_LEN], nonce: &[u8; NONCE_LEN], plaintext: &[u8], aad: &[u8]) -> Result<Vec<u8>> {
    let cipher = XChaCha20Poly1305::new_from_slice(key).map_err(|_| Error::Crypto)?;
    cipher
        .encrypt(XNonce::from_slice(nonce), Payload { msg: plaintext, aad })
        .map_err(|_| Error::Crypto)
}

/// Neutral open (returns `Err(())` on any failure); callers map to the right [`Error`].
fn aead_open(key: &[u8; KEY_LEN], nonce: &[u8], ct: &[u8], aad: &[u8]) -> std::result::Result<Vec<u8>, ()> {
    if nonce.len() != NONCE_LEN {
        return Err(());
    }
    let cipher = XChaCha20Poly1305::new_from_slice(key).map_err(|_| ())?;
    cipher
        .decrypt(XNonce::from_slice(nonce), Payload { msg: ct, aad })
        .map_err(|_| ())
}

/// Open a wrapped 32-byte key into a `Zeroizing` buffer (neutral error).
fn open_key32(
    kek: &[u8; KEY_LEN],
    nonce: &[u8],
    wrapped: &[u8],
    aad: &[u8],
) -> std::result::Result<Zeroizing<[u8; KEY_LEN]>, ()> {
    let mut v = aead_open(kek, nonce, wrapped, aad)?;
    if v.len() != KEY_LEN {
        v.zeroize();
        return Err(());
    }
    let mut k = Zeroizing::new([0u8; KEY_LEN]);
    k.copy_from_slice(&v);
    v.zeroize();
    Ok(k)
}

// ---------------------------------------------------------------------------
// Argon2id PIN-key derivation
// ---------------------------------------------------------------------------

fn derive_pin_key(pin: &str, salt: &[u8], m_cost_kib: u32, t_cost: u32, p_cost: u32) -> Result<Zeroizing<[u8; KEY_LEN]>> {
    let mut builder = ParamsBuilder::new();
    builder.m_cost(m_cost_kib).t_cost(t_cost).p_cost(p_cost).output_len(KEY_LEN);
    let params = builder.build().map_err(|_| Error::Argon2)?;
    let argon = Argon2::new(Algorithm::Argon2id, Version::V0x13, params);
    let mut key = Zeroizing::new([0u8; KEY_LEN]);
    argon
        .hash_password_into(pin.as_bytes(), salt, &mut key[..])
        .map_err(|_| Error::Argon2)?;
    Ok(key)
}

// ---------------------------------------------------------------------------
// VaultManager — the in-process registry + the public API
// ---------------------------------------------------------------------------

/// Owns the storage backend and the in-process registry of unlocked vault keys. Keys live
/// only here, behind opaque [`VaultHandle`]s; the drop of the manager (or of a
/// [`VaultManager::lock`]ed handle) zeroizes them.
pub struct VaultManager<S: VaultStore> {
    store: S,
    registry: HashMap<u64, Zeroizing<[u8; KEY_LEN]>>,
    next: u64,
}

impl<S: VaultStore> VaultManager<S> {
    /// Build a manager over a storage backend. All vaults stay locked until [`Self::unlock_vault`].
    pub fn new(store: S) -> Self {
        Self { store, registry: HashMap::new(), next: 1 }
    }

    /// Unlock (or, on first run, create) the vault with `pin`.
    ///
    /// First run: CSPRNG a salt + a 32-byte vault key, wrap the vault key under the Argon2id
    /// PIN key, and persist the vault row. Subsequent runs: re-derive the PIN key and unwrap
    /// the vault key. A wrong PIN is an AEAD authentication failure → [`Error::WrongPinOrCorruptVault`]
    /// (fails closed, zero plaintext).
    pub fn unlock_vault(&mut self, pin: &str) -> Result<VaultHandle> {
        let vault_key = match self.store.load_vault()? {
            Some(row) => {
                let pin_key = derive_pin_key(pin, &row.salt, row.argon2_m_cost_kib, row.argon2_t_cost, row.argon2_p_cost)?;
                open_key32(&pin_key, &row.vault_nonce, &row.wrapped_vault_key, &vault_aad(row.format_version))
                    .map_err(|_| Error::WrongPinOrCorruptVault)?
            }
            None => {
                let mut salt = vec![0u8; SALT_LEN];
                fill_random(&mut salt)?;
                let pin_key = derive_pin_key(pin, &salt, ARGON2_M_COST_KIB, ARGON2_T_COST, ARGON2_P_COST)?;
                let mut vault_key = Zeroizing::new([0u8; KEY_LEN]);
                fill_random(&mut vault_key[..])?;
                let nonce = random_nonce()?;
                // XChaCha20-Poly1305 always emits pt_len + 16 bytes, and `open_key32`
                // re-validates the unwrapped length on every unlock, so no seal-side length
                // assert is needed here (open side fails closed on any malformed wrap).
                let wrapped_vault_key = aead_seal(&pin_key, &nonce, &vault_key[..], &vault_aad(FORMAT_VERSION))?;
                self.store.save_vault(&VaultRow {
                    format_version: FORMAT_VERSION,
                    salt,
                    argon2_m_cost_kib: ARGON2_M_COST_KIB,
                    argon2_t_cost: ARGON2_T_COST,
                    argon2_p_cost: ARGON2_P_COST,
                    wrapped_vault_key,
                    vault_nonce: nonce.to_vec(),
                })?;
                vault_key
            }
        };
        let h = self.next;
        self.next += 1;
        self.registry.insert(h, vault_key);
        Ok(VaultHandle(h))
    }

    /// Drop (and zeroize) the vault key behind a handle.
    pub fn lock(&mut self, handle: VaultHandle) {
        // `Zeroizing` wipes the key on drop.
        self.registry.remove(&handle.0);
    }

    /// Seal a check-in payload at rest and persist it; returns its opaque record id.
    ///
    /// `created_at` is a caller-supplied local timestamp stored as a plaintext index column
    /// (ADR 0004 (e)); `lumi-vault` does not read the wall clock (keeps it deterministic and
    /// pure). `record_json` is opaque to this crate.
    pub fn put_checkin(&mut self, handle: VaultHandle, record_json: &str, created_at: i64) -> Result<RecordId> {
        // Copy the vault key out so that we do not hold a registry borrow across the &mut store borrow.
        // The transient copy goes straight into `Zeroizing` (its only persistent home), which wipes
        // it on drop; the registry's copy stays as it is, and nothing crosses the API (§1).
        let vault_key: Zeroizing<[u8; KEY_LEN]> = Zeroizing::new(**self.require_key(handle)?);

        let mut record_id = [0u8; RECORD_ID_LEN];
        fill_random(&mut record_id)?;

        let mut content_key = Zeroizing::new([0u8; KEY_LEN]);
        fill_random(&mut content_key[..])?;

        let content_nonce = random_nonce()?;
        let ciphertext = aead_seal(
            &content_key,
            &content_nonce,
            record_json.as_bytes(),
            &record_aad(&record_id, FORMAT_VERSION, AAD_ROLE_SEAL),
        )?;

        let key_nonce = random_nonce()?;
        let wrapped_content_key = aead_seal(
            &vault_key,
            &key_nonce,
            &content_key[..],
            &record_aad(&record_id, FORMAT_VERSION, AAD_ROLE_WRAP),
        )?;

        self.store.insert_record(&RecordRow {
            record_id,
            format_version: FORMAT_VERSION,
            wrapped_content_key: Some(wrapped_content_key),
            key_nonce: key_nonce.to_vec(),
            content_nonce: content_nonce.to_vec(),
            ciphertext,
            created_at,
        })?;
        Ok(record_id)
    }

    /// Decrypt and return all live records (the call skips crypto-shredded rows), sorted by
    /// `created_at` then `record_id`. Any *tampered* record fails the whole call closed.
    pub fn list_checkins(&self, handle: VaultHandle) -> Result<Vec<Checkin>> {
        let vault_key = self.require_key(handle)?;
        let mut out = Vec::new();
        for row in self.store.list_records()? {
            if row.wrapped_content_key.is_none() {
                continue; // crypto-shredded
            }
            out.push(open_row(vault_key, &row)?);
        }
        out.sort_by(|a, b| a.created_at.cmp(&b.created_at).then_with(|| a.record_id.cmp(&b.record_id)));
        Ok(out)
    }

    /// Decrypt and return a single record by id. Returns [`Error::NotFoundOrShredded`] for a
    /// absent or shredded record, [`Error::RecordIntegrity`] for a tampered one.
    pub fn get_checkin(&self, handle: VaultHandle, id: RecordId) -> Result<Checkin> {
        let vault_key = self.require_key(handle)?;
        let row = self.store.get_record(&id)?.ok_or(Error::NotFoundOrShredded)?;
        open_row(vault_key, &row)
    }

    /// Crypto-shred a record: destroy its wrapped content key so the ciphertext is permanently
    /// unrecoverable (GDPR Art. 17). Requires an unlocked handle (access control). Returns
    /// [`Error::NotFoundOrShredded`] if the record is absent or was already shredded, so the
    /// caller gets explicit confirmation that an erasure actually happened.
    pub fn shred_checkin(&mut self, handle: VaultHandle, id: RecordId) -> Result<()> {
        self.require_key(handle)?; // needs an unlocked vault; borrow ends here
        if self.store.shred_record(&id)? {
            Ok(())
        } else {
            Err(Error::NotFoundOrShredded)
        }
    }

    fn require_key(&self, handle: VaultHandle) -> Result<&Zeroizing<[u8; KEY_LEN]>> {
        self.registry.get(&handle.0).ok_or(Error::BadHandle)
    }
}

/// Open one record row with the vault key. `None` wrapped key → shredded; any AEAD failure →
/// [`Error::RecordIntegrity`] (fail closed).
fn open_row(vault_key: &[u8; KEY_LEN], row: &RecordRow) -> Result<Checkin> {
    let wrapped = row.wrapped_content_key.as_deref().ok_or(Error::NotFoundOrShredded)?;
    let content_key = open_key32(
        vault_key,
        &row.key_nonce,
        wrapped,
        &record_aad(&row.record_id, row.format_version, AAD_ROLE_WRAP),
    )
    .map_err(|_| Error::RecordIntegrity)?;
    let pt = aead_open(
        &content_key,
        &row.content_nonce,
        &row.ciphertext,
        &record_aad(&row.record_id, row.format_version, AAD_ROLE_SEAL),
    )
    .map_err(|_| Error::RecordIntegrity)?;
    let payload = match String::from_utf8(pt) {
        Ok(s) => s,
        Err(e) => {
            let mut bytes = e.into_bytes();
            bytes.zeroize();
            return Err(Error::Encoding);
        }
    };
    Ok(Checkin { record_id: row.record_id, created_at: row.created_at, payload })
}

// ---------------------------------------------------------------------------
// In-memory reference store (used by tests; satisfiable-by-SQLite shape)
// ---------------------------------------------------------------------------

pub mod memory {
    //! An in-process [`VaultStore`] reference implementation (no persistence to disk). Used by
    //! tests and as the contract SQLite (lumi-store) will satisfy next.
    use super::{RecordId, RecordRow, StoreResult, VaultRow, VaultStore};
    use std::sync::{Arc, Mutex};

    #[derive(Default)]
    struct Inner {
        vault: Option<VaultRow>,
        records: Vec<RecordRow>,
    }

    /// Shared in-memory store. `clone()` shares the same data, so 2 managers can
    /// open the same "database" (the reopen test uses this).
    #[derive(Clone, Default)]
    pub struct InMemoryStore(Arc<Mutex<Inner>>);

    impl InMemoryStore {
        pub fn new() -> Self {
            Self::default()
        }

        /// Snapshot of the current record rows (test helper).
        pub fn raw_records(&self) -> Vec<RecordRow> {
            self.0.lock().expect("store mutex").records.clone()
        }

        /// Replace all record rows (test helper to simulate a hostile change of the rows on disk).
        pub fn set_records(&self, rows: Vec<RecordRow>) {
            self.0.lock().expect("store mutex").records = rows;
        }

        /// Snapshot of the vault row (test helper).
        pub fn raw_vault(&self) -> Option<VaultRow> {
            self.0.lock().expect("store mutex").vault.clone()
        }

        /// Replace the vault row (test helper to simulate a hostile change of the vault row on disk).
        pub fn set_vault(&self, row: VaultRow) {
            self.0.lock().expect("store mutex").vault = Some(row);
        }
    }

    impl VaultStore for InMemoryStore {
        fn load_vault(&self) -> StoreResult<Option<VaultRow>> {
            Ok(self.0.lock().expect("store mutex").vault.clone())
        }
        fn save_vault(&mut self, row: &VaultRow) -> StoreResult<()> {
            self.0.lock().expect("store mutex").vault = Some(row.clone());
            Ok(())
        }
        fn insert_record(&mut self, row: &RecordRow) -> StoreResult<()> {
            self.0.lock().expect("store mutex").records.push(row.clone());
            Ok(())
        }
        fn list_records(&self) -> StoreResult<Vec<RecordRow>> {
            Ok(self.0.lock().expect("store mutex").records.clone())
        }
        fn get_record(&self, id: &RecordId) -> StoreResult<Option<RecordRow>> {
            Ok(self.0.lock().expect("store mutex").records.iter().find(|r| &r.record_id == id).cloned())
        }
        fn shred_record(&mut self, id: &RecordId) -> StoreResult<bool> {
            let mut g = self.0.lock().expect("store mutex");
            if let Some(r) = g.records.iter_mut().find(|r| &r.record_id == id) {
                // `take()` destroys the only copy of the wrapped content key; `true` iff one was present.
                if r.wrapped_content_key.take().is_some() {
                    return Ok(true);
                }
            }
            Ok(false)
        }
    }
}

// ---------------------------------------------------------------------------
// Known-Answer Tests (KATs) + primitive integrity — pure crypto, musl-green
// ---------------------------------------------------------------------------

#[cfg(test)]
mod kat {
    use super::*;

    fn unhex(s: &str) -> Vec<u8> {
        let s: String = s.chars().filter(|c| !c.is_whitespace()).collect();
        assert!(s.len() % 2 == 0, "odd hex length");
        (0..s.len()).step_by(2).map(|i| u8::from_str_radix(&s[i..i + 2], 16).expect("hex")).collect()
    }

    /// Argon2id reference vector, RFC 9106 §5.3 (with secret key + associated data; v=0x13,
    /// m=32 KiB, t=3, p=4, tag=32). Proves the `argon2` crate matches the standard.
    #[test]
    fn kat_argon2id_rfc9106() {
        let password = [0x01u8; 32];
        let salt = [0x02u8; 16];
        let secret = [0x03u8; 8];
        let ad = [0x04u8; 12];
        let expected = unhex("0d640df58d78766c08c037a34a8b53c9d01ef0452d75b65eb52520e96b01e659");

        let mut builder = ParamsBuilder::new();
        builder.m_cost(32).t_cost(3).p_cost(4).output_len(32);
        builder.data(argon2::AssociatedData::new(&ad).expect("associated data"));
        let params = builder.build().expect("params");
        let argon = Argon2::new_with_secret(&secret, Algorithm::Argon2id, Version::V0x13, params).expect("argon");

        let mut out = [0u8; 32];
        argon.hash_password_into(&password, &salt, &mut out).expect("hash");
        assert_eq!(out.to_vec(), expected, "Argon2id RFC 9106 vector mismatch");
    }

    /// AEAD_XChaCha20_Poly1305 reference vector, draft-irtf-cfrg-xchacha-03 §A.3.1. Proves the
    /// `chacha20poly1305` crate's `XChaCha20Poly1305` (24-byte nonce) matches the standard.
    #[test]
    fn kat_xchacha20poly1305_draft03() {
        let key = unhex("808182838485868788898a8b8c8d8e8f909192939495969798999a9b9c9d9e9f");
        let nonce = unhex("404142434445464748494a4b4c4d4e4f5051525354555657");
        let aad = unhex("50515253c0c1c2c3c4c5c6c7");
        let plaintext = unhex(
            "4c616469657320616e642047656e746c656d656e206f662074686520636c6173\
             73206f66202739393a204966204920636f756c64206f6666657220796f75206f\
             6e6c79206f6e652074697020666f7220746865206675747572652c2073756e73\
             637265656e20776f756c642062652069742e",
        );
        let expected_ct_tag = unhex(
            // ciphertext ‖ Poly1305 tag
            "bd6d179d3e83d43b9576579493c0e939572a1700252bfaccbed2902c21396cbb\
             731c7f1b0b4aa6440bf3a82f4eda7e39ae64c6708c54c216cb96b72e1213b452\
             2f8c9ba40db5d945b11b69b982c1bb9e3f3fac2bc369488f76b2383565d3fff9\
             21f9664c97637da9768812f615c68b13b52e\
             c0875924c1c7987947deafd8780acf49",
        );

        let cipher = XChaCha20Poly1305::new_from_slice(&key).expect("key");
        let ct = cipher
            .encrypt(XNonce::from_slice(&nonce), Payload { msg: &plaintext, aad: &aad })
            .expect("encrypt");
        assert_eq!(ct, expected_ct_tag, "XChaCha20-Poly1305 draft-03 vector mismatch");

        let back = cipher
            .decrypt(XNonce::from_slice(&nonce), Payload { msg: &ct, aad: &aad })
            .expect("decrypt");
        assert_eq!(back, plaintext, "XChaCha20-Poly1305 decrypt round-trip mismatch");
    }

    /// AEAD integrity at the primitive level: tampered ciphertext, tampered AAD, truncation,
    /// and a wrong key each fail authentication (our `aead_seal`/`aead_open` helpers).
    #[test]
    fn aead_integrity_fails_closed() {
        let key = [0x07u8; KEY_LEN];
        let nonce = random_nonce().expect("nonce");
        let aad = b"record-aad-v1";
        let pt = b"a secret check-in payload";

        let ct = aead_seal(&key, &nonce, pt, aad).expect("seal");
        assert_eq!(aead_open(&key, &nonce, &ct, aad).expect("open"), pt);

        // tampered ciphertext
        let mut bad = ct.clone();
        bad[0] ^= 0x01;
        assert!(aead_open(&key, &nonce, &bad, aad).is_err(), "tampered ciphertext must fail");

        // tampered AAD
        assert!(aead_open(&key, &nonce, &ct, b"record-aad-v2").is_err(), "tampered AAD must fail");

        // truncated input
        assert!(aead_open(&key, &nonce, &ct[..ct.len() - 1], aad).is_err(), "truncated must fail");

        // wrong key
        let mut wrong = key;
        wrong[0] ^= 0x01;
        assert!(aead_open(&wrong, &nonce, &ct, aad).is_err(), "wrong key must fail");
    }

    /// The nonce source is fresh CSPRNG: many draws are 24 bytes, non-constant, and distinct.
    /// (A constant, derived or counter-collision nonce would surface here.)
    #[test]
    fn random_nonce_is_fresh_and_distinct() {
        use std::collections::HashSet;
        let mut seen = HashSet::new();
        for _ in 0..2000 {
            let n = random_nonce().expect("nonce");
            assert_eq!(n.len(), NONCE_LEN);
            assert!(n.iter().any(|&b| b != 0), "nonce must not be all-zero");
            assert!(seen.insert(n), "random_nonce produced a duplicate — not fresh CSPRNG");
        }
    }
}
