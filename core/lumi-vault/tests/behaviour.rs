//! Behavioural tests for the vault; they exercise the public API through the in-memory
//! reference store. All pure-Rust → also run under the musl loop.

use lumi_vault::memory::InMemoryStore;
use lumi_vault::{Error, VaultManager};

/// A representative serialized Entry payload {mood, intensity, note} (lumi-vault treats it as opaque).
fn checkin_json(mood: &str, intensity: u8, note: &str) -> String {
    format!(r#"{{"mood":"{mood}","intensity":{intensity},"note":"{note}"}}"#)
}

#[test]
fn round_trip_unlock_put_list() {
    let mut m = VaultManager::new(InMemoryStore::new());
    let h = m.unlock_vault("correct horse battery staple").unwrap();

    let p1 = checkin_json("klid", 3, "ok");
    let p2 = checkin_json("napeti", 5, "");
    let id1 = m.put_checkin(h, &p1, 100).unwrap();
    let id2 = m.put_checkin(h, &p2, 200).unwrap();
    assert_ne!(id1, id2, "record ids must be unique");

    let list = m.list_checkins(h).unwrap();
    assert_eq!(list.len(), 2);
    // sorted by created_at
    assert_eq!(list[0].record_id, id1);
    assert_eq!(list[0].payload, p1);
    assert_eq!(list[0].created_at, 100);
    assert_eq!(list[1].record_id, id2);
    assert_eq!(list[1].payload, p2);
}

#[test]
fn reopen_persisted_vault_reads_prior_records() {
    let store = InMemoryStore::new();
    let p = checkin_json("klid", 2, "before reopen");

    let id = {
        let mut m1 = VaultManager::new(store.clone());
        let h = m1.unlock_vault("pin-A").unwrap();
        m1.put_checkin(h, &p, 50).unwrap()
        // m1 dropped here -> vault key zeroized; data persists in the shared store
    };

    let mut m2 = VaultManager::new(store.clone());
    let h2 = m2.unlock_vault("pin-A").unwrap(); // re-derives PIN key, unwraps the SAME vault key
    let list = m2.list_checkins(h2).unwrap();
    assert_eq!(list.len(), 1);
    assert_eq!(list[0].record_id, id);
    assert_eq!(list[0].payload, p);
}

#[test]
fn wrong_pin_fails_closed() {
    let store = InMemoryStore::new();
    {
        let mut m1 = VaultManager::new(store.clone());
        let h = m1.unlock_vault("the right pin").unwrap();
        m1.put_checkin(h, &checkin_json("klid", 2, "secret"), 1).unwrap();
    }

    let mut m2 = VaultManager::new(store.clone());
    let err = m2.unlock_vault("the WRONG pin").unwrap_err();
    assert!(matches!(err, Error::WrongPinOrCorruptVault), "wrong PIN must fail closed, got {err:?}");
}

#[test]
fn crypto_shred_makes_record_permanently_unreadable() {
    let mut m = VaultManager::new(InMemoryStore::new());
    let h = m.unlock_vault("pin").unwrap();
    let id1 = m.put_checkin(h, &checkin_json("klid", 2, "keep"), 1).unwrap();
    let id2 = m.put_checkin(h, &checkin_json("napeti", 4, "erase me"), 2).unwrap();

    m.shred_checkin(h, id2).unwrap();

    // id2 no longer appears in the list; id1 still opens
    let list = m.list_checkins(h).unwrap();
    assert_eq!(list.len(), 1);
    assert_eq!(list[0].record_id, id1);

    // a read of the shredded record fails permanently...
    assert!(matches!(m.get_checkin(h, id2).unwrap_err(), Error::NotFoundOrShredded));
    // ...even after re-unlock (the wrapped content key no longer exists)
    let h2 = m.unlock_vault("pin").unwrap();
    assert!(matches!(m.get_checkin(h2, id2).unwrap_err(), Error::NotFoundOrShredded));
    // the other record stays intact
    assert_eq!(m.get_checkin(h2, id1).unwrap().payload, checkin_json("klid", 2, "keep"));
}

#[test]
fn tampered_record_fails_closed_through_api() {
    let store = InMemoryStore::new();
    let mut m = VaultManager::new(store.clone());
    let h = m.unlock_vault("pin").unwrap();
    m.put_checkin(h, &checkin_json("klid", 3, "intact"), 1).unwrap();

    // Simulate a hostile change on disk: flip a ciphertext byte.
    let mut rows = store.raw_records();
    rows[0].ciphertext[0] ^= 0x01;
    store.set_records(rows);

    assert!(matches!(m.list_checkins(h).unwrap_err(), Error::RecordIntegrity), "tamper must fail closed");
}

#[test]
fn operations_require_a_valid_handle() {
    let mut m = VaultManager::new(InMemoryStore::new());
    let h = m.unlock_vault("pin").unwrap();
    let id = m.put_checkin(h, &checkin_json("klid", 1, ""), 1).unwrap();

    m.lock(h); // key zeroized + removed from registry
    assert!(matches!(m.list_checkins(h).unwrap_err(), Error::BadHandle));
    assert!(matches!(m.get_checkin(h, id).unwrap_err(), Error::BadHandle));
    assert!(matches!(m.put_checkin(h, &checkin_json("klid", 1, ""), 2).unwrap_err(), Error::BadHandle));
    assert!(matches!(m.shred_checkin(h, id).unwrap_err(), Error::BadHandle));
}

#[test]
fn shred_of_missing_or_already_shredded_reports_not_found() {
    let mut m = VaultManager::new(InMemoryStore::new());
    let h = m.unlock_vault("pin").unwrap();
    let id = m.put_checkin(h, &checkin_json("klid", 1, ""), 1).unwrap();
    m.shred_checkin(h, id).unwrap(); // first shred: real erasure
    // double-shred and shred-of-nonexistent are both confirmed as "nothing erased"
    assert!(matches!(m.shred_checkin(h, id).unwrap_err(), Error::NotFoundOrShredded));
    assert!(matches!(m.shred_checkin(h, [0u8; 16]).unwrap_err(), Error::NotFoundOrShredded));
}

#[test]
fn get_nonexistent_record_is_not_found() {
    let mut m = VaultManager::new(InMemoryStore::new());
    let h = m.unlock_vault("pin").unwrap();
    assert!(matches!(m.get_checkin(h, [0xAB; 16]).unwrap_err(), Error::NotFoundOrShredded));
}

#[test]
fn list_fails_closed_if_any_record_tampered() {
    let store = InMemoryStore::new();
    let mut m = VaultManager::new(store.clone());
    let h = m.unlock_vault("pin").unwrap();
    m.put_checkin(h, &checkin_json("klid", 1, "a"), 1).unwrap();
    m.put_checkin(h, &checkin_json("napeti", 2, "b"), 2).unwrap();

    // tamper only the SECOND record -> the whole call must fail closed (not a partial 1-element list)
    let mut rows = store.raw_records();
    rows[1].ciphertext[0] ^= 0x01;
    store.set_records(rows);
    assert!(matches!(m.list_checkins(h).unwrap_err(), Error::RecordIntegrity));
}

/// Corrupt stored *lengths* (not just a flipped byte) to regression-protect the nonce/key
/// length guards — these must fail closed with no panic.
#[test]
fn corrupt_record_lengths_fail_closed_no_panic() {
    // truncated content_nonce (23 bytes)
    {
        let store = InMemoryStore::new();
        let mut m = VaultManager::new(store.clone());
        let h = m.unlock_vault("pin").unwrap();
        m.put_checkin(h, &checkin_json("klid", 1, ""), 1).unwrap();
        let mut rows = store.raw_records();
        rows[0].content_nonce.truncate(23);
        store.set_records(rows);
        assert!(matches!(m.list_checkins(h).unwrap_err(), Error::RecordIntegrity));
    }
    // emptied key_nonce
    {
        let store = InMemoryStore::new();
        let mut m = VaultManager::new(store.clone());
        let h = m.unlock_vault("pin").unwrap();
        m.put_checkin(h, &checkin_json("klid", 1, ""), 1).unwrap();
        let mut rows = store.raw_records();
        rows[0].key_nonce.clear();
        store.set_records(rows);
        assert!(matches!(m.list_checkins(h).unwrap_err(), Error::RecordIntegrity));
    }
    // too-short wrapped_content_key (5 bytes)
    {
        let store = InMemoryStore::new();
        let mut m = VaultManager::new(store.clone());
        let h = m.unlock_vault("pin").unwrap();
        let id = m.put_checkin(h, &checkin_json("klid", 1, ""), 1).unwrap();
        let mut rows = store.raw_records();
        rows[0].wrapped_content_key = Some(vec![0u8; 5]);
        store.set_records(rows);
        assert!(matches!(m.get_checkin(h, id).unwrap_err(), Error::RecordIntegrity));
    }
}

/// Tamper the *vault* leg (correct PIN, but corrupt wrapped vault key / nonce) — must fail
/// closed as WrongPinOrCorruptVault, no panic.
#[test]
fn corrupt_vault_row_fails_closed_no_panic() {
    fn fresh_store(pin: &str) -> InMemoryStore {
        let store = InMemoryStore::new();
        {
            let mut m = VaultManager::new(store.clone());
            m.unlock_vault(pin).unwrap();
        }
        store
    }

    // flipped byte in the wrapped vault key
    {
        let store = fresh_store("pin");
        let mut v = store.raw_vault().unwrap();
        v.wrapped_vault_key[0] ^= 0x01;
        store.set_vault(v);
        let mut m = VaultManager::new(store);
        assert!(matches!(m.unlock_vault("pin").unwrap_err(), Error::WrongPinOrCorruptVault));
    }
    // truncated vault nonce (wrong length)
    {
        let store = fresh_store("pin");
        let mut v = store.raw_vault().unwrap();
        v.vault_nonce.truncate(23);
        store.set_vault(v);
        let mut m = VaultManager::new(store);
        assert!(matches!(m.unlock_vault("pin").unwrap_err(), Error::WrongPinOrCorruptVault));
    }
}

/// Nonce freshness across MANY operations under the SAME vault key. The vault key wraps every
/// per-record content key, so a reused (vault_key, nonce) would break confidentiality AND
/// authentication — this asserts all wrap-nonces (and all seal-nonces) are distinct 24-byte values.
#[test]
fn many_records_use_distinct_fresh_nonces() {
    use std::collections::HashSet;

    let store = InMemoryStore::new();
    let mut m = VaultManager::new(store.clone());
    let h = m.unlock_vault("pin").unwrap();

    const N: usize = 256;
    for i in 0..N {
        m.put_checkin(h, &checkin_json("klid", 1, ""), i as i64).unwrap();
    }

    let rows = store.raw_records();
    assert_eq!(rows.len(), N);

    let mut nonces: HashSet<Vec<u8>> = HashSet::new();
    for r in &rows {
        // (b) content-key WRAP nonce (under the shared vault key) and (a) payload SEAL nonce
        assert_eq!(r.key_nonce.len(), 24, "wrap nonce must be 24 bytes");
        assert_eq!(r.content_nonce.len(), 24, "seal nonce must be 24 bytes");
        assert_ne!(r.key_nonce, r.content_nonce);
        assert!(r.key_nonce.iter().any(|&b| b != 0) && r.content_nonce.iter().any(|&b| b != 0));
        assert!(nonces.insert(r.key_nonce.clone()), "DUPLICATE wrap nonce -> (vault_key, nonce) reuse");
        assert!(nonces.insert(r.content_nonce.clone()), "DUPLICATE seal nonce -> (content_key, nonce) reuse");
    }
    // 2*N distinct nonces total (every wrap + every seal nonce unique)
    assert_eq!(nonces.len(), 2 * N);
}

/// Nonce freshness for the vault-key wrap (site c): 2 freshly created vaults with the SAME PIN
/// get distinct salt + distinct vault-wrap nonce (and thus distinct wrapped vault keys) — which
/// proves that both come fresh from the CSPRNG, never derived from the PIN or fixed.
#[test]
fn fresh_vaults_use_distinct_salt_and_wrap_nonce() {
    let s1 = InMemoryStore::new();
    {
        let mut m = VaultManager::new(s1.clone());
        m.unlock_vault("identical-pin").unwrap();
    }
    let s2 = InMemoryStore::new();
    {
        let mut m = VaultManager::new(s2.clone());
        m.unlock_vault("identical-pin").unwrap();
    }

    let v1 = s1.raw_vault().unwrap();
    let v2 = s2.raw_vault().unwrap();
    assert_eq!(v1.vault_nonce.len(), 24);
    assert_ne!(v1.vault_nonce, v2.vault_nonce, "vault-wrap nonce must be freshly drawn per vault");
    assert_ne!(v1.salt, v2.salt, "salt must be freshly drawn per vault");
    assert_ne!(v1.wrapped_vault_key, v2.wrapped_vault_key, "same PIN + fresh salt/nonce -> distinct wrap");
}
