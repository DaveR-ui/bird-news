# Endpoints

This app is a **read-only** weather/radar screen. This file documents every network endpoint
related to it, whether it is called, and why.

## Standing contract

> Read-only by construction: GET only, no request bodies, no cookies/Authorization, no device
> identifiers, no query params, no telemetry/geovis/APM hosts.

Concretely, the app never:

- sends any HTTP verb other than `GET`;
- sends a request body, cookies, an `Authorization` header, or any custom identifying header;
- sends a device id, location, advertising id, or any user-identifying query parameter;
- touches any `*.lambda-url.eu-central-1.on.aws/geovis` host, any `*.apm.*.cloud.es.io` host, or
  any `/analytics` path.

At most a fixed `Accept: application/json` header is acceptable.

## Endpoints

| Endpoint | Status | Called? | Justification |
| --- | --- | --- | --- |
| `https://radar.wo-cloud.com/config/config.json` | public unauthenticated GET; verified HTTP 200; zero params | **YES — the only live endpoint** | The radar-layer feature config. A single, parameterless, unauthenticated GET fired only when the user presses "Load live radar config". |
| `https://api-app.wo-cloud.com/weather/nowcast/v10` | HTTP 401 | **NO** | Auth-gated (vendor-authenticated). The real radar nowcast data is out of reach for a read-only client, so it is rendered as **clearly-labeled mock** in the UI. |
| `https://tiles.wo-cloud.com/warnings/v6` | HTTP 401 | **NO** | Auth-gated. Rendered as clearly-labeled mock. |
| `https://api-app.wo-cloud.com/warnings/v6` | HTTP 401 | **NO** | Auth-gated. Rendered as clearly-labeled mock. |
| `https://api.wetteronline.de/webcam` | HTTP 400 | **NO** | Param-gated: it requires parameters, and the contract forbids sending params. Out of scope. |

## Where the live call lives

`src/app/radar-config.service.ts` (`RadarConfigService.loadConfig`) makes the one real GET.
`src/app/app.ts` renders a "Radar map — MOCK (not live)" section whose frames are hard-coded,
fictional placeholders — no fetch, no nowcast, no warnings.
