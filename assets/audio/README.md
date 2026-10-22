# Audio for Klid

This folder holds the audio files of the activities in `src/features/calm/content.ts`.

- The file name is the id of the activity: `ticha-louka.m4a`, `vecerka.m4a`, and so on.
- When a file arrives, set `file` in the manifest (the path is relative to
  `src/features/calm/content.ts`):

  ```ts
  file: require("../../../assets/audio/<id>.m4a"),
  ```

  Metro bundles the file into the app. The audio stays local, without a network.

- The property `audioMode` in the manifest controls the playback mode. `"mix"` lets the music of
  the user play on (short exercises). `"duck"` only makes the music quieter during playback (guided
  meditations). The app never uses `doNotMix`.
