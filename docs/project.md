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
v26.11.1, OpenJDK 27. That host has **no Android SDK / emulator / adb**, so
on-device boot is evidenced by the produced Android Hermes bundle +
typecheck + unit tests, **not** by running an emulator (deferred to a
machine with the Android toolchain via `npm run android` / EAS).

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
