//! Crisis-line recommender — pure core module.
//!
//! Spec + safety invariants: `docs/crisis-line-recommender.md`.
//! Data verification: `docs/cz-crisis-data-checklist.md`.
//!
//! Layout:
//! - [`model`]   — data types (CrisisLine, Audience, Scope, Channel, dual Hours, …)
//! - [`hours`]   — opening-hours parser + `open_state` (best-effort, fail-open)
//! - [`ingest`]  — boundary-validating ČAPLD ingestion (degrade, never drop a line)
//! - [`matcher`] — deterministic recommender enforcing the 7 safety invariants

pub mod hours;
pub mod ingest;
mod json;
pub mod matcher;
pub mod model;

pub use hours::{open_state, parse_hours, NextOpen, OpenState, PragueTime};
pub use ingest::{ingest, Dataset};
pub use matcher::{match_lines, AgeBand, Chip, MatchQuery, MatchResult, Medium, RankedLine};
pub use model::{
    Audience, Channel, Cost, CrisisLine, Hours, Interval, OpeningHours, PhoneNumber, Provenance,
    Scope, Weekday,
};
