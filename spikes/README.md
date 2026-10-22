# spikes/ — THROWAWAY

> **Note (2026-10-18):** Rewritten in Simplified Technical English on 2026-10-18; decisions and section numbering unchanged.

Scratch harnesses that reduce the risk of a decision. **They are not production code. They do not
ship. The app does not use them.** `apps/` stays empty until M3 (ADR 0001). Quarantine or delete a
harness after the GO or NO-GO of its spike is in the record.

- `rn-ffi/` — **Spike #1** (ADR 0001 §13). The question: can `uniffi-bindgen-react-native` (JSI)
  bind the Rust core into React Native on the New Architecture? The targets are the real mobile
  targets. The §1 invariant must stay intact (no raw key bytes across the FFI).
