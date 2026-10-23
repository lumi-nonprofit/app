//! `lumi-ffi-cabi` — the C ABI (cbindgen) over `lumi-vault`. This is the **unsafe boundary** the
//! Nitro C++ HybridObject links against (ADR 0004 (a)). It is the *only* crate in `core/` that
//! carries `unsafe`; `lumi-ffi` stays a safe re-export facade, and `lumi-vault` is unchanged.
//!
//! ## Surface (mirrors the Nitro spec it will sit under)
//! - [`lumi_vault_open`] / [`lumi_vault_close`] — open the DB + init the process-global manager.
//! - [`lumi_unlock_vault`] `(pin) -> handle`
//! - [`lumi_put_checkin`] `(handle, record_json, created_at) -> record_id`
//! - [`lumi_list_checkins`] `(handle) -> JSON array string`
//! - [`lumi_shred_checkin`] `(handle, record_id) -> bool`
//! - [`lumi_string_free`] — free a string this library returned.
//!
//! ## S1 (no key bytes cross the boundary)
//! Every `extern "C"` signature carries only: an opaque `u64` handle, the PIN inbound (a *user
//! passphrase*, not a key — Argon2id runs inside lumi-vault and the derived keys never leave),
//! plaintext domain JSON, a 16-byte opaque `record_id`, an `i64 created_at`, a `bool`, and `i32`
//! error codes. The vault key and per-record content keys stay in lumi-vault behind the handle.
//! Because lumi-vault's `VaultHandle` is opaque (its inner `u64` is private and we must not change
//! lumi-vault), we keep a small C-side registry mapping our opaque `u64` to the `VaultHandle`.
//!
//! ## No panic across the boundary
//! A Rust panic that unwinds into C is UB. lumi-vault has a no-panic design, but every entry point
//! runs inside [`std::panic::catch_unwind`] as a **backstop** that converts any panic into
//! [`LUMI_ERR_PANIC`] (chosen over `panic = "abort"` so an unexpected internal panic surfaces as a
//! recoverable error and does not crash a mental-health app). This requires panics that unwind — do
//! **not** set `panic = "abort"` for this crate.
//!
//! ## Memory ownership
//! Strings that this library returns (for example from [`lumi_list_checkins`]) are Rust-allocated,
//! and Rust MUST free them through [`lumi_string_free`] — never C `free()`. `record_id` uses a
//! caller-provided 16-byte buffer (no allocation, nothing to free).

#![deny(unsafe_op_in_unsafe_fn)]

use std::collections::HashMap;
use std::ffi::{c_char, CStr, CString};
use std::panic::{catch_unwind, AssertUnwindSafe};
use std::sync::{LazyLock, Mutex, MutexGuard};

use lumi_store::SqliteStore;
use lumi_vault::{Checkin, Error, VaultHandle, VaultManager};

// ---- stable C error codes (cbindgen emits these) ----

/// Success.
pub const LUMI_OK: i32 = 0;
/// A required pointer argument was NULL.
pub const LUMI_ERR_NULL_ARG: i32 = -1;
/// A C-string argument (PIN / JSON / path) was not valid UTF-8.
pub const LUMI_ERR_UTF8: i32 = -2;
/// The vault manager is not open (call `lumi_vault_open` first).
pub const LUMI_ERR_NOT_OPEN: i32 = -3;
/// Unknown / stale vault handle.
pub const LUMI_ERR_BAD_HANDLE: i32 = -4;
/// Wrong PIN or a corrupt vault row (fails closed).
pub const LUMI_ERR_WRONG_PIN: i32 = -5;
/// A record failed authentication (tampered / truncated).
pub const LUMI_ERR_RECORD_INTEGRITY: i32 = -6;
/// Record not found or already crypto-shredded.
pub const LUMI_ERR_NOT_FOUND: i32 = -7;
/// Argon2id failure.
pub const LUMI_ERR_ARGON2: i32 = -8;
/// Unexpected cryptographic failure.
pub const LUMI_ERR_CRYPTO: i32 = -9;
/// Storage backend error.
pub const LUMI_ERR_STORE: i32 = -10;
/// Decrypted payload was not valid UTF-8.
pub const LUMI_ERR_ENCODING: i32 = -11;
/// The boundary caught a panic (this must never happen; backstop only).
pub const LUMI_ERR_PANIC: i32 = -12;

/// Length of an opaque record id, in bytes.
pub const LUMI_RECORD_ID_LEN: usize = 16;

/// Compile-time guard: this ABI constant MUST equal lumi-vault's `RecordId` size, or the fixed
/// 16-byte `copy_nonoverlapping`s in put/shred would read/write out of bounds. lumi-vault's private
/// `RECORD_ID_LEN` has no public path, so any future divergence becomes a build error here, not UB.
const _: () = assert!(LUMI_RECORD_ID_LEN == core::mem::size_of::<lumi_vault::RecordId>());

// ---- process-global state ----

struct State {
    manager: Option<VaultManager<SqliteStore>>,
    /// C-side opaque handle -> lumi-vault `VaultHandle`. **Invariant:** an entry exists only while
    /// `manager` is `Some` (inserted on unlock; cleared on open/close under this same lock). So a
    /// live handle implies the vault is open, which makes the `NOT_OPEN` arms in put/list/shred
    /// effectively unreachable (a post-close handle no longer exists -> `BAD_HANDLE`). Handles persist for the
    /// open session (no per-handle removal yet); ids are monotonic `u64` (no practical reuse/wrap).
    handles: HashMap<u64, VaultHandle>,
    next: u64,
}

static STATE: LazyLock<Mutex<State>> =
    LazyLock::new(|| Mutex::new(State { manager: None, handles: HashMap::new(), next: 1 }));

fn lock_state() -> MutexGuard<'static, State> {
    // Recover from a poisoned lock: a panic mid-operation must not wedge the whole library.
    STATE.lock().unwrap_or_else(|p| p.into_inner())
}

fn map_err(e: &Error) -> i32 {
    match e {
        Error::BadHandle => LUMI_ERR_BAD_HANDLE,
        Error::WrongPinOrCorruptVault => LUMI_ERR_WRONG_PIN,
        Error::RecordIntegrity => LUMI_ERR_RECORD_INTEGRITY,
        Error::NotFoundOrShredded => LUMI_ERR_NOT_FOUND,
        Error::Argon2 => LUMI_ERR_ARGON2,
        Error::Crypto => LUMI_ERR_CRYPTO,
        Error::Store(_) => LUMI_ERR_STORE,
        Error::Encoding => LUMI_ERR_ENCODING,
    }
}

/// Run an entry-point body and convert any panic into [`LUMI_ERR_PANIC`] (nothing unwinds into C).
fn ffi_guard(f: impl FnOnce() -> i32) -> i32 {
    match catch_unwind(AssertUnwindSafe(f)) {
        Ok(code) => code,
        Err(_) => LUMI_ERR_PANIC,
    }
}

fn hex16(b: &[u8; LUMI_RECORD_ID_LEN]) -> String {
    const H: &[u8; 16] = b"0123456789abcdef";
    let mut s = String::with_capacity(LUMI_RECORD_ID_LEN * 2);
    for &byte in b.iter() {
        s.push(H[(byte >> 4) as usize] as char);
        s.push(H[(byte & 0x0f) as usize] as char);
    }
    s
}

/// Escape a string as a JSON string body (so an arbitrary payload embeds safely; also removes any
/// interior NUL, so the result stays valid for `CString`).
fn escape_json(s: &str) -> String {
    let mut o = String::with_capacity(s.len() + 2);
    for ch in s.chars() {
        match ch {
            '"' => o.push_str("\\\""),
            '\\' => o.push_str("\\\\"),
            '\n' => o.push_str("\\n"),
            '\r' => o.push_str("\\r"),
            '\t' => o.push_str("\\t"),
            c if (c as u32) < 0x20 => o.push_str(&format!("\\u{:04x}", c as u32)),
            c => o.push(c),
        }
    }
    o
}

/// `[{"record_id":"<hex>","created_at":<i64>,"payload":"<escaped JSON string>"}]`.
/// `payload` is the original record JSON, escaped — the caller `JSON.parse`s it.
fn build_list_json(checkins: &[Checkin]) -> String {
    let mut s = String::from("[");
    for (i, c) in checkins.iter().enumerate() {
        if i > 0 {
            s.push(',');
        }
        s.push_str("{\"record_id\":\"");
        s.push_str(&hex16(&c.record_id));
        s.push_str("\",\"created_at\":");
        s.push_str(&c.created_at.to_string());
        s.push_str(",\"payload\":\"");
        s.push_str(&escape_json(&c.payload));
        s.push_str("\"}");
    }
    s.push(']');
    s
}

// ---- entry points ----

/// Open (or create) the vault DB at `db_path` (UTF-8) and initialise the process-global manager
/// over it. Call it before `lumi_unlock_vault`. Returns [`LUMI_OK`] or an error code.
///
/// # Safety
/// `db_path` must be NULL (-> [`LUMI_ERR_NULL_ARG`]) or a valid, live, NUL-terminated C string
/// that stays readable and unmodified for the duration of the call.
#[unsafe(no_mangle)]
pub unsafe extern "C" fn lumi_vault_open(db_path: *const c_char) -> i32 {
    ffi_guard(|| {
        if db_path.is_null() {
            return LUMI_ERR_NULL_ARG;
        }
        let path = match unsafe { CStr::from_ptr(db_path) }.to_str() {
            Ok(s) => s,
            Err(_) => return LUMI_ERR_UTF8,
        };
        let store = match SqliteStore::open(path) {
            Ok(s) => s,
            Err(_) => return LUMI_ERR_STORE,
        };
        let mut st = lock_state();
        st.manager = Some(VaultManager::new(store));
        st.handles.clear(); // any handles from a prior session are stale
        LUMI_OK
    })
}

/// Drop the manager (this zeroizes the in-memory vault keys) and forget all handles.
///
/// # Safety
/// Takes no pointer arguments; always safe to call.
#[unsafe(no_mangle)]
pub unsafe extern "C" fn lumi_vault_close() -> i32 {
    ffi_guard(|| {
        let mut st = lock_state();
        st.manager = None; // the drop of the VaultManager zeroizes its key registry
        st.handles.clear();
        LUMI_OK
    })
}

/// Unlock (or, on first run, create) the vault with `pin`. On success writes an opaque handle to
/// `*out_handle`. Wrong PIN -> [`LUMI_ERR_WRONG_PIN`] (fails closed).
///
/// # Safety
/// `pin` must be a valid, live, NUL-terminated C string (or NULL -> [`LUMI_ERR_NULL_ARG`]),
/// readable for the call. `out_handle` must be NULL or a valid, aligned, writable `uint64_t`.
/// The call writes `*out_handle` only on [`LUMI_OK`] (and sets it to 0 otherwise).
#[unsafe(no_mangle)]
pub unsafe extern "C" fn lumi_unlock_vault(pin: *const c_char, out_handle: *mut u64) -> i32 {
    ffi_guard(|| {
        if pin.is_null() || out_handle.is_null() {
            return LUMI_ERR_NULL_ARG;
        }
        // Default the out-param so that a caller that breaks the contract and reads it after an error sees 0.
        unsafe { *out_handle = 0 };
        let pin = match unsafe { CStr::from_ptr(pin) }.to_str() {
            Ok(s) => s,
            Err(_) => return LUMI_ERR_UTF8,
        };
        let mut st = lock_state();
        let vh = {
            let mgr = match st.manager.as_mut() {
                Some(m) => m,
                None => return LUMI_ERR_NOT_OPEN,
            };
            match mgr.unlock_vault(pin) {
                Ok(vh) => vh,
                Err(e) => return map_err(&e),
            }
        };
        let id = st.next;
        st.next += 1;
        st.handles.insert(id, vh);
        unsafe { *out_handle = id };
        LUMI_OK
    })
}

/// Seal a check-in at rest. `record_json` is opaque plaintext JSON; `out_record_id` must point to a
/// caller-allocated [`LUMI_RECORD_ID_LEN`]-byte buffer, which receives the opaque record id.
///
/// # Safety
/// `record_json` must be a valid, live, NUL-terminated C string (or NULL ->
/// [`LUMI_ERR_NULL_ARG`]). `out_record_id` must be NULL or point to at least [`LUMI_RECORD_ID_LEN`]
/// writable, aligned bytes. The call writes `*out_record_id` only on [`LUMI_OK`].
#[unsafe(no_mangle)]
pub unsafe extern "C" fn lumi_put_checkin(
    handle: u64,
    record_json: *const c_char,
    created_at: i64,
    out_record_id: *mut u8,
) -> i32 {
    ffi_guard(|| {
        if record_json.is_null() || out_record_id.is_null() {
            return LUMI_ERR_NULL_ARG;
        }
        let json = match unsafe { CStr::from_ptr(record_json) }.to_str() {
            Ok(s) => s,
            Err(_) => return LUMI_ERR_UTF8,
        };
        let mut st = lock_state();
        let vh = match st.handles.get(&handle) {
            Some(v) => *v,
            None => return LUMI_ERR_BAD_HANDLE,
        };
        let mgr = match st.manager.as_mut() {
            Some(m) => m,
            None => return LUMI_ERR_NOT_OPEN,
        };
        match mgr.put_checkin(vh, json, created_at) {
            Ok(rid) => {
                // SAFETY: caller guarantees out_record_id points to >= LUMI_RECORD_ID_LEN bytes.
                unsafe { std::ptr::copy_nonoverlapping(rid.as_ptr(), out_record_id, LUMI_RECORD_ID_LEN) };
                LUMI_OK
            }
            Err(e) => map_err(&e),
        }
    })
}

/// Decrypt and return all live records as a JSON array string (see [`build_list_json`]). On success
/// writes a Rust-allocated C string to `*out_json`; free it with [`lumi_string_free`]. Any tampered
/// record fails the whole call closed ([`LUMI_ERR_RECORD_INTEGRITY`]).
///
/// # Safety
/// `out_json` must be NULL ( -> [`LUMI_ERR_NULL_ARG`]) or a valid, aligned, writable `char *` slot.
/// `*out_json` receives an owned string ONLY on [`LUMI_OK`] (defaulted to NULL otherwise); free it
/// exactly once with [`lumi_string_free`], never with C `free()`.
#[unsafe(no_mangle)]
pub unsafe extern "C" fn lumi_list_checkins(handle: u64, out_json: *mut *mut c_char) -> i32 {
    ffi_guard(|| {
        if out_json.is_null() {
            return LUMI_ERR_NULL_ARG;
        }
        // Default the out-param so error paths never leave a garbage pointer for lumi_string_free.
        unsafe { *out_json = std::ptr::null_mut() };
        let checkins = {
            let st = lock_state();
            let vh = match st.handles.get(&handle) {
                Some(v) => *v,
                None => return LUMI_ERR_BAD_HANDLE,
            };
            let mgr = match st.manager.as_ref() {
                Some(m) => m,
                None => return LUMI_ERR_NOT_OPEN,
            };
            match mgr.list_checkins(vh) {
                Ok(c) => c,
                Err(e) => return map_err(&e),
            }
        }; // lock released before the C string allocation
        let json = build_list_json(&checkins);
        debug_assert!(!json.as_bytes().contains(&0), "escape_json must strip interior NUL");
        let cstr = match CString::new(json) {
            Ok(c) => c,
            Err(_) => return LUMI_ERR_ENCODING, // unreachable: escape_json removes interior NUL
        };
        // SAFETY: out_json is non-null (checked); ownership of the allocation passes to the caller.
        unsafe { *out_json = cstr.into_raw() };
        LUMI_OK
    })
}

/// Crypto-shred a record. `record_id` must point to [`LUMI_RECORD_ID_LEN`] bytes. Writes to
/// `*out_destroyed`: `true` if the call destroyed a live record, `false` if it was absent / already
/// shredded (both are [`LUMI_OK`]); real failures return an error code.
///
/// # Safety
/// `record_id` must be NULL ( -> [`LUMI_ERR_NULL_ARG`]) or point to at least [`LUMI_RECORD_ID_LEN`]
/// readable, aligned bytes. `out_destroyed` must be NULL or a valid, aligned, writable `bool`.
/// `*out_destroyed` is meaningful only on [`LUMI_OK`] (defaulted to `false` otherwise).
#[unsafe(no_mangle)]
pub unsafe extern "C" fn lumi_shred_checkin(handle: u64, record_id: *const u8, out_destroyed: *mut bool) -> i32 {
    ffi_guard(|| {
        if record_id.is_null() || out_destroyed.is_null() {
            return LUMI_ERR_NULL_ARG;
        }
        // Default the out-param so error paths leave a safe value.
        unsafe { *out_destroyed = false };
        let mut rid = [0u8; LUMI_RECORD_ID_LEN];
        // SAFETY: caller guarantees record_id points to >= LUMI_RECORD_ID_LEN bytes.
        unsafe { std::ptr::copy_nonoverlapping(record_id, rid.as_mut_ptr(), LUMI_RECORD_ID_LEN) };

        let mut st = lock_state();
        let vh = match st.handles.get(&handle) {
            Some(v) => *v,
            None => return LUMI_ERR_BAD_HANDLE,
        };
        let mgr = match st.manager.as_mut() {
            Some(m) => m,
            None => return LUMI_ERR_NOT_OPEN,
        };
        match mgr.shred_checkin(vh, rid) {
            Ok(()) => {
                unsafe { *out_destroyed = true };
                LUMI_OK
            }
            Err(Error::NotFoundOrShredded) => {
                unsafe { *out_destroyed = false };
                LUMI_OK
            }
            Err(e) => map_err(&e),
        }
    })
}

/// Free a C string that this library returned earlier (for example from [`lumi_list_checkins`]).
/// Call it exactly once per returned pointer; never free it with C `free()`. NULL is a no-op.
///
/// # Safety
/// `s` must be NULL or a pointer previously returned by this library (from `CString::into_raw`),
/// not yet freed, and freed exactly once. A foreign, `malloc`'d or double-freed pointer is UB.
#[unsafe(no_mangle)]
pub unsafe extern "C" fn lumi_string_free(s: *mut c_char) {
    // Defense-in-depth: guard like the other entries so that a future edit cannot unwind into C. We
    // discard the result (the signature is `void`, so there is no error channel to surface).
    let _ = catch_unwind(AssertUnwindSafe(|| {
        if s.is_null() {
            return;
        }
        // SAFETY: `s` originated from CString::into_raw in this library (caller contract above).
        drop(unsafe { CString::from_raw(s) });
    }));
}
