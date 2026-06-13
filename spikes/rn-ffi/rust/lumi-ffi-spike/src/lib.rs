//! THROWAWAY SPIKE — uniffi-bindgen-react-native GO/NO-GO (ADR 0001 §13, spike #1).
//!
//! A *representative* (not toy) FFI surface: real pure-Rust crypto
//! (x25519-dalek + ChaCha20-Poly1305 + HKDF-SHA256), typed records in / `Result`
//! out, and — crucially — the **§1 invariant**: device secret keys live ONLY in a
//! Rust-side registry behind an opaque `u64` handle. **No raw key bytes ever appear
//! in any `#[uniffi::export]` argument or return type**, so nothing secret can
//! cross the FFI into the JS heap. Only handles, public keys, plaintext domain
//! objects, and ciphertext cross.

uniffi::setup_scaffolding!();

use std::collections::HashMap;
use std::sync::{LazyLock, Mutex};

use chacha20poly1305::aead::Aead;
use chacha20poly1305::{ChaCha20Poly1305, KeyInit, Nonce};
use hkdf::Hkdf;
use sha2::Sha256;
use x25519_dalek::{PublicKey, StaticSecret};

/// Secret keys are held HERE, never returned across the FFI (§1).
static SECRETS: LazyLock<Mutex<HashMap<u64, StaticSecret>>> =
    LazyLock::new(|| Mutex::new(HashMap::new()));
static NEXT_HANDLE: LazyLock<Mutex<u64>> = LazyLock::new(|| Mutex::new(1));

/// What the FFI hands back for a new key: an opaque handle + the PUBLIC key. The
/// private key is NOT here.
#[derive(Debug, uniffi::Record)]
pub struct DeviceKey {
    pub handle: u64,
    pub public_key: Vec<u8>,
}

/// A representative domain record (the kind of typed value the real core moves).
#[derive(Debug, Clone, uniffi::Record)]
pub struct CheckinDraft {
    pub mood: String,
    pub intensity: u8,
    pub note: String,
}

#[derive(Debug, uniffi::Error)]
pub enum FfiError {
    UnknownHandle,
    BadInput,
    Crypto,
    Rng,
    Internal,
}

impl std::fmt::Display for FfiError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "{self:?}")
    }
}
impl std::error::Error for FfiError {}

/// Generate a device X25519 keypair. Secret stays in the registry; only the handle
/// + public key cross the FFI.
#[uniffi::export]
pub fn new_device_key() -> Result<DeviceKey, FfiError> {
    let mut seed = [0u8; 32];
    getrandom::getrandom(&mut seed).map_err(|_| FfiError::Rng)?;
    let secret = StaticSecret::from(seed);
    let public = PublicKey::from(&secret);
    let mut next = NEXT_HANDLE.lock().map_err(|_| FfiError::Internal)?;
    let handle = *next;
    *next += 1;
    SECRETS
        .lock()
        .map_err(|_| FfiError::Internal)?
        .insert(handle, secret);
    Ok(DeviceKey {
        handle,
        public_key: public.as_bytes().to_vec(),
    })
}

/// Public key for a handle (no secret).
#[uniffi::export]
pub fn public_key(handle: u64) -> Result<Vec<u8>, FfiError> {
    let map = SECRETS.lock().map_err(|_| FfiError::Internal)?;
    let secret = map.get(&handle).ok_or(FfiError::UnknownHandle)?;
    Ok(PublicKey::from(secret).as_bytes().to_vec())
}

/// Seal a check-in to a peer: X25519 DH → HKDF → ChaCha20-Poly1305. The shared
/// secret and private key NEVER leave Rust; only `nonce || ciphertext` returns.
#[uniffi::export]
pub fn seal_checkin(
    handle: u64,
    peer_public: Vec<u8>,
    draft: CheckinDraft,
) -> Result<Vec<u8>, FfiError> {
    let key = derive_key(handle, &peer_public)?;
    let cipher = ChaCha20Poly1305::new_from_slice(&key).map_err(|_| FfiError::Crypto)?;
    let mut nonce = [0u8; 12];
    getrandom::getrandom(&mut nonce).map_err(|_| FfiError::Rng)?;
    let pt = serialize_draft(&draft);
    let ct = cipher
        .encrypt(Nonce::from_slice(&nonce), pt.as_slice())
        .map_err(|_| FfiError::Crypto)?;
    let mut out = nonce.to_vec();
    out.extend_from_slice(&ct);
    Ok(out)
}

/// Open a sealed check-in, returning the typed record (record OUT).
#[uniffi::export]
pub fn open_checkin(
    handle: u64,
    peer_public: Vec<u8>,
    sealed: Vec<u8>,
) -> Result<CheckinDraft, FfiError> {
    if sealed.len() < 12 {
        return Err(FfiError::BadInput);
    }
    let (nonce, ct) = sealed.split_at(12);
    let key = derive_key(handle, &peer_public)?;
    let cipher = ChaCha20Poly1305::new_from_slice(&key).map_err(|_| FfiError::Crypto)?;
    let pt = cipher
        .decrypt(Nonce::from_slice(nonce), ct)
        .map_err(|_| FfiError::Crypto)?;
    deserialize_draft(&pt)
}

/// X25519 DH + HKDF-SHA256. The shared secret is computed and consumed here; it is
/// never returned (§1).
fn derive_key(handle: u64, peer_public: &[u8]) -> Result<[u8; 32], FfiError> {
    let peer: [u8; 32] = peer_public.try_into().map_err(|_| FfiError::BadInput)?;
    let peer_pk = PublicKey::from(peer);
    let map = SECRETS.lock().map_err(|_| FfiError::Internal)?;
    let secret = map.get(&handle).ok_or(FfiError::UnknownHandle)?;
    let shared = secret.diffie_hellman(&peer_pk);
    let hk = Hkdf::<Sha256>::new(None, shared.as_bytes());
    let mut okm = [0u8; 32];
    hk.expand(b"lumi-spike-aead-v1", &mut okm)
        .map_err(|_| FfiError::Crypto)?;
    Ok(okm)
}

fn serialize_draft(d: &CheckinDraft) -> Vec<u8> {
    format!("{}\u{1f}{}\u{1f}{}", d.mood, d.intensity, d.note).into_bytes()
}

fn deserialize_draft(bytes: &[u8]) -> Result<CheckinDraft, FfiError> {
    let s = std::str::from_utf8(bytes).map_err(|_| FfiError::BadInput)?;
    let mut parts = s.splitn(3, '\u{1f}');
    let mood = parts.next().ok_or(FfiError::BadInput)?.to_string();
    let intensity = parts
        .next()
        .ok_or(FfiError::BadInput)?
        .parse()
        .map_err(|_| FfiError::BadInput)?;
    let note = parts.next().ok_or(FfiError::BadInput)?.to_string();
    Ok(CheckinDraft {
        mood,
        intensity,
        note,
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn seal_open_roundtrip_between_two_devices() {
        let a = new_device_key().unwrap();
        let b = new_device_key().unwrap();
        let draft = CheckinDraft {
            mood: "klid".into(),
            intensity: 3,
            note: "ok".into(),
        };
        let sealed = seal_checkin(a.handle, b.public_key.clone(), draft.clone()).unwrap();
        let opened = open_checkin(b.handle, a.public_key.clone(), sealed).unwrap();
        assert_eq!(opened.mood, "klid");
        assert_eq!(opened.intensity, 3);
        assert_eq!(opened.note, "ok");
    }

    #[test]
    fn unknown_handle_errors() {
        assert!(matches!(public_key(99_999), Err(FfiError::UnknownHandle)));
    }
}
