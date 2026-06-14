//! FFI facade over the Lumi shared core.
//!
//! **M0 stub — dependency-free.** This crate exists to fix the workspace shape
//! (ADR 0001 §7) and to be a safe (`forbid(unsafe)`) re-export facade over the core.
//! The v1 mobile binding is **Nitro** (`react-native-nitro-modules` + `nitrogen`) over a
//! hand-written **C ABI (cbindgen)** — validated by spike #1b (GO); see ADR 0003 +
//! `spikes/rn-nitro/SPIKE-REPORT.md`. Per ADR 0004 the `unsafe` C ABI lives in its own
//! crate, `core/lumi-ffi-cabi`; this crate stays safe and binding-generator-free.
//! The FFI invariant (handles / plaintext only, **no raw key bytes across the
//! boundary**, ADR 0001 §1) is enforced by what the boundary chooses to expose.
//!
//! For now it simply re-exports the read-only surfaces, so the binding has a
//! stable, narrow target.

pub use lumi_core::crisis;

/// Version of the core surface exposed across the FFI (for host-side sanity checks).
pub fn core_abi_version() -> u32 {
    0
}
