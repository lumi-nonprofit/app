//! FFI facade over the Lumi shared core.
//!
//! **M0 stub — dependency-free.** This crate exists to fix the workspace shape
//! (ADR 0001 §7) and to be the single place the cross-language binding will live.
//! The actual binding generator — `uniffi-bindgen-react-native` (JSI/TurboModules)
//! for the v1 RN app — is **exactly what M1 spike #1 evaluates** (the hard
//! GO/NO-GO gate, ADR 0001 §13). We deliberately do NOT pull UniFFI at M0:
//! - pulling it before the spike pre-commits the very thing the spike decides;
//! - the FFI invariant (handles / plaintext only, **no raw key bytes across the
//!   boundary**, ADR 0001 §1) is enforced by what this facade chooses to expose.
//!
//! For now it simply re-exports the read-only surfaces, so the binding has a
//! stable, narrow target.

pub use lumi_core::crisis;

/// Version of the core surface exposed across the FFI (for host-side sanity checks).
pub fn core_abi_version() -> u32 {
    0
}
