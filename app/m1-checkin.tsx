// The M1 skeleton route (/m1-checkin): a real vault check-in, not the M3 flow. It is off by
// default: while `M1_VAULT_SKELETON_ENABLED` (src/lib/featureFlags.ts) is false, app/_layout.tsx
// removes this route. The build then does not link the vault module. With the flag on, the deep
// link `lumi://m1-checkin` opens the route on a device.
import React from "react";

// Lazy: a development build loads every route file at the start. A static import would evaluate
// the vault binding (NitroModules.createHybridObject) in a build that does not link the module.
const M1CheckinScreen = React.lazy(() => import("../src/features/m1/M1CheckinScreen"));

export default function M1CheckinRoute() {
  return (
    <React.Suspense fallback={null}>
      <M1CheckinScreen />
    </React.Suspense>
  );
}
