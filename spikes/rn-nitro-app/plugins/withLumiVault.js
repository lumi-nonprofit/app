// Step 4a — Expo config plugin: wires the app-integrated LumiVault Nitro module at `expo prebuild`.
// BEST-EFFORT starting point (could not be validated in-sandbox — no prebuild/device here). Iterate
// on prebuild errors; if it fights the wiring, use the bare-workflow fallback in the RUNBOOK (commit
// the generated android/ dir). Requires ANDROID_NDK_HOME in the prebuild environment.
const { withGradleProperties, withDangerousMod } = require("@expo/config-plugins");
const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

function setGradleProp(modResults, key, value) {
  const existing = modResults.find((i) => i.type === "property" && i.key === key);
  if (existing) existing.value = value;
  else modResults.push({ type: "property", key, value });
}

const withLumiVault = (config) => {
  // 1) New Architecture (mandatory on SDK 56, set explicitly) + restrict ABIs to what we build.
  config = withGradleProperties(config, (c) => {
    setGradleProp(c.modResults, "newArchEnabled", "true");
    setGradleProp(c.modResults, "reactNativeArchitectures", "arm64-v8a,x86_64");
    return c;
  });

  // 2) Build the Rust staticlib (+ cbindgen header) into the local module's cpp/ before the native
  //    build. The CMake wiring + module placement are done as explicit RUNBOOK steps (Step 3/5);
  //    this only ensures the Rust artifacts exist when CMake links them.
  config = withDangerousMod(config, [
    "android",
    (c) => {
      const root = c.modRequest.projectRoot;
      const moduleCpp = path.join(root, "modules", "lumi-vault", "cpp"); // adjust if placed elsewhere
      const script = path.join(
        root,
        "spikes",
        "rn-nitro-app",
        "scripts",
        "build-lumi-rust-android.sh",
      );
      if (fs.existsSync(script) && fs.existsSync(moduleCpp)) {
        execSync(`bash ${JSON.stringify(script)} ${JSON.stringify(moduleCpp)}`, {
          stdio: "inherit",
        });
      } else {
        // eslint-disable-next-line no-console
        console.warn(
          "[withLumiVault] skipped Rust build: script or module cpp/ not found yet (see RUNBOOK Step 3/4)",
        );
      }
      return c;
    },
  ]);

  return config;
};

module.exports = withLumiVault;
