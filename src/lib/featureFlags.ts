/* The feature flags of the experiments. Turn one on only after a check on a device. */

/** iOS State of Mind (Apple Health): the write of the moods from a check-in.
    Intentionally ABSENT from the code: the library @kingstinct/react-native-healthkit
    does not support State of Mind yet; see docs/state-of-mind.md for the findings and the plan.
    The flag exists so that a future integration has one place to turn it on. */
export const STATE_OF_MIND_ENABLED = false;

/** The M1 end-to-end skeleton screen (/m1-checkin) over the Rust vault.
    Off: app/_layout.tsx removes the route, and the build does not link the native module
    lumi-vault (package.json → expo.autolinking.exclude).
    To turn it on: remove lumi-vault from exclude and build the Rust library as
    modules/lumi-vault/RUNBOOK.md says. Do not turn it on in a build for the testers
    (the default PIN, ADR 0004 (e), docs/STATUS.md). */
export const M1_VAULT_SKELETON_ENABLED = false;
