//! THROWAWAY spike #1b — Rust **C ABI** (cbindgen) for a HAND-WRITTEN React Native
//! JSI TurboModule. NO ubrn, NO UniFFI.
//!
//! Representative crypto: x25519-dalek + ChaCha20-Poly1305 + HKDF-SHA256.
//!
//! §1 INVARIANT: device secret keys live ONLY in the Rust-side `SECRETS` registry,
//! keyed by an opaque `u64` handle. The C ABI exposes ONLY: the handle, 32-byte
//! PUBLIC keys, plaintext check-in fields, and ciphertext. **No secret key bytes
//! ever cross the boundary** — verify this against the function signatures below
//! and the generated `lumi_ffi.h`, not against substrings.
//!
//! Memory ownership: functions that return a heap buffer / C string transfer
//! ownership to the caller, who MUST free it with `lumi_free_buf` / `lumi_free_string`.

use std::collections::HashMap;
use std::ffi::{c_char, c_int, CStr, CString};
use std::ptr;
use std::slice;
use std::sync::{LazyLock, Mutex};

use chacha20poly1305::aead::Aead;
use chacha20poly1305::{ChaCha20Poly1305, KeyInit, Nonce};
use hkdf::Hkdf;
use sha2::Sha256;
use x25519_dalek::{PublicKey, StaticSecret};

/// Secret keys NEVER leave this map (§1).
static SECRETS: LazyLock<Mutex<HashMap<u64, StaticSecret>>> =
    LazyLock::new(|| Mutex::new(HashMap::new()));
static NEXT_HANDLE: LazyLock<Mutex<u64>> = LazyLock::new(|| Mutex::new(1));

pub const LUMI_OK: c_int = 0;
pub const LUMI_ERR_NULL: c_int = -1;
pub const LUMI_ERR_BADARG: c_int = -2;
pub const LUMI_ERR_UNKNOWN_HANDLE: c_int = -3;
pub const LUMI_ERR_CRYPTO: c_int = -4; // decrypt/auth failure -> the JS "throwing" path
pub const LUMI_ERR_RNG: c_int = -5;
pub const LUMI_ERR_INTERNAL: c_int = -6;

/// Create a device X25519 keypair. Writes the opaque handle to `*out_handle` and the
/// 32-byte PUBLIC key to `out_pubkey32` (must point to >= 32 writable bytes).
/// The private key stays in the registry. Returns `LUMI_OK` or a negative error.
///
/// # Safety
/// `out_handle` and `out_pubkey32` must be valid, non-null, correctly-sized pointers.
#[no_mangle]
pub unsafe extern "C" fn lumi_new_device_key(out_handle: *mut u64, out_pubkey32: *mut u8) -> c_int {
    if out_handle.is_null() || out_pubkey32.is_null() {
        return LUMI_ERR_NULL;
    }
    let mut seed = [0u8; 32];
    if getrandom::getrandom(&mut seed).is_err() {
        return LUMI_ERR_RNG;
    }
    let secret = StaticSecret::from(seed);
    let public = PublicKey::from(&secret);
    let handle = {
        let mut n = match NEXT_HANDLE.lock() {
            Ok(g) => g,
            Err(_) => return LUMI_ERR_INTERNAL,
        };
        let h = *n;
        *n += 1;
        h
    };
    match SECRETS.lock() {
        Ok(mut m) => {
            m.insert(handle, secret);
        }
        Err(_) => return LUMI_ERR_INTERNAL,
    }
    ptr::write(out_handle, handle);
    ptr::copy_nonoverlapping(public.as_bytes().as_ptr(), out_pubkey32, 32);
    LUMI_OK
}

/// Seal a check-in to a peer (X25519 DH -> HKDF -> ChaCha20-Poly1305). On success
/// allocates `nonce||ciphertext`, writes its pointer to `*out_buf` and length to
/// `*out_len` (caller frees via `lumi_free_buf`). The shared secret + private key
/// never leave Rust.
///
/// # Safety
/// All pointers must be valid; `peer_pub` must point to `peer_pub_len` bytes;
/// `mood`/`note` must be NUL-terminated UTF-8.
#[no_mangle]
pub unsafe extern "C" fn lumi_seal_checkin(
    handle: u64,
    peer_pub: *const u8,
    peer_pub_len: usize,
    mood: *const c_char,
    intensity: u8,
    note: *const c_char,
    out_buf: *mut *mut u8,
    out_len: *mut usize,
) -> c_int {
    if peer_pub.is_null() || mood.is_null() || note.is_null() || out_buf.is_null() || out_len.is_null() {
        return LUMI_ERR_NULL;
    }
    if peer_pub_len != 32 {
        return LUMI_ERR_BADARG;
    }
    let peer = slice::from_raw_parts(peer_pub, 32);
    let mood = match CStr::from_ptr(mood).to_str() {
        Ok(s) => s,
        Err(_) => return LUMI_ERR_BADARG,
    };
    let note = match CStr::from_ptr(note).to_str() {
        Ok(s) => s,
        Err(_) => return LUMI_ERR_BADARG,
    };
    let key = match derive_key(handle, peer) {
        Ok(k) => k,
        Err(e) => return e,
    };
    let cipher = match ChaCha20Poly1305::new_from_slice(&key) {
        Ok(c) => c,
        Err(_) => return LUMI_ERR_CRYPTO,
    };
    let mut nonce = [0u8; 12];
    if getrandom::getrandom(&mut nonce).is_err() {
        return LUMI_ERR_RNG;
    }
    let pt = format!("{mood}\u{1f}{intensity}\u{1f}{note}").into_bytes();
    let ct = match cipher.encrypt(Nonce::from_slice(&nonce), pt.as_slice()) {
        Ok(c) => c,
        Err(_) => return LUMI_ERR_CRYPTO,
    };
    let mut out = Vec::with_capacity(12 + ct.len());
    out.extend_from_slice(&nonce);
    out.extend_from_slice(&ct);
    // Ensure capacity == len so lumi_free_buf can reconstruct the Vec correctly.
    out.shrink_to_fit();
    let len = out.len();
    let p = out.as_mut_ptr();
    debug_assert_eq!(out.capacity(), len);
    std::mem::forget(out);
    ptr::write(out_len, len);
    ptr::write(out_buf, p);
    LUMI_OK
}

/// Open a sealed check-in, writing the plaintext fields out. `out_mood`/`out_note`
/// receive heap C strings the caller frees via `lumi_free_string`. A bad/garbled
/// `sealed` buffer returns `LUMI_ERR_CRYPTO` (the JS throwing path).
///
/// # Safety
/// All pointers valid; `peer_pub`/`sealed` point to their stated lengths.
#[no_mangle]
pub unsafe extern "C" fn lumi_open_checkin(
    handle: u64,
    peer_pub: *const u8,
    peer_pub_len: usize,
    sealed: *const u8,
    sealed_len: usize,
    out_mood: *mut *mut c_char,
    out_intensity: *mut u8,
    out_note: *mut *mut c_char,
) -> c_int {
    if peer_pub.is_null() || sealed.is_null() || out_mood.is_null() || out_intensity.is_null() || out_note.is_null() {
        return LUMI_ERR_NULL;
    }
    if peer_pub_len != 32 || sealed_len < 12 {
        return LUMI_ERR_BADARG;
    }
    let peer = slice::from_raw_parts(peer_pub, 32);
    let sealed = slice::from_raw_parts(sealed, sealed_len);
    let (nonce, ct) = sealed.split_at(12);
    let key = match derive_key(handle, peer) {
        Ok(k) => k,
        Err(e) => return e,
    };
    let cipher = match ChaCha20Poly1305::new_from_slice(&key) {
        Ok(c) => c,
        Err(_) => return LUMI_ERR_CRYPTO,
    };
    let pt = match cipher.decrypt(Nonce::from_slice(nonce), ct) {
        Ok(p) => p,
        Err(_) => return LUMI_ERR_CRYPTO, // wrong key / tampered / garbage -> throws in JS
    };
    let s = match std::str::from_utf8(&pt) {
        Ok(s) => s,
        Err(_) => return LUMI_ERR_CRYPTO,
    };
    let mut parts = s.splitn(3, '\u{1f}');
    let mood = parts.next().unwrap_or("");
    let intensity: u8 = parts.next().unwrap_or("0").parse().unwrap_or(0);
    let note = parts.next().unwrap_or("");
    let mood_c = match CString::new(mood) {
        Ok(c) => c,
        Err(_) => return LUMI_ERR_INTERNAL,
    };
    let note_c = match CString::new(note) {
        Ok(c) => c,
        Err(_) => return LUMI_ERR_INTERNAL,
    };
    ptr::write(out_mood, mood_c.into_raw());
    ptr::write(out_note, note_c.into_raw());
    ptr::write(out_intensity, intensity);
    LUMI_OK
}

/// Free a buffer returned by `lumi_seal_checkin`.
/// # Safety
/// `ptr`/`len` must be exactly what a `lumi_*` function returned (or null/0).
#[no_mangle]
pub unsafe extern "C" fn lumi_free_buf(ptr: *mut u8, len: usize) {
    if ptr.is_null() || len == 0 {
        return;
    }
    drop(Vec::from_raw_parts(ptr, len, len));
}

/// Free a C string returned by `lumi_open_checkin`.
/// # Safety
/// `s` must be a pointer returned by a `lumi_*` function (or null).
#[no_mangle]
pub unsafe extern "C" fn lumi_free_string(s: *mut c_char) {
    if s.is_null() {
        return;
    }
    drop(CString::from_raw(s));
}

/// X25519 DH + HKDF-SHA256. The shared secret is derived and consumed HERE; never
/// returned (§1). Private, not part of the C ABI.
fn derive_key(handle: u64, peer_pub: &[u8]) -> Result<[u8; 32], c_int> {
    let peer: [u8; 32] = peer_pub.try_into().map_err(|_| LUMI_ERR_BADARG)?;
    let peer_pk = PublicKey::from(peer);
    let map = SECRETS.lock().map_err(|_| LUMI_ERR_INTERNAL)?;
    let secret = map.get(&handle).ok_or(LUMI_ERR_UNKNOWN_HANDLE)?;
    let shared = secret.diffie_hellman(&peer_pk);
    let hk = Hkdf::<Sha256>::new(None, shared.as_bytes());
    let mut okm = [0u8; 32];
    hk.expand(b"lumi-spike-aead-v1", &mut okm)
        .map_err(|_| LUMI_ERR_CRYPTO)?;
    Ok(okm)
}

#[cfg(test)]
mod tests {
    use super::*;

    // Host round-trip — run with `cargo test` to confirm the crypto logic before
    // the mobile build. Mirrors what the JS round-trip exercises on device.
    #[test]
    fn c_abi_roundtrip_and_throwing_path() {
        unsafe {
            let (mut ha, mut hb) = (0u64, 0u64);
            let (mut pa, mut pb) = ([0u8; 32], [0u8; 32]);
            assert_eq!(lumi_new_device_key(&mut ha, pa.as_mut_ptr()), LUMI_OK);
            assert_eq!(lumi_new_device_key(&mut hb, pb.as_mut_ptr()), LUMI_OK);

            let mood = CString::new("klid").unwrap();
            let note = CString::new("ok").unwrap();
            let mut buf: *mut u8 = ptr::null_mut();
            let mut len: usize = 0;
            assert_eq!(
                lumi_seal_checkin(ha, pb.as_ptr(), 32, mood.as_ptr(), 3, note.as_ptr(), &mut buf, &mut len),
                LUMI_OK
            );

            let mut om: *mut c_char = ptr::null_mut();
            let mut oi: u8 = 0;
            let mut on: *mut c_char = ptr::null_mut();
            assert_eq!(
                lumi_open_checkin(hb, pa.as_ptr(), 32, buf, len, &mut om, &mut oi, &mut on),
                LUMI_OK
            );
            assert_eq!(CStr::from_ptr(om).to_str().unwrap(), "klid");
            assert_eq!(oi, 3);
            assert_eq!(CStr::from_ptr(on).to_str().unwrap(), "ok");
            lumi_free_string(om);
            lumi_free_string(on);
            lumi_free_buf(buf, len);

            // Throwing path: garbage sealed buffer -> error (becomes a JS throw).
            let bad = [9u8; 20];
            let (mut m2, mut i2, mut n2) = (ptr::null_mut(), 0u8, ptr::null_mut());
            let rc = lumi_open_checkin(hb, pa.as_ptr(), 32, bad.as_ptr(), bad.len(), &mut m2, &mut i2, &mut n2);
            assert_eq!(rc, LUMI_ERR_CRYPTO);

            // Unknown handle.
            let mut p3 = ptr::null_mut();
            let mut l3 = 0usize;
            assert_eq!(
                lumi_seal_checkin(999_999, pb.as_ptr(), 32, mood.as_ptr(), 1, note.as_ptr(), &mut p3, &mut l3),
                LUMI_ERR_UNKNOWN_HANDLE
            );
        }
    }
}
