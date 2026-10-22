// Dynamic part of the Expo config. The static part stays in app.json.
// The Android APK workflow (.github/workflows/android-apk.yml) sets 2 environment variables:
//   LUMI_VERSION_NAME          version name of the build (from the git tag)
//   LUMI_ANDROID_VERSION_CODE  Android versionCode (the number of the workflow run)
// Without them, the values of app.json apply.
import type { ConfigContext, ExpoConfig } from "expo/config";

export default ({ config }: ConfigContext): ExpoConfig => {
  const versionName = process.env.LUMI_VERSION_NAME;
  const versionCode = Number(process.env.LUMI_ANDROID_VERSION_CODE);
  return {
    ...config,
    name: config.name ?? "Lumi",
    slug: config.slug ?? "lumi",
    ...(versionName ? { version: versionName } : {}),
    android: {
      ...config.android,
      ...(Number.isInteger(versionCode) && versionCode > 0 ? { versionCode } : {}),
    },
  };
};
