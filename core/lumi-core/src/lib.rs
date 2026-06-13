//! Lumi shared core.
//!
//! Privacy-first, on-device logic. The first module landed is the crisis-line
//! recommender (see `docs/crisis-line-recommender.md`): a pure, deterministic
//! data model + matcher + opening-hours engine with no I/O and no network.

pub mod crisis;
