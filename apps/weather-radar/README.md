# My Angular Native app

An Angular app rendering real native views, created from `@ng-native/template`.

```sh
npm start            # Metro; scan the QR code with Expo Go, or press i / a for a simulator
npm run ios          # straight to the iOS simulator
npm run android      # freeze-proof launcher: waits for Metro, then opens the app
npm run android:raw  # legacy `expo start --android` (opens immediately; can hang)
npm test             # the example test in src/app/app.test.ts, in Node with no simulator
npm run typecheck
```

`npm run android` runs `scripts/start-android.mjs`, which waits for Metro to report ready
and warms the Android bundle before it opens the experience, so it is safe to re-run. The
launcher also verifies the experience really opened — `dumpsys` must show Expo Go's focused
`ExperienceActivity` — and retries the open when Expo Go's cold start swallows the `exp://`
intent. The legacy `npm run android:raw` (`expo start --android`) opens the app before Metro
is serving, which can hang Expo Go forever on "Checking for new update...". Use the launcher
by default, and `android:raw` only for the legacy flow.

`src/app/app.ts` is the root component and `src/main.ts` mounts it. Expo Go is enough for development; a
release build or a native module Expo Go does not include needs a development build
(`npx expo run:ios`).

The app targets iOS and Android, so `npm run web`, which `create-expo-app` suggests as it finishes,
only says so and exits. Angular Native components can also render in a browser, set up as
https://ng-native.com/packages/web#beside-a-native-app describes.

Docs: https://ng-native.com
