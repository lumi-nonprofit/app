//! Host tests over the real `extern "C"` surface. The library has process-global state, so tests
//! serialize on a shared lock and each manages its own temp DB + open/close.

use std::ffi::{c_char, CStr, CString};
use std::path::{Path, PathBuf};
use std::ptr;
use std::sync::atomic::{AtomicU64, Ordering};
use std::sync::{Mutex, MutexGuard};

use lumi_ffi_cabi::*;

static TEST_LOCK: Mutex<()> = Mutex::new(());
fn serialize() -> MutexGuard<'static, ()> {
    TEST_LOCK.lock().unwrap_or_else(|p| p.into_inner())
}

static CTR: AtomicU64 = AtomicU64::new(0);
struct TempDb {
    path: PathBuf,
}
impl TempDb {
    fn new() -> Self {
        let n = CTR.fetch_add(1, Ordering::Relaxed);
        let path = std::env::temp_dir().join(format!("lumi-ffi-test-{}-{}.db", std::process::id(), n));
        let me = TempDb { path };
        me.wipe();
        me
    }
    fn c_path(&self) -> CString {
        CString::new(self.path.to_str().unwrap()).unwrap()
    }
    fn wipe(&self) {
        for sfx in ["", "-journal", "-wal", "-shm"] {
            let _ = std::fs::remove_file(format!("{}{}", self.path.display(), sfx));
        }
    }
}
impl Drop for TempDb {
    fn drop(&mut self) {
        self.wipe();
    }
}

fn cstr(s: &str) -> CString {
    CString::new(s).unwrap()
}

#[test]
fn ffi_round_trip_put_list_shred() {
    let _g = serialize();
    let db = TempDb::new();
    unsafe {
        assert_eq!(lumi_vault_open(db.c_path().as_ptr()), LUMI_OK);

        let pin = cstr("pin-correct-horse");
        let mut handle = 0u64;
        assert_eq!(lumi_unlock_vault(pin.as_ptr(), &mut handle), LUMI_OK);

        // put two records
        let j1 = cstr(r#"{"mood":"klid","intensity":3,"note":"ok"}"#);
        let j2 = cstr(r#"{"mood":"napeti","intensity":5,"note":""}"#);
        let mut rid1 = [0u8; 16];
        let mut rid2 = [0u8; 16];
        assert_eq!(lumi_put_checkin(handle, j1.as_ptr(), 100, rid1.as_mut_ptr()), LUMI_OK);
        assert_eq!(lumi_put_checkin(handle, j2.as_ptr(), 200, rid2.as_mut_ptr()), LUMI_OK);
        assert_ne!(rid1, rid2, "record ids must differ");

        // list -> both payloads present, 2 records
        let mut out: *mut c_char = ptr::null_mut();
        assert_eq!(lumi_list_checkins(handle, &mut out), LUMI_OK);
        assert!(!out.is_null());
        let listed = CStr::from_ptr(out).to_str().unwrap().to_string();
        lumi_string_free(out); // free Rust-allocated string via the library
        assert_eq!(listed.matches("\"record_id\"").count(), 2);
        assert!(listed.contains("klid") && listed.contains("napeti"));

        // shred rid1 -> destroyed = true
        let mut destroyed = false;
        assert_eq!(lumi_shred_checkin(handle, rid1.as_ptr(), &mut destroyed), LUMI_OK);
        assert!(destroyed, "shredding a live record reports destroyed=true");

        // double-shred -> destroyed = false, still LUMI_OK (the throwing path resolves to a bool)
        assert_eq!(lumi_shred_checkin(handle, rid1.as_ptr(), &mut destroyed), LUMI_OK);
        assert!(!destroyed, "re-shredding reports destroyed=false");

        // list -> only one left
        let mut out2: *mut c_char = ptr::null_mut();
        assert_eq!(lumi_list_checkins(handle, &mut out2), LUMI_OK);
        let listed2 = CStr::from_ptr(out2).to_str().unwrap().to_string();
        lumi_string_free(out2);
        assert_eq!(listed2.matches("\"record_id\"").count(), 1);

        assert_eq!(lumi_vault_close(), LUMI_OK);
    }
}

#[test]
fn ffi_wrong_pin_returns_error_code() {
    let _g = serialize();
    let db = TempDb::new();
    unsafe {
        // create the vault with the right PIN, persist a record, close
        assert_eq!(lumi_vault_open(db.c_path().as_ptr()), LUMI_OK);
        let right = cstr("the-right-pin");
        let mut h = 0u64;
        assert_eq!(lumi_unlock_vault(right.as_ptr(), &mut h), LUMI_OK);
        let j = cstr(r#"{"mood":"klid","intensity":1,"note":""}"#);
        let mut rid = [0u8; 16];
        assert_eq!(lumi_put_checkin(h, j.as_ptr(), 1, rid.as_mut_ptr()), LUMI_OK);
        assert_eq!(lumi_vault_close(), LUMI_OK);

        // reopen, wrong PIN -> the throwing path surfaces as LUMI_ERR_WRONG_PIN
        assert_eq!(lumi_vault_open(db.c_path().as_ptr()), LUMI_OK);
        let wrong = cstr("the-WRONG-pin");
        let mut h2 = 0u64;
        assert_eq!(lumi_unlock_vault(wrong.as_ptr(), &mut h2), LUMI_ERR_WRONG_PIN);
        assert_eq!(lumi_vault_close(), LUMI_OK);
    }
}

#[test]
fn ffi_error_codes_not_open_bad_handle_null() {
    let _g = serialize();
    unsafe {
        // not open -> LUMI_ERR_NOT_OPEN
        assert_eq!(lumi_vault_close(), LUMI_OK); // ensure manager is None
        let pin = cstr("x");
        let mut h = 0u64;
        assert_eq!(lumi_unlock_vault(pin.as_ptr(), &mut h), LUMI_ERR_NOT_OPEN);

        // null args -> LUMI_ERR_NULL_ARG, no crash
        assert_eq!(lumi_unlock_vault(ptr::null(), &mut h), LUMI_ERR_NULL_ARG);
        assert_eq!(lumi_unlock_vault(pin.as_ptr(), ptr::null_mut()), LUMI_ERR_NULL_ARG);

        // open + unlock, then exercise a bad (stale) handle
        let db = TempDb::new();
        assert_eq!(lumi_vault_open(db.c_path().as_ptr()), LUMI_OK);
        assert_eq!(lumi_unlock_vault(pin.as_ptr(), &mut h), LUMI_OK);

        let bad = h.wrapping_add(9999);
        let j = cstr("{}");
        let mut rid = [0u8; 16];
        let mut out: *mut c_char = ptr::null_mut();
        let mut destroyed = false;
        assert_eq!(lumi_put_checkin(bad, j.as_ptr(), 1, rid.as_mut_ptr()), LUMI_ERR_BAD_HANDLE);
        assert_eq!(lumi_list_checkins(bad, &mut out), LUMI_ERR_BAD_HANDLE);
        assert_eq!(lumi_shred_checkin(bad, rid.as_ptr(), &mut destroyed), LUMI_ERR_BAD_HANDLE);

        // freeing NULL is a no-op
        lumi_string_free(ptr::null_mut());

        assert_eq!(lumi_vault_close(), LUMI_OK);
    }
}

/// Allocate + free many list strings to exercise the ownership pairing (into_raw <-> from_raw).
/// A leak here would be caught by an external leak checker; this at least proves the free path is
/// stable and that record content round-trips faithfully through the boundary each time.
#[test]
fn ffi_string_free_pairs_without_corruption() {
    let _g = serialize();
    let db = TempDb::new();
    unsafe {
        assert_eq!(lumi_vault_open(db.c_path().as_ptr()), LUMI_OK);
        let pin = cstr("pin");
        let mut h = 0u64;
        assert_eq!(lumi_unlock_vault(pin.as_ptr(), &mut h), LUMI_OK);

        let payload = r#"{"mood":"klid","intensity":2,"note":"unicode: čřž \" \\ ok"}"#;
        let j = cstr(payload);
        let mut rid = [0u8; 16];
        assert_eq!(lumi_put_checkin(h, j.as_ptr(), 7, rid.as_mut_ptr()), LUMI_OK);

        for _ in 0..200 {
            let mut out: *mut c_char = ptr::null_mut();
            assert_eq!(lumi_list_checkins(h, &mut out), LUMI_OK);
            assert!(!out.is_null());
            let s = CStr::from_ptr(out).to_str().unwrap();
            // the payload (escaped) round-trips: the escaped quote/backslash + unicode survive
            assert!(s.contains("unicode: čřž"));
            assert!(s.contains(r#"\""#) && s.contains(r#"\\"#));
            lumi_string_free(out);
        }

        assert_eq!(lumi_vault_close(), LUMI_OK);
    }
    let _ = Path::new(""); // keep Path import used regardless of cfg
}
