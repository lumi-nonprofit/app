// M1 walking-skeleton route (/m1-checkin) — real vault check-in, NOT the M3 designed flow.
// Off by default: while M1_VAULT_SKELETON_ENABLED (src/lib/featureFlags.ts) is false,
// app/_layout.tsx removes this route and the build does not link the vault module.
// With the flag on, reach it on device via the deep link `lumi://m1-checkin`.
import React from "react";

// Lazy: a development build loads every route file at start. A static import would evaluate the
// vault binding (NitroModules.createHybridObject) in a build that does not link the module.
const M1CheckinScreen = React.lazy(() => import("../src/features/m1/M1CheckinScreen"));

export default function M1CheckinRoute() {
  return (
    <React.Suspense fallback={null}>
      <M1CheckinScreen />
    </React.Suspense>
  );
}
