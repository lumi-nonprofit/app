# Pilot build — how to make and install the Android APK

A GitHub runner builds the APK (workflow `Android APK`, `.github/workflows/android-apk.yml`). You
push a tag. The runner builds the app. After your approval it signs the APK with the pilot key and
puts the APK into a draft release.

**Not checked yet:**

1. Sections 1 and 2 on GitHub. Nobody pushed a tag yet, and the environment `pilot-release` does
   not exist. The build and the signing script ran on a GitHub runner with a throwaway key. The
   signing script also ran on a local computer with a test key.
2. The `podman` command in section 1.
3. The install and the behaviour of the APK on a device. Section 3 describes what Android does in
   general.

## 1. One time: make the pilot key and give it to GitHub

Rules:

- Make the key on your own computer. Do not make it in CI or in a chat with an AI assistant.
- Do not commit the key. Keep 2 copies of the key and of its password in 2 places. For example: a
  password manager and an offline disk. GitHub does not show a secret again.
- Android accepts an update only when the new APK has the same key as the installed app. If you
  lose the key, each tester must uninstall the app before the next install. An uninstall deletes
  the data of the app.

Make the key. The command asks for a new password 2 times. The password needs 6 characters or
more:

```bash
keytool -genkeypair -v -keystore lumi-pilot.p12 -storetype PKCS12 -alias lumi \
  -keyalg RSA -keysize 4096 -validity 10000 -dname "CN=Lumi pilot"
```

`keytool` is a part of every JDK. On a computer without a JDK, run the same command in a
container. Make a new empty folder first, because the option `:Z` changes the SELinux label of
the folder:

```bash
mkdir lumi-key && cd lumi-key
podman run --rm -it -v "$PWD":/work:Z -w /work docker.io/library/eclipse-temurin:21-jdk \
  keytool -genkeypair -v -keystore lumi-pilot.p12 -storetype PKCS12 -alias lumi \
  -keyalg RSA -keysize 4096 -validity 10000 -dname "CN=Lumi pilot"
```

The alias must be `lumi`. The workflow uses this alias.

Give the key to GitHub in a protected environment:

1. Open the repository on GitHub: **Settings → Environments → New environment**. The name is
   `pilot-release`.
2. Turn on **Required reviewers** and add yourself. Save the rule.
3. Add 2 **environment secrets**:

   | Name                        | Value                                     |
   | --------------------------- | ----------------------------------------- |
   | `ANDROID_KEYSTORE_BASE64`   | the output of `base64 -w0 lumi-pilot.p12` |
   | `ANDROID_KEYSTORE_PASSWORD` | the password of the key                   |

Do not make repository secrets. Every person and every tool that can push a branch to the
repository can read a repository secret. An environment secret reaches only a job that uses the
environment, and only after your approval. This rule does not protect the key against a person
or a tool with admin access to the repository.

## 2. Make a pilot build

```bash
git switch main
git pull
git tag v0.1.0-pilot.1
git push origin v0.1.0-pilot.1
```

Rules:

- The tag looks like `v0.1.0` or `v0.1.0-pilot.1`. The workflow stops on any other form.
- The commit of the tag is on `main`. The workflow stops on any other commit.
- The tag without `v` is the version name of the build. The number of the workflow run is the
  Android version code.
- Use each tag one time. Do not move a tag. For the next build, make the next tag
  (`v0.1.0-pilot.2`).
- Push the tag with `git`. Do not make the release in the GitHub web page. The workflow does not
  add an APK to a published release.

Then:

1. Open **Actions → Android APK** on GitHub and open the run. The build takes about 17 minutes.
2. The job `Sign and draft the release` waits for you. Click **Review deployments**, select
   `pilot-release` and approve.
3. Open **Releases**. The run made a draft pre-release with 2 files: the APK and its SHA-256
   checksum.
4. Download the APK from the draft.

Only people with write access to the repository see a draft. The button **Publish release** makes
the APK public, because the repository is public. ADR 0007 reads "pilot" as "not a public
release". To keep the pilot limited, do not publish the draft. Send the APK file to the testers.

After a successful run, the draft holds the only copy of the APK that the pilot key signed. The
run also keeps a build artifact for a short time. It is the same app, signed with the public debug
key of the Expo template. The job `release` deletes this artifact at its end. Until then, and for
one day if the job fails, any signed-in GitHub user can download the artifact.

## 3. Install the APK on a phone

1. Copy the APK to the phone and open it.
2. Android asks for the permission to install unknown apps. Give the permission to the app that
   opened the file (the browser or the file manager).
3. Tap **Install**.

To update, install the next pilot APK over the app. Keep the app on the phone. The data stays.

An APK with a different key cannot update the app. Android stops the install. To install such an
APK, uninstall the app first. Android deletes the data.

The workflow uses the pilot key only for a build from a tag. So only an APK from a tag build can
update a pilot install. Do not give the testers an APK from EAS or from a local build: it has a
different key.

## 4. Check the file

The page of the run and the notes of the draft release show 2 values:

- **SHA-256 of the APK.** `sha256sum lumi-0.1.0-pilot.1-arm64-v8a.apk` on your computer must
  print the same value.
- **SHA-256 of the signing certificate.** It must be the same for all pilot builds. To read it
  from your key: `keytool -list -v -keystore lumi-pilot.p12 -alias lumi`. `keytool` prints the
  value in capital letters with colons. The run prints it in small letters without colons.

## 5. What the build contains

- Native code for one ABI: `arm64-v8a`. The APK needs a 64-bit ARM phone with Android 7.0 or
  newer.
- No native library of the Rust vault. While `M1_VAULT_SKELETON_ENABLED` is false
  (`src/lib/featureFlags.ts`), the app has no screen `/m1-checkin`. The deep link opens the first
  screen of the app.
- The known problems of the app are in [`STATUS.md`](STATUS.md).

Do not rename the workflow file. The Android version code is the number of the workflow run. The
numbers of a renamed workflow start again at 1. Android refuses an APK with a lower version code
over the app.

## 6. The build check on pull requests

The workflow also runs for a pull request that changes the app, its dependencies or the workflow.
The runner builds the APK, signs it with a throwaway key and does not keep it. This is a check
that the Android build still works. The page of the run shows the version, the size and the
native libraries of the APK.
