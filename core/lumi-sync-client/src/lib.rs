//! Zero-knowledge sync — client side (ADR 0001 §5).
//!
//! **What M0 locks (and why now):** the on-wire **envelope format**. The server
//! stores only opaque blobs + wrapped-key envelopes it cannot read; getting the
//! format wrong later forces a painful migration of every user's synced data. So
//! the format is fixed at M0 with:
//! - an explicit **`format_version`** byte,
//! - **reserved bytes** so M1's replay-protection / idempotency review can extend
//!   the header **without a migration** (ADR condition 4),
//! - a versioned **`wrap_alg`** discriminator so an X25519 envelope and a future
//!   X25519+ML-KEM hybrid coexist (ADR 0001 §3 PQ seam),
//! - **fixed-size padding buckets** so a WHO-5 result is indistinguishable by
//!   length from a mood check-in (metadata minimisation),
//! - **content-independent opaque** record/device ids (no embedded timestamps).
//!
//! **What M0 does NOT do:** real encryption. At M0 the "ciphertext" is the padded
//! plaintext (clearly a stub). The AEAD (XChaCha20-Poly1305) + key wrapping land
//! in M1; they slot in behind this exact format. Likewise the HTTP transport is
//! M2 — here we only define the protocol *types*.

use lumi_crdt::{DeviceId, Hlc};

/// Bump only with a migration. Everything below is wire-compatible within a version.
pub const FORMAT_VERSION: u8 = 1;

const HEADER_RESERVED: usize = 6; // free space for M1 (flags, replay nonce id, …)

/// Key-wrapping algorithm discriminator (ADR 0001 §3). Length-flexible recipient
/// bytes live in `wrapped_key`, so a future hybrid is purely additive.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
#[repr(u8)]
pub enum WrapAlg {
    /// X25519 + HPKE (the only algorithm shipped).
    X25519 = 1,
    // 2 = reserved for X25519+ML-KEM-768 hybrid (do not ship until audited).
}

impl WrapAlg {
    fn from_u8(v: u8) -> Option<WrapAlg> {
        match v {
            1 => Some(WrapAlg::X25519),
            _ => None,
        }
    }
}

/// Opaque, content-independent record identifier (16 random bytes). Never derived
/// from creation time or content (the current `Date.now()`-prefixed ids leak
/// timing — ADR 0001 §6).
pub type RecordId = [u8; 16];

/// Length-padding buckets (bytes). A payload is padded up to the smallest bucket
/// that fits it plus its 4-byte length prefix, so on-wire sizes reveal only the
/// bucket, not the true length. Beyond the largest bucket we round to its multiple.
pub const BUCKETS: &[usize] = &[256, 1024, 4096, 16384, 65536];

/// The padded size that will hold `plaintext_len` bytes (+4-byte length prefix).
pub fn bucket_for(plaintext_len: usize) -> usize {
    let needed = plaintext_len + 4;
    for &b in BUCKETS {
        if needed <= b {
            return b;
        }
    }
    let max = *BUCKETS.last().unwrap();
    needed.div_ceil(max) * max
}

/// Pad a payload to its bucket: `[len: u32 LE][payload][zero padding]`.
pub fn pad(plaintext: &[u8]) -> Vec<u8> {
    let size = bucket_for(plaintext.len());
    let mut out = vec![0u8; size];
    out[0..4].copy_from_slice(&(plaintext.len() as u32).to_le_bytes());
    out[4..4 + plaintext.len()].copy_from_slice(plaintext);
    out
}

/// Recover the original payload from a padded buffer.
pub fn unpad(padded: &[u8]) -> Option<Vec<u8>> {
    if padded.len() < 4 {
        return None;
    }
    let len = u32::from_le_bytes([padded[0], padded[1], padded[2], padded[3]]) as usize;
    let end = 4usize.checked_add(len)?;
    if end > padded.len() {
        return None;
    }
    Some(padded[4..end].to_vec())
}

/// One synced record, as it travels to/from the zero-knowledge server.
///
/// At M0 `ciphertext` is the padded plaintext (stub). In M1 it becomes the real
/// AEAD output of the padded plaintext; the layout here does not change.
#[derive(Clone, Debug, PartialEq, Eq)]
pub struct Envelope {
    pub wrap_alg: WrapAlg,
    pub reserved: [u8; HEADER_RESERVED],
    pub record_id: RecordId,
    pub device_id: DeviceId,
    pub stamp: Hlc,
    pub wrapped_key: Vec<u8>,
    /// Padded (and, from M1, encrypted) payload — always a bucket size.
    pub ciphertext: Vec<u8>,
}

impl Envelope {
    /// Build an envelope from cleartext, padding to a bucket. (M0 stub: no AEAD.)
    pub fn seal_stub(
        record_id: RecordId,
        device_id: DeviceId,
        stamp: Hlc,
        wrapped_key: Vec<u8>,
        plaintext: &[u8],
    ) -> Envelope {
        Envelope {
            wrap_alg: WrapAlg::X25519,
            reserved: [0u8; HEADER_RESERVED],
            record_id,
            device_id,
            stamp,
            wrapped_key,
            ciphertext: pad(plaintext),
        }
    }

    /// Recover the cleartext. (M0 stub: just unpad.)
    pub fn open_stub(&self) -> Option<Vec<u8>> {
        unpad(&self.ciphertext)
    }

    /// Serialise to the fixed wire layout. All multi-byte ints little-endian.
    pub fn encode(&self) -> Vec<u8> {
        let mut out = Vec::with_capacity(64 + self.wrapped_key.len() + self.ciphertext.len());
        out.push(FORMAT_VERSION);
        out.push(self.wrap_alg as u8);
        out.extend_from_slice(&self.reserved);
        out.extend_from_slice(&self.record_id);
        out.extend_from_slice(&self.device_id);
        out.extend_from_slice(&self.stamp.wall_ms.to_le_bytes());
        out.extend_from_slice(&self.stamp.counter.to_le_bytes());
        out.extend_from_slice(&self.stamp.device); // 16 bytes
        out.extend_from_slice(&(self.wrapped_key.len() as u32).to_le_bytes());
        out.extend_from_slice(&self.wrapped_key);
        out.extend_from_slice(&(self.ciphertext.len() as u32).to_le_bytes());
        out.extend_from_slice(&self.ciphertext);
        out
    }

    /// Parse the wire layout. Returns `None` on any malformation or unknown version
    /// (callers degrade; an unknown future version is not silently misread).
    pub fn decode(bytes: &[u8]) -> Option<Envelope> {
        let mut r = Reader { b: bytes, i: 0 };
        if r.u8()? != FORMAT_VERSION {
            return None;
        }
        let wrap_alg = WrapAlg::from_u8(r.u8()?)?;
        let mut reserved = [0u8; HEADER_RESERVED];
        reserved.copy_from_slice(r.take(HEADER_RESERVED)?);
        let mut record_id = [0u8; 16];
        record_id.copy_from_slice(r.take(16)?);
        let mut device_id = [0u8; 16];
        device_id.copy_from_slice(r.take(16)?);
        let wall_ms = r.u64()?;
        let counter = r.u32()?;
        let mut stamp_device = [0u8; 16];
        stamp_device.copy_from_slice(r.take(16)?);
        let wk_len = r.u32()? as usize;
        let wrapped_key = r.take(wk_len)?.to_vec();
        let ct_len = r.u32()? as usize;
        let ciphertext = r.take(ct_len)?.to_vec();
        if r.i != r.b.len() {
            return None; // trailing bytes
        }
        Some(Envelope {
            wrap_alg,
            reserved,
            record_id,
            device_id,
            stamp: Hlc {
                wall_ms,
                counter,
                device: stamp_device,
            },
            wrapped_key,
            ciphertext,
        })
    }
}

struct Reader<'a> {
    b: &'a [u8],
    i: usize,
}

impl Reader<'_> {
    fn take(&mut self, n: usize) -> Option<&[u8]> {
        let end = self.i.checked_add(n)?;
        if end > self.b.len() {
            return None;
        }
        let s = &self.b[self.i..end];
        self.i = end;
        Some(s)
    }
    fn u8(&mut self) -> Option<u8> {
        Some(self.take(1)?[0])
    }
    fn u32(&mut self) -> Option<u32> {
        let s = self.take(4)?;
        Some(u32::from_le_bytes([s[0], s[1], s[2], s[3]]))
    }
    fn u64(&mut self) -> Option<u64> {
        let s = self.take(8)?;
        let mut a = [0u8; 8];
        a.copy_from_slice(s);
        Some(u64::from_le_bytes(a))
    }
}

/// Opaque sync cursor (monotonic). Its exact semantics (and replay/idempotency)
/// are finalised in M1 using the reserved header space — hence opaque here.
pub type Cursor = u64;

/// `push(blobs)` — upload encoded envelopes. The server stores them opaquely.
#[derive(Clone, Debug, PartialEq, Eq, Default)]
pub struct PushRequest {
    pub envelopes: Vec<Vec<u8>>,
}

/// `pull(since)` — download envelopes newer than the cursor.
#[derive(Clone, Debug, PartialEq, Eq)]
pub struct PullRequest {
    pub since: Cursor,
}

#[derive(Clone, Debug, PartialEq, Eq, Default)]
pub struct PullResponse {
    pub envelopes: Vec<Vec<u8>>,
    pub cursor: Cursor,
}

#[cfg(test)]
mod tests {
    use super::*;

    const DEV: DeviceId = [7u8; 16];

    fn stamp() -> Hlc {
        Hlc {
            wall_ms: 1_700_000_000_000,
            counter: 3,
            device: DEV,
        }
    }

    #[test]
    fn padding_rounds_to_buckets() {
        assert_eq!(bucket_for(0), 256);
        assert_eq!(bucket_for(251), 256); // 251+4 = 255 <= 256
        assert_eq!(bucket_for(253), 1024); // 253+4 = 257 > 256
        assert_eq!(bucket_for(20_000), 65536);
        assert_eq!(bucket_for(70_000), 131072); // multiple of max bucket
    }

    #[test]
    fn pad_unpad_roundtrip() {
        for n in [0usize, 1, 100, 252, 253, 5000] {
            let pt = vec![0xABu8; n];
            let padded = pad(&pt);
            assert_eq!(padded.len(), bucket_for(n));
            assert_eq!(unpad(&padded).as_deref(), Some(pt.as_slice()));
        }
    }

    #[test]
    fn different_lengths_in_same_bucket_are_indistinguishable() {
        // A short check-in and a longer measurement that share a bucket must
        // produce equal ciphertext-field lengths (no length leak).
        let a = Envelope::seal_stub([1u8; 16], DEV, stamp(), vec![9u8; 32], b"krat");
        let b = Envelope::seal_stub([2u8; 16], DEV, stamp(), vec![9u8; 32], &[0u8; 200]);
        assert_eq!(a.ciphertext.len(), b.ciphertext.len());
        // ...and equal total encoded length (same wrapped_key size).
        assert_eq!(a.encode().len(), b.encode().len());
    }

    #[test]
    fn envelope_encode_decode_roundtrip() {
        let env = Envelope::seal_stub([5u8; 16], DEV, stamp(), vec![1, 2, 3, 4], b"hello");
        let bytes = encode_and_check_header(&env);
        let back = Envelope::decode(&bytes).expect("decodes");
        assert_eq!(back, env);
        assert_eq!(back.open_stub().as_deref(), Some(&b"hello"[..]));
    }

    fn encode_and_check_header(env: &Envelope) -> Vec<u8> {
        let bytes = env.encode();
        assert_eq!(bytes[0], FORMAT_VERSION);
        assert_eq!(bytes[1], WrapAlg::X25519 as u8);
        bytes
    }

    #[test]
    fn decode_rejects_unknown_version_and_garbage() {
        let mut bytes = Envelope::seal_stub([0u8; 16], DEV, stamp(), vec![], b"x").encode();
        let mut wrong = bytes.clone();
        wrong[0] = 99; // unknown format version
        assert!(Envelope::decode(&wrong).is_none());
        bytes.push(0); // trailing byte
        assert!(Envelope::decode(&bytes).is_none());
        assert!(Envelope::decode(b"").is_none());
    }

    #[test]
    fn reserved_bytes_are_preserved_round_trip() {
        let mut env = Envelope::seal_stub([0u8; 16], DEV, stamp(), vec![], b"x");
        env.reserved = [1, 2, 3, 4, 5, 6];
        let back = Envelope::decode(&env.encode()).unwrap();
        assert_eq!(back.reserved, [1, 2, 3, 4, 5, 6]);
    }
}
