# spikes/ — THROWAWAY

Scratch harnesses for de-risking decisions. **Not production code, not shipped, not
wired into the app.** `apps/` stays empty until M3 (ADR 0001). Quarantine or delete
after the spike's GO/NO-GO is recorded.

- `rn-ffi/` — **Spike #1** (ADR 0001 §13): can `uniffi-bindgen-react-native` (JSI)
  bind the Rust core into React Native on the New Architecture, for the real mobile
  targets, with the §1 invariant intact (no raw key bytes across the FFI)?
