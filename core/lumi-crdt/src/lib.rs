//! Lumi merge primitives (ADR 0001 §4).
//!
//! Two-track design: append-only **op-log** for immutable records
//! (entries/measurements), and **CRDT registers/sets** for the mutable
//! tags/settings. All ordering rides a **Hybrid Logical Clock** so offline writes
//! converge deterministically without trusting the server.
//!
//! M0 status: real, dependency-free implementations of HLC + op-log + LWW
//! register + LWW-element set, with tests. The `automerge-rs` integration for the
//! richer mutable documents lands in M2 (this is the seam it plugs into).

use std::collections::BTreeMap;

/// Opaque, content-independent device identifier (16 random bytes). Never derived
/// from anything user-identifying (metadata minimisation, ADR 0001 §5).
pub type DeviceId = [u8; 16];

/// A Hybrid Logical Clock timestamp. Total order is (wall_ms, counter, device).
#[derive(Clone, Copy, Debug, PartialEq, Eq, PartialOrd, Ord, Hash)]
pub struct Hlc {
    pub wall_ms: u64,
    pub counter: u32,
    pub device: DeviceId,
}

/// A Hybrid Logical Clock. Physical time is **injected** (`physical_ms`) so the
/// core stays pure and testable — the platform supplies a millisecond clock.
#[derive(Clone, Copy, Debug)]
pub struct HlcClock {
    last: Hlc,
}

impl HlcClock {
    pub fn new(device: DeviceId) -> Self {
        Self {
            last: Hlc {
                wall_ms: 0,
                counter: 0,
                device,
            },
        }
    }

    /// Stamp a local event. Monotonic even if the physical clock goes backwards.
    pub fn now(&mut self, physical_ms: u64) -> Hlc {
        let wall = physical_ms.max(self.last.wall_ms);
        let counter = if wall == self.last.wall_ms {
            self.last.counter + 1
        } else {
            0
        };
        self.last = Hlc {
            wall_ms: wall,
            counter,
            device: self.last.device,
        };
        self.last
    }

    /// Observe a remote timestamp (on receive), advancing our clock past it.
    pub fn observe(&mut self, remote: Hlc, physical_ms: u64) -> Hlc {
        let wall = physical_ms.max(self.last.wall_ms).max(remote.wall_ms);
        let counter = if wall == self.last.wall_ms && wall == remote.wall_ms {
            self.last.counter.max(remote.counter) + 1
        } else if wall == self.last.wall_ms {
            self.last.counter + 1
        } else if wall == remote.wall_ms {
            remote.counter + 1
        } else {
            0
        };
        self.last = Hlc {
            wall_ms: wall,
            counter,
            device: self.last.device,
        };
        self.last
    }

    pub fn last(&self) -> Hlc {
        self.last
    }
}

/// Append-only op-log for immutable records. Convergence = set-union by opaque id;
/// iteration order follows the HLC. (Track 1 in ADR 0001 §4.)
#[derive(Clone, Debug, Default)]
pub struct OpLog<T> {
    ops: BTreeMap<Hlc, T>,
}

impl<T: Clone> OpLog<T> {
    pub fn new() -> Self {
        Self {
            ops: BTreeMap::new(),
        }
    }

    /// Append an op. Append-only: an existing stamp is never overwritten.
    pub fn append(&mut self, id: Hlc, op: T) {
        self.ops.entry(id).or_insert(op);
    }

    pub fn merge(&mut self, other: &OpLog<T>) {
        for (id, op) in &other.ops {
            self.ops.entry(*id).or_insert_with(|| op.clone());
        }
    }

    pub fn len(&self) -> usize {
        self.ops.len()
    }

    pub fn is_empty(&self) -> bool {
        self.ops.is_empty()
    }

    /// Records in HLC order.
    pub fn iter(&self) -> impl Iterator<Item = (&Hlc, &T)> {
        self.ops.iter()
    }
}

/// Last-Writer-Wins register (Track 2: settings registers, per-key).
#[derive(Clone, Debug, PartialEq, Eq)]
pub struct Lww<T> {
    pub value: T,
    pub stamp: Hlc,
}

impl<T: Clone> Lww<T> {
    pub fn new(value: T, stamp: Hlc) -> Self {
        Self { value, stamp }
    }

    /// Merge: the higher HLC stamp wins (device id breaks ties deterministically).
    pub fn merge(&mut self, other: &Lww<T>) {
        if other.stamp > self.stamp {
            self.value = other.value.clone();
            self.stamp = other.stamp;
        }
    }
}

/// LWW-element set (Track 2: the tags set). An element is present iff its latest
/// add stamp is strictly greater than its latest remove stamp. Keying on the
/// normalised element resolves the concurrent duplicate-add problem (ADR 0001 §4:
/// the `tags_label_unique` constraint) — same key collapses on merge.
#[derive(Clone, Debug, Default)]
pub struct LwwSet<E: Ord + Clone> {
    adds: BTreeMap<E, Hlc>,
    removes: BTreeMap<E, Hlc>,
}

impl<E: Ord + Clone> LwwSet<E> {
    pub fn new() -> Self {
        Self {
            adds: BTreeMap::new(),
            removes: BTreeMap::new(),
        }
    }

    pub fn add(&mut self, element: E, stamp: Hlc) {
        bump(&mut self.adds, element, stamp);
    }

    pub fn remove(&mut self, element: E, stamp: Hlc) {
        bump(&mut self.removes, element, stamp);
    }

    pub fn contains(&self, element: &E) -> bool {
        match (self.adds.get(element), self.removes.get(element)) {
            (Some(a), Some(r)) => a > r, // add-wins on exact tie is avoided: ties impossible (unique HLC)
            (Some(_), None) => true,
            _ => false,
        }
    }

    pub fn values(&self) -> Vec<E> {
        self.adds
            .keys()
            .filter(|e| self.contains(e))
            .cloned()
            .collect()
    }

    pub fn merge(&mut self, other: &LwwSet<E>) {
        for (e, s) in &other.adds {
            bump(&mut self.adds, e.clone(), *s);
        }
        for (e, s) in &other.removes {
            bump(&mut self.removes, e.clone(), *s);
        }
    }
}

fn bump<E: Ord>(map: &mut BTreeMap<E, Hlc>, element: E, stamp: Hlc) {
    map.entry(element)
        .and_modify(|cur| {
            if stamp > *cur {
                *cur = stamp;
            }
        })
        .or_insert(stamp);
}

#[cfg(test)]
mod tests {
    use super::*;

    const DA: DeviceId = [0xAA; 16];
    const DB: DeviceId = [0xBB; 16];

    #[test]
    fn hlc_local_is_monotonic_even_if_clock_regresses() {
        let mut c = HlcClock::new(DA);
        let a = c.now(100);
        let b = c.now(100); // same physical ms → counter increments
        let d = c.now(50); // clock went backwards → wall stays, counter increments
        assert!(a < b && b < d);
        assert_eq!(b.counter, 1);
        assert_eq!(d.wall_ms, 100);
    }

    #[test]
    fn hlc_observe_advances_past_remote() {
        let mut c = HlcClock::new(DA);
        let _ = c.now(100);
        let remote = Hlc {
            wall_ms: 500,
            counter: 9,
            device: DB,
        };
        let merged = c.observe(remote, 100);
        assert!(merged > remote);
        assert_eq!(merged.wall_ms, 500);
    }

    #[test]
    fn oplog_converges_regardless_of_merge_order() {
        let mut a: OpLog<&str> = OpLog::new();
        let mut b: OpLog<&str> = OpLog::new();
        let s = |w, dev| Hlc {
            wall_ms: w,
            counter: 0,
            device: dev,
        };
        a.append(s(1, DA), "x");
        a.append(s(3, DA), "z");
        b.append(s(2, DB), "y");
        b.append(s(3, DA), "z"); // duplicate id, identical → dedup
        let mut ab = a.clone();
        ab.merge(&b);
        let mut ba = b.clone();
        ba.merge(&a);
        let av: Vec<_> = ab.iter().map(|(_, v)| *v).collect();
        let bv: Vec<_> = ba.iter().map(|(_, v)| *v).collect();
        assert_eq!(av, vec!["x", "y", "z"]); // HLC order
        assert_eq!(av, bv);
        assert_eq!(ab.len(), 3);
    }

    #[test]
    fn lww_register_higher_stamp_wins() {
        let s = |w| Hlc {
            wall_ms: w,
            counter: 0,
            device: DA,
        };
        let mut r = Lww::new("old", s(1));
        r.merge(&Lww::new("new", s(2)));
        assert_eq!(r.value, "new");
        r.merge(&Lww::new("stale", s(1)));
        assert_eq!(r.value, "new");
    }

    #[test]
    fn lww_set_add_remove_and_merge_converge() {
        let s = |w, dev| Hlc {
            wall_ms: w,
            counter: 0,
            device: dev,
        };
        // Device A adds "práce"; device B concurrently adds the same label later,
        // then A removes it earliest — final state keyed on the label.
        let mut a: LwwSet<String> = LwwSet::new();
        let mut b: LwwSet<String> = LwwSet::new();
        a.add("práce".into(), s(1, DA));
        b.add("práce".into(), s(2, DB)); // concurrent dup add, later stamp
        a.remove("práce".into(), s(1, DA)); // remove older than B's add
        let mut ab = a.clone();
        ab.merge(&b);
        let mut ba = b.clone();
        ba.merge(&a);
        assert!(ab.contains(&"práce".to_string())); // B's later add wins over A's remove
        assert_eq!(ab.values(), ba.values()); // convergent
        assert_eq!(ab.values().len(), 1); // no duplicate label
    }
}
