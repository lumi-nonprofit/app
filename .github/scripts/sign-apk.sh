#!/usr/bin/env bash
# Signs the APK from the job "build", checks the result and writes the notes.
# The workflow .github/workflows/android-apk.yml calls this script.
# It uses only tools of the runner image: keytool, apksigner, aapt2, unzip, sha256sum.
#
# Usage: sign-apk.sh <throwaway|pilot> <input APK> <output directory>
#
#   throwaway  Makes a key that lives only in this run. For the build check on pull requests.
#   pilot      Reads the pilot key from KEYSTORE_BASE64 and KEYSTORE_PASSWORD. For a release.
#              GITHUB_REF_NAME must be the tag, and the APK must have the version of the tag.
#
# Environment: ANDROID_HOME, RUNNER_TEMP, GITHUB_OUTPUT, GITHUB_STEP_SUMMARY, GITHUB_REF_NAME,
# GITHUB_RUN_NUMBER, ABI, COMMIT, DOCS_URL.
set -euo pipefail

mode="$1"
input="$2"
outdir="$3"

key="$RUNNER_TEMP/key.p12"
cert_file="$RUNNER_TEMP/cert.der"
verify_file="$RUNNER_TEMP/verify.txt"
badging_file="$RUNNER_TEMP/badging.txt"
trap 'rm -f "$key" "$cert_file"' EXIT

fail() {
  echo "::error::$1"
  exit 1
}

# 1. The key.
case "$mode" in
  throwaway)
    label="ci-$GITHUB_RUN_NUMBER"
    intro="Build check. The APK got a throwaway key and the run did not keep it."
    export KS_PASS=throwaway
    keytool -genkeypair -keystore "$key" -storetype PKCS12 -storepass:env KS_PASS -alias lumi \
      -keyalg RSA -keysize 2048 -validity 1 -dname "CN=Lumi CI throwaway key"
    ;;
  pilot)
    [[ "$GITHUB_REF_NAME" =~ ^v[0-9]+\.[0-9]+\.[0-9]+(-[0-9A-Za-z.]+)?$ ]] ||
      fail "The tag must look like v0.1.0 or v0.1.0-pilot.1."
    [[ -n "${KEYSTORE_BASE64:-}" && -n "${KEYSTORE_PASSWORD:-}" ]] ||
      fail "The secrets ANDROID_KEYSTORE_BASE64 and ANDROID_KEYSTORE_PASSWORD are not set in the environment pilot-release. See docs/pilot-release.md, section 1."
    label="${GITHUB_REF_NAME#v}"
    intro="Pilot build of Lumi for Android. It is for the pilot testers. It is not a public release (ADR 0007)."
    export KS_PASS="$KEYSTORE_PASSWORD"
    printf '%s' "$KEYSTORE_BASE64" | base64 --decode --ignore-garbage > "$key" ||
      fail "The secret ANDROID_KEYSTORE_BASE64 is not valid base64. See docs/pilot-release.md, section 1."
    ;;
  *)
    fail "Unknown mode: $mode"
    ;;
esac

# 2. SHA-256 of the certificate of the key. The signed APK must show the same value.
keytool -exportcert -keystore "$key" -alias lumi -storepass:env KS_PASS -file "$cert_file" ||
  fail "Cannot read the key with the alias 'lumi' from the keystore. Check the two secrets and the alias (docs/pilot-release.md, section 1)."
cert="$(sha256sum "$cert_file" | cut -d' ' -f1)"

# 3. Sign and verify. The newest build-tools of the runner image do the work.
tools="$(ls -d "$ANDROID_HOME"/build-tools/*/ | sort -V | tail -1)"
apk="lumi-$label-$ABI.apk"
mkdir -p "$outdir"
"${tools}apksigner" sign --ks "$key" --ks-key-alias lumi --ks-pass env:KS_PASS \
  --key-pass env:KS_PASS --v4-signing-enabled false --out "$outdir/$apk" "$input"
rm -f "$key"
"${tools}apksigner" verify --print-certs "$outdir/$apk" | tee "$verify_file"
grep -q -i "$cert" "$verify_file" ||
  fail "The signed APK does not have the certificate of the signing key."

# 4. Read the version from the APK itself.
"${tools}aapt2" dump badging "$outdir/$apk" > "$badging_file"
version_name="$(sed -n "s/^package: .* versionName='\([^']*\)'.*/\1/p" "$badging_file")"
version_code="$(sed -n "s/^package: .* versionCode='\([^']*\)'.*/\1/p" "$badging_file")"
[[ -n "$version_name" && -n "$version_code" ]] || fail "Cannot read the version of the APK."
if [[ "$mode" == pilot && "$version_name" != "$label" ]]; then
  fail "The APK has the version $version_name, but the tag says $label."
fi

# 5. Checksum, notes, summary.
(cd "$outdir" && sha256sum "$apk" > "$apk.sha256")
sha256="$(cut -d' ' -f1 "$outdir/$apk.sha256")"
size_mb=$(($(stat -c %s "$outdir/$apk") / 1048576))
{
  echo "$intro"
  echo
  echo "| | |"
  echo "| --- | --- |"
  echo "| File | \`$apk\` ($size_mb MB) |"
  echo "| Version | $version_name (version code $version_code) |"
  echo "| Commit | \`$COMMIT\` |"
  echo "| ABI | $ABI |"
  echo "| Signing key | $mode |"
  echo "| SHA-256 of the APK | \`$sha256\` |"
  echo "| SHA-256 of the signing certificate | \`$cert\` |"
  echo
  echo "How to install and how to check the file: [pilot-release.md]($DOCS_URL/pilot-release.md)."
  echo "Known limits of this build: [STATUS.md]($DOCS_URL/STATUS.md)."
} > "$outdir/release-notes.md"
{
  cat "$outdir/release-notes.md"
  echo
  echo '```text'
  grep -E "^(package|sdkVersion|minSdkVersion|targetSdkVersion|native-code)" "$badging_file"
  echo
  echo "native libraries:"
  unzip -Z1 "$outdir/$apk" 'lib/*' | sort
  echo '```'
} | tee -a "$GITHUB_STEP_SUMMARY"

echo "apk=$apk" >> "$GITHUB_OUTPUT"
