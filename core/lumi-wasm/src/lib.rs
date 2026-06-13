//! wasm surface over the Lumi shared core.
//!
//! **M0 stub — dependency-free.** Web is **deferred** (ADR 0001 §12): no
//! broad-surface option delivers an EN 301 549-grade web client today, so the
//! `wasm-bindgen` surface (and the S3 build guard that fails a prod web build if
//! health features persist unencrypted) is brought up when web is actually scoped.
//! This crate fixes the workspace shape (ADR 0001 §7) and the place that work lands.

pub use lumi_core::crisis;
