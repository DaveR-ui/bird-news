# bird-news

## Purpose
Destination repository for security research outputs produced by the
`opencode` agent system, and — as of 2026-10-10 — also the home of a
**read-only mobile application** demo.

Two kinds of content live here:

- **Documentation** — static security-audit reports under
  `docs/security-audits/`.
- **Application source** — a read-only Weather/Radar mobile app under
  `apps/weather-radar/` (see "Slices").

Both are DEFENSIVE in intent. The app is a **personal/educational,
read-only demonstration only**: no public release, no redistribution, no
premium/paywall bypass; vendor ToS and rate limits are respected.

## Stack / commands
Two stacks coexist; **there is NO build at the repository root**.

**Documentation** — Markdown + copied evidence files only. No build.

**App** (`apps/weather-radar/`) — **Angular Native** (ng-native 0.9.0) on
**Expo SDK 57** (57.0.x) / **React Native 0.86** (New Architecture) /
**Angular 22**. Target platform exercised: **Android** (iOS assets exist
in the template, but this demo is only exercised for Android).

> ⚠️ **Never run commands from the repository root** — there is no root
> `package.json`. Run every app command from the
> **`apps/weather-radar/`** package directory.

Canonical app commands (all run from `apps/weather-radar/`):

- `npm test` — vitest (hermetic, Node, no emulator needed)
- `npm run typecheck` — Angular AOT typecheck (`node metro.config.js && ngc --noEmit`)
- `npm start` / `npm run android` — Metro / Android via Expo Go or emulator
- `npx expo export --platform android` — produce the Android Hermes bundle
  (a build/CI proof that needs no physical device)

Node requirement: **≥ 22.18** (the ng-native documented floor; its own dev
environment uses Node 24). Toolchain present on the authoring host: Node
v26.11.1, OpenJDK 27.

### Android toolchain on this host (Option A, user-local, no sudo)

As of **2026-10-10** the host **does** carry a full Android toolchain,
installed **without sudo** under `$HOME` (nothing outside the home
directory, nothing committed to this repo):

- **cmdline-tools** — Google's official
  `commandlinetools-linux-16111833_latest.zip` (rev 23.0), unzipped to
  `~/Android/Sdk/cmdline-tools/latest`. Filename + SHA-1
  (`e025545c62a8e64c7559119566a569fb1dec5f60`, 181 052 239 B) verified
  against Google's `repository2-3.xml` manifest before download.
- **SDK packages** (installed via `sdkmanager --install`, licenses accepted
  non-interactively — the new cmdline-tools CLI no longer prompts for
  `--licenses`): `platform-tools` 37.0.1, `platforms/android-36` (API 36,
  ext. 17), `build-tools/36.0.0`, `emulator` 37.2.12, and
  `system-images/android-36/google_apis/x86_64` r07. Total ~5.6 GB.
- **AVD** — `pixel`, device profile `pixel_7`, target
  `system-images;android-36;google_apis;x86_64`.
- **Acceleration** — `/dev/kvm` present and world-writable on this host
  (`crw-rw-rw- root kvm 10,232`); the user is not in the `kvm` group but
  the device node is group/world-writable, so KVM is usable without
  `usermod -aG kvm`. Software GL via SwiftShader (no host GPU passthrough).
- **Env** — `ANDROID_HOME` / `ANDROID_SDK_ROOT` +
  `cmdline-tools/latest/bin`, `platform-tools`, `emulator` on `PATH` are
  exported from `~/.bashrc` (inserted **above** the non-interactive guard,
  so they apply to non-interactive shells too).

**Verified end-to-end on 2026-10-10** (cold boot, `-no-window
-no-audio -no-snapshot -accel on -gpu swiftshader_indirect`):

```
$ emulator -list-avds
pixel
$ adb devices
emulator-5554   device            # Android 16 / API 36
# Boot completed in 32162 ms
$ cd apps/weather-radar && npm run android      # expo start --android
Metro bundler started; Android Bundled 8890ms src/main.ts (1261 modules)
Expo Go (host.exp.exponent) installed on the emulator automatically
# In-app UI, read back via `adb shell uiautomator dump`:
  "Weather Radar (read-only)" / "Public GET only · no data sent · personal/educational use"
  "Load live radar config"  ->  "source: radar.wo-cloud.com/config/config.json (HTTP 200, live GET)"
  layers turned ON: Lightning, Lightning realtime overlay, Webcams, Precipitation, Temperature, Gust
  "Radar map — MOCK (not live) / FICTIONAL"  (unchanged, as designed)
```

So on-device boot is now **directly evidenced** by an emulator run, in
addition to the Android Hermes bundle, typecheck and unit tests. Expo Go
does host the ng-native custom native modules, so `expo run:android`
(a local Gradle dev build) is **not** required — note that it would also
have been blocked by OpenJDK 27, which is ahead of the AGP supported
range and cannot be changed without sudo.

Notes:

- The new `sdkmanager` (cmdline-tools ≥ 23) is a thin wrapper over the
  new `android` CLI: it prints a deprecation warning, still **accepts the
  classic semicolon package paths** (`platforms;android-36`,
  `build-tools;36.0.0`, `system-images;android-36;google_apis;x86_64`) and
  still writes the classic on-disk layout.
- `/usr/bin/adb` (android-tools, 37.0.0) remains installed system-wide;
  the SDK's `platform-tools` (37.0.1) wins on `PATH` once
  `~/.bashrc` is sourced.

### Read-only network contract (app)
The app is **read-only by construction**: HTTP **GET** only; no request
bodies, cookies, `Authorization`, device identifiers, or user-data query
parameters.

- The single live call is an unauthenticated, zero-parameter GET to
  `https://radar.wo-cloud.com/config/config.json` — **verified HTTP 200**.
- Vendor-authenticated endpoints (`.../weather/nowcast/v10`,
  `.../warnings/v6`) are **auth-gated (HTTP 401)** and are rendered as
  clearly-labeled **mock** data; `api.wetteronline.de/webcam` is
  param-gated (HTTP 400) and not called.
- The audit's forbidden hosts are **never** contacted: the unattributed
  `geovis` AWS Lambda (`*.lambda-url.eu-central-1.on.aws/geovis`), Elastic
  APM (`*.apm.*.cloud.es.io`), and `tiles.*/analytics` telemetry.

Full inventory, each justified: `apps/weather-radar/ENDPOINTS.md`.

## Metadata
- doc_language: en
- repo created: 2026-10-10
- initial content: static security audit of a modded Android APK, produced
  with the REA toolkit (morluto/rea) as the analysis engine.
- 2026-10-10: added application source (`apps/weather-radar/`), derived
  from that audit's §8 endpoint inventory. Framework verified as
  **ng-native 0.9.0** (alpha, actively developed; Angular 22 / Expo 57 /
  React Native 0.86 / Node ≥22.18 confirmed against the live repo).
- 2026-10-10: **Android toolchain installed locally (no sudo)** and the
  app **booted on an emulator** — see "Android toolchain on this host"
  above. Supersedes the earlier "no emulator on this host" statement.

## Slices
| Slice | Description | Entry points | Primary agents |
| --- | --- | --- | --- |
| weather-radar-app | Read-only ng-native (Angular + Expo) Android demo reusing WetterOnline public-GET endpoints | `apps/weather-radar/` | coder (angular), reviewer |

## Notes
- Analysis artifacts (APK copies, tool installs) live outside this repo, in
  `/tmp/opencode/`. Only reports, cited evidence, and app source are
  committed here. `node_modules/`, `.expo/`, `/android`, `/ios`, `dist/`
  are git-ignored inside the app (see `apps/weather-radar/.gitignore`).
- Scope discipline: all audits in this repo are DEFENSIVE and STATIC. No
  cracking, patching, circumvention, redistribution, or use of paid
  features. Nothing from the audited APK is executed.
- **ng-native is an alpha (0.9.0) community project**, not endorsed by
  Google/Angular/Expo; the demo is experimental. The app transitively
  carries 30 npm-audit findings from the bleeding-edge template — acceptable
  for a local read-only demo; revisit (`npm audit`) before wider use. The
  scaffold also ships template `AGENTS.md` / `CLAUDE.md` / `.claude/` as
  developer guidance.
