# Static Security Audit — "Weather & Radar" Android APK (modded build)

- **Audit date:** 2026-10-10
- **Target:** extracted directory `/home/admin/Downloads/Weather & Radar` (original artifact, never modified; analysis performed on an isolated copy under `/tmp/opencode/rea/`)
- **Artifact:** package `de.wetteronline.wetterapppro`, versionName `2026.11.1`, versionCode `2260015` (a "Premium Mod Apk {CracksHash}" repackage)
- **Verdict: BLOCK — do not install.** The APK impersonates the WetterOnline (wetteronline.de) vendor package but is signed by a third-party crack/mod key (`rockz5555 / Droid Freedom`), so none of its code can be attested to the vendor. Around that provenance failure: one unattributed reverse-geocoding endpoint fed by live device location (`…lambda-url.eu-central-1.on.aws/geovis?`, high), a FileProvider mapping the whole filesystem root into content URIs (high), a permissive `ANDROID` WebView JS bridge with file access (high), dangerous camera/microphone permissions (attributed to a user-initiated video-clip feature), and a broad unguarded deep-link surface. Importantly, the audit found **no confirmed injected trojan/RAT, dynamic payload loading, SMS/contacts/overlay abuse, C2 host, or native tampering** — the JS bundle, native layer, and dynamic-loading checks all came back clean. See §9 for the consolidated table and the one unresolved item.
- **Scope discipline:** DEFENSIVE, STATIC analysis only. The APK was never executed, installed, patched, or redistributed; no paid/premium functionality was used, unlocked, or circumvented. This report documents what the artifact *is* and what risks it *carries* — it is not a cracking guide and contains no bypass instructions.

## 1. Method and toolchain

| Component | Version | Provenance / verification |
|---|---|---|
| Node.js | v26.11.1 | satisfies REA `engines: ^22.19 \|\| ^24.11 \|\| >=26` |
| JDK | OpenJDK 27 (with `jdk.compiler`) | `java --list-modules` confirmed `jdk.compiler@27` |
| REA CLI | 6.3.0 | `npx -y rea-agents@latest --version` = 6.3.0 |
| JADX engine | `jadx-headless-mcp-0.7.1-all.jar` (42,619,858 B) | downloaded from `github.com/1013503897/jadx-headless-mcp/releases/download/v0.7.1`; SHA-256 `6e5eacf500b64292bfb73c49797c1958f6ee44646e43e868039ae7feb573ff75` matches REA's pinned audited release (`src/android/JadxRelease.ts`); REA Evidence confirmed `jar_sha256` equal at runtime |
| REA bridge | `rea-jadx-bridge` v1 | runtime `bridge_sha256 5a5a4e32…af351a1` |

REA usage followed the live README/docs: `npx -y rea-agents@latest inspect-android-package` → `search-android-classes` (full 16,505-name inventory) → `inspect-android-class` / `inspect-android-method` (targeted decompilation) → `trace-android-references`. Because REA's Android family takes an APK **file** (not a directory), the extracted tree was repacked byte-identically into an APK zip in the isolated workdir (`sha256 bf6cdcf9…db575`, 3,818 entries, root `AndroidManifest.xml` present). The original directory was never written to; the APK was never executed (REA also "does not execute the APK" by design).

Supporting, non-REA evidence (all read-only, on the isolated copy): `keytool` (certificate), `jarsigner`, MANIFEST.MF SHA-1 cross-checks, `strings` on DEX/resources, ELF metadata (`file`, `readelf`, `nm -D`) on `lib/`, and an AXML decode of the binary manifest.

**Analysis organization.** The audit ran as a typed panel: one reviewer on the manifest, one on DEX behavior (with REA decompilation), one general-purpose analyst on the `.so` libraries, and one reviewer on the embedded WebView/assets surface — coordinated by the orchestrator seat. All findings below are evidence-cited; anything labeled *inference* was flagged as such by the analyst that produced it.

## 2. Artifact identity

| Property | Value | Evidence |
|---|---|---|
| Package | `de.wetteronline.wetterapppro` | decoded manifest |
| versionName / versionCode | `2026.11.1` / `2260015` | decoded manifest |
| minSdk / targetSdk / compileSdk | 29 / 36 / 37 | decoded manifest |
| Size (repacked APK) | 52,153,273 B | `weather-radar.apk` |
| Entries | 3,818 (uniform mtime 2026-05-29) | zip listing |
| Classes | 16,505 across `classes.dex` (9,792,824 B) + `classes2.dex` (5,495,764 B) | REA `loaded.class_count` |
| Resources | 3,818 files + `resources.arsc` (3,399,136 B) | REA `loaded.resource_count` |
| Repacked-APK SHA-256 | `bf6cdcf949a7e3959d2bd15e56874f053c3cbb832755f3378afaab0d590db575` | sha256sum |
| Extracted-content integrity | the extracted tree matches its own signed digests | §3 |

Note on versioning: `versionName 2026.11.1` is forward-dated relative to the audit date (2026-10-10) — consistent with the vendor's month-based scheme, but unverifiable identity metadata in a modded build.

## 3. Signature and provenance — the modding evidence

This is the audit's central finding: **the artifact is not the vendor build**.

1. **Signing identity.** `keytool -printcert -file META-INF/BALA.RSA` →
   `Owner/Issuer: CN="rockz5555 OU=Droid Freedom Unit O=Droid Freedom Inc L=Unknown S=Unknown C=LK"`, self-signed, 2048-bit RSA `SHA256withRSA`, SHA-256 fingerprint `0C:FB:46:63:83:1A:0F:B8:D6:97:3A:AD:44:E2:21:A8:BA:78:F7:F6:84:BD:0B:17:D3:B4:4B:EC:82:31:64:84`, valid 2014-12-04 → 2044-11-26. "rockz5555 / Droid Freedom" is a mod/piracy re-signing identity, not WetterOnline's vendor key. A 30-year validity window on an anonymous self-signed cert is a standard crack-signing pattern.
2. **Signature schemes.** `META-INF/BALA.SF` header `X-Android-APK-Signed: 2, 3` — the APK Signing Block (v2/v3) covers the whole archive and was regenerated by the modder, so integrity guarantees now attest to the modder, not the vendor. (`jarsigner -verify` reports the legacy v1 layer "signed with a weak algorithm that is now disabled" — the v1 layer uses SHA-1 digests.)
3. **What was signed is what we analyzed.** The extracted `AndroidManifest.xml` SHA-1 equals the `SHA1-Digest` recorded in `META-INF/MANIFEST.MF` (`TUj5FB6zniYF9j2hUfaMpi8VyxU=`), and 200/200 sampled manifest entries match their recorded digests (0 mismatches) — i.e., the extracted tree is exactly the content the mod key signed. The mod was re-signed wholesale after modification; nothing in the archive post-dates the signature.
4. **Decode fidelity.** The decoded manifest was cross-checked against the shipped binary (40,312 B): structure and attributes identical — no hidden/second manifest.

Consequence: any injected or altered code is covered by a valid-looking signature chain that terminates at an anonymous crack identity. Every code-level observation in §5–§7 must be read under that light.

## 4. Permission posture (23 declared)

- **Dangerous (runtime-granted):** `ACCESS_FINE_LOCATION`, `ACCESS_COARSE_LOCATION`, `ACCESS_BACKGROUND_LOCATION`, `CAMERA`, `RECORD_AUDIO`, `READ/WRITE_EXTERNAL_STORAGE` (maxSdk 29), `POST_NOTIFICATIONS`. The location trio is justifiable for a weather app (widgets/notifications). **`CAMERA` + `RECORD_AUDIO` are not** — see finding M2: they combine with a CameraX linkage and an undocumented `wetteronline://deeplink.to/recorder` route, so whether this is a photo-sharing feature or injected capture cannot be settled from the manifest (full R8 obfuscation).
- **Signature-level (correct):** `de.wetteronline.wetterapppro.DYNAMIC_RECEIVER_NOT_EXPORTED_PERMISSION` (protectionLevel=signature).
- **Normal:** network/wifi state, foreground service, internet, boot completed, vibrate, wake lock, `SET_ALARM`, `READ_GSERVICES`, C2DM receive, and the four Android Auto (`androidx.car.app.*`, `android.car.*`) permissions.

## 5. Manifest attack surface

Hardening that is present and correct (verified against decoded manifest + decoded `res/xml/*`): `allowBackup="false"` **and** `dataExtractionRules` excluding root/file/database/sharedpref/external from both cloud-backup and device-transfer; no `debuggable`, no `sharedUserId`, no `testOnly`, no `usesCleartextTraffic` opt-in (targetSdk 36 blocks cleartext by default), no `requestLegacyExternalStorage`, `installLocation="internalOnly"`; no accessibility service, no device-admin receiver, no SMS/MMS receiver; all four `<provider>` elements `exported=false`; exported system components are permission-guarded (`c2dm SEND`, `BIND_JOB_SERVICE`, `DUMP`); `<queries>` minimizes package visibility. **No classic injected-manifest markers exist — any injected behaviour must live in the DEX.**

Findings (manifest-level, evidence-cited):

| # | Sev | Finding | Evidence |
|---|---|---|---|
| M1 | critical | Vendor-package impersonation signed by crack key | §3 |
| M2 | high | `FileProvider` `de.wetteronline.wetterapppro.fileprovider` maps **the whole filesystem root** into content URIs | `res/xml/filepaths.xml`: `<root-path name="root" path="."/>` alongside intended `<cache-path …screenshots/>`, `<external-files-path …Pictures/>`; provider `grantUriPermissions="true"` (exported=false) — any code path granting such a URI leaks `/data/data/<pkg>/` (tokens, DBs) |
| M3 | medium | `CAMERA` + `RECORD_AUDIO` + CameraX config provider + `wetteronline://deeplink.to/recorder` route | manifest uses-permission lines, `<meta-data …Camera2Config$DefaultProvider>`, deep-link filter `pathPrefix="/recorder"` |
| M4 | medium | Broad untrusted-intent deep-link surface, no guards | exported `activity-alias MainActivityGoogle` (autoVerify https for wetteronline.de/.at/.ch) **plus** custom scheme `wetteronline://deeplink.to` with 26 `pathPrefix`es incl. `/debug`, `/purchase`, `/settings`, `/recorder`; `res/xml/shortcuts.xml` adds host `shortcut.to`. Custom schemes are unverifiable — any app can fire them |
| M5 | medium | `MainActivity` `exported="true"` with **no intent-filter and no permission** — explicit-intent arbitrary-extras injection into the singleTask main UI | manifest lines 134–138 |
| M6 | medium | `RadarMapService` (Android Auto `CarAppService`, category WEATHER) exported, unguarded, `foregroundServiceType=location` | manifest lines 351–359 + car permissions |
| M7 | low | 4 widget providers + 2 configure activities exported without guards (normal for widgets, but handlers must not trust caller extras) | manifest lines 250–337 |
| M8 | low | Atypical empty `android:process=""` on `CarAppMetadataHolderService` (enabled=false, exported=false — curiosity only) | manifest lines 450–458 |
| M9 | info | Telemetry auto-init disabled: `firebase_analytics_collection_enabled=false`, `firebase_crashlytics_collection_deactivated=true`, `firebase_messaging_auto_init_enabled=false`, `google_analytics_ssaid_collection_enabled=false` | manifest meta-data; consistent with privacy-conscious build *or* with crash-telemetry suppression in a repackage (inference) — DEX-level behavior in §6 |
| M10 | info | No API keys / credentials in the manifest; Firebase config lives in resources | manifest review |

## 6. Code-layer (DEX) analysis

**Identity of the code.** The core is a legitimate WebGPU weather-radar renderer: Rust sources `jern-verden/src/weather_radar.rs`, `weather-radar/radar-services/src/*.rs` are visible in native strings, with vendor-only endpoints `api-app[-dev/-stage].wo-cloud.com`, `tiles[-dev/-stage].wo-cloud.com`, `radar[-dev/-stage].wo-cloud.com` (paths `weather/nowcast/v10`, `warnings/v6`). `RustRadarBridge` is the Surface→wgpu bridge; `RustHttpClient.get` executes the native-decided URL over HTTPS **with no injected identifiers or headers** (decompiled: `new URL(url).toString()` → OkHttp, headers `null`). The Java/Kotlin surface (16,505 classes, 14,486 of them obfuscated `defpackage.*`) and bundled SDKs are consistent with the legit app: `com.batch.android` (456 classes, EU push/CRM), Firebase/GMS, CameraX, Coil/Glide, OkHttp/Retrofit, JNA, Joda-Time. `com.appsflyer` classes = **0** — the "AppsFlyer License" string in the DEX is stray about-text, the SDK is not bundled.

| # | Sev | Finding | Evidence |
|---|---|---|---|
| D1 | high | **Unattributed AWS Lambda `geovis` endpoint** — the only external host outside vendor/Google/Elastic domains | verbatim in `classes2.dex` (string idx 22883): `https://gofugeki6i6l6pqhvgixmcidzm0egjcq.lambda-url.eu-central-1.on.aws/geovis?`. Disassembled by the assets reviewer (§8 W1): obfuscated method `Lox2;->u` builds it with `&altitude=`, `&tier=`, `&type=reversegeocoding&latitude=`, `&longitude=` from device coordinates and launches `ACTION_VIEW`. Absent from native strings, the JS bundle, and resources; never fetched by OkHttp. Frankfurt region + reverse-geocoding semantics are consistent with a vendor geodata service, but the caller is obfuscated and the host unattributed — see §9 unresolved item |
| D2 | medium | **Private telemetry channels despite publicly disabled Firebase analytics** | `classes.dex` verbatim: `https://279d6649c08a4af5a3362b9065842e05.apm.eu-central-1.aws.cloud.es.io/intake/v2/rum/events` (Elastic APM RUM) and `https://tiles.wo-cloud.com/analytics`; manifest sets `firebase_analytics_collection_enabled=false`, `firebase_crashlytics_collection_deactivated=true`, `google_analytics_ssaid_collection_enabled=false`. Monitoring/web-vitals route outside the surface users are told is off — a privacy-disclosure concern, not identifier exfiltration (no device-ID/IMEI/contacts/SMS seen reaching any third party) |
| D3 | low | Cleartext endpoints present but **neutralized by platform default** | `http://api-app.wetteronline.de/app/ticker/android`, `http://localhost/` in DEX strings; no `usesCleartextTraffic`/`networkSecurityConfig` anywhere and no `network_security_config` resource; targetSdk 36 blocks cleartext → dead endpoints (legacy domain superseded by `api-app.wo-cloud.com`) |
| D4 | low | `CAMERA`/`RECORD_AUDIO` tied to a **user-initiated weather video-clip feature**, not background capture | `<queries>` IMAGE_CAPTURE intent, CameraX `MetadataHolderService` meta-data, deeplink `/recorder`, class `de.wetteronline.videoclips.rendering.upload.WOVideoUploader`. Camera permission retained with `required=false` |
| D5 | info | **No dynamic code loading (cleared)** | grep of both DEX: `DexClassLoader`=0, `InMemoryDexClassLoader`=0, `PathClassLoader`=0, no URLClassLoader, no ReLinker/SoLoader; `loadLibrary` only for the six audited `lib/` modules; no hardcoded public IPv4 |
| D6 | info | `IntegrityCheckingUniffiLib` = **standard UniFFI binding-checksum stub (cleared)** | `uniffi_weather_radar_checksum_method_*(): short` + `ffi_weather_radar_uniffi_contract_version(): int` — binding/skew guard, not Play Integrity, not root detection, not signature self-check |
| D7 | info | **No overlay/SMS/contacts/accessibility abuse (cleared)** | manifest: no accessibility service, no `SYSTEM_ALERT_WINDOW`, no SMS/contacts permissions; DEX: `content://sms`=0, `content://contacts`=0, `SmsManager`=0; native `accesskit` usage exposes the radar surface to the OS accessibility tree only |
| D8 | info | License/DRM strings corroborate the tampered build | `Offline license has expired or will expire soon. Remaining seconds: `, `LICENSE_CHECK_FAILED`, `Billing override value was set by a license tester.`, `No license URL`, `LicenseDurationRemaining` in `classes.dex` |

**Modded-malware differential (important negative result):** despite the re-signing and heavy obfuscation, the DEX layer shows **no injected trojan/RAT, no dynamic dex loading, no SMS/contacts/banking-overlay abuse, no hardcoded C2 IP, and no tracking-header injection at the Rust HTTP bridge**. The known bad actor is the re-signed provenance itself (§3), not an injected capability found in code. The one item that escalated after DEX-level REA inspection was the `geovis` endpoint (D1): its caller was subsequently disassembled by the assets reviewer (§8 W1), which raised D1 to high — the URL consumes live lat/lon/altitude/`tier` via `ACTION_VIEW`. Minor unverified-by-construction remainders: the single-hit framework primitives `getDeviceId`/`ContactsContract`/`queryIntentActivities` (library-derived, unattributed).

## 7. Native libraries (`lib/`)

Six `.so` files × 4 ABIs (arm64-v8a, armeabi-v7a, x86, x86_64). Only `libjern_verden.so` is the application's own payload; the other five are stock upstream components:

| Library | Size (x86_64) | ELF profile | NEEDED | Exports |
|---|---|---|---|---|
| `libjern_verden.so` | 13,459,312 | Android 29, NDK r29-beta4 (build 14033849), clang/LLD 21.0.0, rustc 1.95.0, **stripped**, BIND_NOW/FULL RELRO, no RWX | libdl/libandroid/liblog/libm/libc | **749** (318 `ffi_*`, 233 `uniffi_*`, 197 `UNIFFI_META_*`, 1 `Java_de_wetteronline_jernverden_RustRadarBridge_passNativeSurface`) |
| `libjnidispatch.so` | 126,912 | **not stripped**, SYMBOLIC | libc/libdl/libm | 151, all `Java_com_sun_jna_Native_*` |
| `libimage_processing_util_jni.so` | 49,416 | Android 23, NDK r27, stripped | +libjnigraphics | 8 `Java_androidx_camera_core_ImageProcessingUtil_*` |
| `libsurface_util_jni.so` | 4,912 | Android 23, NDK r27, stripped | — | 1 `Java_androidx_camera_core_impl_utils_SurfaceUtil_*` |
| `libdatastore_shared_counter.so` | 9,424 | Android 21, NDK r20, not stripped | — | 11 (4 `Java_androidx_datastore_core_NativeSharedCounter_*`) |
| `libandroidx.graphics.path.so` | 10,760 | Android 21, NDK r25c, stripped | — | 1 `JNI_OnLoad` |

`libjern_verden.so` wraps the `egui 0.33.3` / `egui-wgpu` / `wgpu` (git `d61dc3a`) / `naga` / `usvg 0.47.0` / `resvg` toolchain — a GPU weather-radar and astro renderer, matching the app's description — with internal crate paths visible in `.rodata` (`jern-verden/src/{weather_radar,sky_scene,warning}.rs`, `weather-radar/radar-services`, `sky-scene`, `tetsu-engine`, `jern-composer`). Its UniFFI surface (`pan`, `zoom`, `render_frame`, `take_screenshot`, `set_radar_variant`, …) is radar-map control.

**The two alarming strings resolved as benign, evidence-verified:**

- **N1 (resolved benign) — `dalvik/system/InMemoryDexClassLoader` is AccessKit's embedded-dex shim, not dynamic code loading.** The string is immediately followed (file offset 0x3042dc) by a valid DEX: magic `dex\n035\0`, checksum `0x5c14e8e7`, file_size 3108, exactly **3 classes — `dev/accesskit/android/Delegate{,​$1,$2}`** — importing only `View$AccessibilityDelegate`, `AccessibilityNodeInfo`, `AccessibilityNodeProvider`, `Bundle`, `MotionEvent`, `Runnable`; 26 methods forward into native via a JNI `adapterHandle` long. Source path of record is in the binary: `~/.cargo/git/checkouts/accesskit-c6459a4682d5cf95/.../platforms/android/src/inject.rs`. The 3,108-byte DEX is **byte-identical across all four ABIs** (`sha256 7927a7b4…befd`) — a fixed build-time accessibility shim for the app's own view tree (AccessKit's documented `InjectingAdapter` pattern behind egui), not a downloaded/obfuscated payload. Caveat (limitation): this does technically instantiate a ClassLoader at runtime; proving the *only* class ever loaded is this constant DEX would require disassembly (lib is stripped).
- **N2 (resolved benign) — accessibility-event strings are GUI plumbing.** All descriptors come from git-pinned `accesskit-c6459a4682d5cf95` + `jni-0.21.1`; the referenced Android class set is narrow (`View`, `AccessibilityDelegate`, `AccessibilityNodeInfo`, `AccessibilityEvent`, `MotionEvent`, `Bundle`, `Rect`, `Context`) and traffic is inbound-only. Zero occurrences of `AccessibilityService`, `UiAutomation`, `performGlobalAction`, `dispatchGesture`, `injectInputEvent`.

**N3 — IOC sweep clean.** URLs/hosts verbatim: `api-app{,-dev,-stage}{.wo-cloud.com}`, `tiles{,-dev,-stage}.wo-cloud.com`, `radar{,-dev,-stage}.wo-cloud.com`, `country-radar-bounds`, plus an internal docs leak `bookstack.wo-cloud.com/books/webgpu-monorepo-jernverden/...` (information disclosure, low value). No hardcoded IPs in any lib (the `31.0.101.2115` "IP" is a driver version string), no third-party/tracker domains, no `ws://`/`wss://`/gRPC/tonic, no TLS lib in NEEDED. Paths are `sysinfo`-crate provenance (`/proc/cpuinfo`, `/proc/meminfo`, `/proc/self/mountinfo`, `/dev/random`). No `execve`/`system`/`popen`/`fork`/`ptrace`/`LD_PRELOAD`/`setuid`/`/system/bin` in any of the 24 binaries. The lone `Frida` hit is the substring inside `ThursdayFriday`.

**N4 — no native-layer tampering.** Exact-word scan across all 24 binaries: **zero** matches for `unlock/premium/license/crack/hack/patch/bypass/iap/billing/trial`, and zero for root-detection strings (`su/magisk/frida/xposed/gadget/substrate`). No JNI/ART method-table hooking, no PLT/GOT hooking, no RWX segments, no `DT_RPATH`. Toolchain metadata uniform across ABIs (NDK r29-beta4, clang 21, rustc 1.95.0) — a coherent upstream build, not post-hoc patching; `libjnidispatch.so` carries its stock JNA build path.

**N5 — cross-ABI note.** arm64-v8a declares min API **35** vs **29** for the other three ABIs (same NDK); exports, NEEDED sets, and the embedded DEX are identical.

**Verdict (native):** the native layer shows no behavior beyond the stated Rust radar-renderer purpose and **does not explain the mod** — no license bypass, no unlock vocabulary, no hooking, no injected code, no network IOCs beyond the vendor's own hosts. Whatever differs from the store build must live in the Java/DEX layer or build configuration. Per native-analysis limitations: the lib is stripped, so the DEX-loading call order is inferred from string co-location and DEX contents, not a traced call graph; and what the Rust HTTP layer actually transmits to `api-app.wo-cloud.com` (e.g., BasicAuth credentials seen as field names in `models/jern_verden/http.rs`) is not statically decidable. Native evidence: `evidence/` in the isolated workdir, summarized in `native-analysis/REPORT.md` (118 lines, F1–F4).

## 8. Embedded assets / WebView surface

The app is a hybrid: the radar map is a native Rust (`libjern_verden.so`, §7) wgpu surface, and much of the UI is an embedded **Angular web application** (258 files under `assets/`) served into a WebView, plus a second self-contained payload (`assets/snippetLib/index.html`, 101,713 B, fully inline, no external `<script src>`) rendered on Android Auto via the `appassets.androidplatform.net` host pattern. The WebView's start config is **synthesized at runtime by native code** (`Lp4e;->shouldInterceptRequest` returns `application/javascript` for `/assets/applications/android/start-config.js`) — it is not present in the APK, so the injected config (locale, endpoints, feature flags) is not statically reviewable.

**The Angular bundle itself is clean** (`assets/android/`: `main-KQZ24XO5.js` 863,123 B + 66 chunks, largest 549,317 B; 3 workers; polyfills; `VERSION` = `2026.3.0`; `prerendered-routes.json` = `{"routes":{}}`; `assets/android/3rdpartylicenses.txt` 77,027 B = valid Angular MIT list; all endpoints vendor: `radar[-dev/-stage].wo-cloud.com`, `tiles*.wo-cloud.com`, `api.wetteronline.de`, `to.wetteronline.de`; `wss://realtime.tiles*.wo-cloud.com` for tile streaming). Minified but not obfuscated. Verified absent: API keys/tokens/secrets (0 pattern hits), analytics SDKs (firebase/gtag/amplitude/segment/batch/appsflyer/facebook/sentry/mixpanel = 0; the apparent `gtag`/`adjust`/`pixel` hits are substring false positives in `oStringTag`/`_adjustIndex`/WebGL `pixelStorei`), `eval(` (0), WebSocket URLs to non-vendor hosts (0), `window.postMessage('*')` (0), and premium/subscription/license/unlock strings (0 — billing is native-only). `resources.arsc` contains exactly two http strings, both vendor: `https://wetteronline.de/includedstatements.json` and `https://wetterapp-1.firebaseio.com` (vendor's own Firebase project). No hidden files, no encrypted blobs, no oversized binaries (largest is a WebAssembly SVG rasterizer, 2.6 MB).

| # | Sev | Finding | Evidence |
|---|---|---|---|
| W1 | high | **Unattributed AWS Lambda `geovis` endpoint, fed by live device location** — disassembled caller | `classes2.dex` string (idx 22883): `https://gofugeki6i6l6pqhvgixmcidzm0egjcq.lambda-url.eu-central-1.on.aws/geovis?`. Smali-level disassembly of obfuscated method `Lox2;->u` (bytecode 3895760–3900968): builds the URL with `const-string "&altitude="`, `"&tier="`, `"&type=reversegeocoding&latitude="`, `"&longitude="` from fields typed `D`/`Double` (`Lz09_`), constructs `new Intent(String, Uri)` with `android.intent.action.VIEW` and calls `startActivity` (insns 1259–1270). Appears **exactly once** in the whole APK (0 hits in classes.dex, resources.arsc, native libs, and the JS bundle), never via OkHttp |
| W2 | high | Crack re-signing invalidates vendor-origin assumptions for the whole asset surface | §3 (`META-INF/BALA.RSA` `rockz5555/Droid Freedom`); DEX checksums intact (adler32 `0x413a1b69`/`0x65cdaf10`) → tampering pre-dates signing, as expected for a mod |
| W3 | high | **`ANDROID` JS bridge wired into the radar WebView with file access** | `classes.dex` method `Lrd;->a` (bytecode ~0x3b7xxx): `const-string "ANDROID"` → `addJavascriptInterface` (insn 143), `setJavaScriptEnabled` (151), `setDomStorageEnabled` (154), `setAllowFileAccess` (171), `setAllowContentAccess` (172). Bridge methods reachable from WebView JS: `openLink(String)`, `configChanged(String)`, `shareScreenshot(String)`, `navigateUp()` (JS side uses the same names: `main-KQZ24XO5.js` `window.appInterface=…`, `webkit.messageHandlers.shareScreenshot/logMessage/openCityDetails/requestUserLocation/…`) |
| W4 | medium | Android Auto `snippetLib` payload is fully query-parameter driven with unvalidated fields | 16-parameter URL template verbatim in `classes2.dex` (byte 1537493): `https://appassets.androidplatform.net/assets/snippetLib/index.html?locale=%s&isoCountryCode=%s&layer=%s&warningType=%s&timeStep=%s&…&latitude=%s&longitude=%s&…&geosvg=%s&translations[text_label_content]=%s<br>%s` — `latitude/longitude/geosvg/translations[]` have no visible encoding/whitelisting; only `warningType` is whitelisted (`["FX","TS","RR","SL"]`); payload drives native callbacks `ANDROID.onRadarClick/onPeriodButtonClick/onPlayButtonClick` |
| W5 | medium | No `networkSecurityConfig`; no certificate pinning | manifest has neither `usesCleartextTraffic` nor `networkSecurityConfig` (grep = 0) while `http://api-app.wetteronline.de/app/ticker/android` still exists in `classes.dex`. Cleartext is blocked by the platform default at targetSdk 36, so the http URL is dead — the residual gap is **no pinning** for `*.wetteronline.de` / `*.wo-cloud.com` |
| W6 | low | Flag-gated remote CDN script (spectorjs) present in the shipped bundle | `main-KQZ24XO5.js`: `this.loadSpector&&zv("https://cdn.jsdelivr.net/npm/spectorjs@latest/dist/spector.bundle.js")` — `loadSpector=!1` hardcoded; if any build flips the gate, remote JS runs inside a WebView that has a native bridge (W3) |
| W7 | low | WebView user agent rewritten at runtime | `Lrd;->a`: `getUserAgentString` → append → `setUserAgentString` (insns 155–170) |
| W8 | low | Remote `dynamic-imports.js` loaded from `radar.wo-cloud.com` | `assets/android/index.html`: `<script src="https://radar.wo-cloud.com/scripts/dynamic-imports.js">` + `<base href="/android/">` — compromise/spoof of the host would stream code into the UI (vendor TLS boundary applies) |
| W9 | info | WebView host classes are R8-obfuscated (inventory gap) | `classnames.txt`: 17 `WebView*` classes = Batch's bridge + AndroidX `org.chromium.support_lib_boundary.*`; hosts `Lrd;`, `Lrl;`, `Lpc2;`, `Lava;`, `Ldxb;`, `Lvf9;`, `Lza3;`, `Lrdd;` — no third-party WebView factories |
| W10 | info | Classic file:// escalation and mixed content **not** enabled | `setAllowFileAccessFromFileURLs` / `setAllowUniversalAccessFromFileURLs` / `setMixedContentMode` = 0 hits in both DEX files (defaults are safe; `setAllowFileAccess(true)` per W3 remains latent) |
| W11 | info | Hybrid architecture confirmed, hardening reasonable | `VERSION=2026.3.0`, `prerendered-routes.json` empty, native-injected `start-config.js`; manifest `allowBackup=false`, `installLocation=internalOnly`, no `debuggable`, targetSdk 36 |

**Panel reconciliation note:** an independent assets pass (verdict "pass", 0.8) reviewed only the JS bundle and agreed it is clean; the richer disassembly session (verdict "concern", 0.87, evidence above) supersedes it for scope. The two did not conflict — the JS layer alone is clean; the findings live in the native bridge wiring and the single `geovis` endpoint.

## 9. Findings summary, aggregation, and conclusion

**Overall verdict: BLOCK — do not install or run.** The install-blocking basis is provenance: the artifact packages the genuine WetterOnline app under a crack re-signing key, so nothing inside can be attested to the vendor. Around that, the audit found one genuinely suspicious capability (an unattributed reverse-geocoding endpoint fed by live location), a filesystem-wide FileProvider mapping, and a permissive WebView bridge — but **no confirmed injected trojan/RAT, dynamic payload loading, SMS/contacts/banking-overlay abuse, C2 IP, or native tampering**.

### Consolidated findings

| Sev | ID | Finding | Layer |
|---|---|---|---|
| critical | M1 | Vendor-package impersonation signed by `rockz5555/Droid Freedom` crack key (§3); DEX checksums intact → tamper pre-signing | signature |
| high | W1 | Unattributed AWS Lambda `geovis` endpoint built from live lat/lon/altitude/`tier`, opened as `ACTION_VIEW` browser intent; single occurrence, nowhere else in the APK | DEX (disassembled) |
| high | W2 | Whole asset/code surface unauthenticated to vendor (consequence of M1) | signature |
| high | W3 | `ANDROID` JS bridge (`openLink/configChanged/shareScreenshot/navigateUp`) in WebView with `setJavaScriptEnabled` + `setAllowFileAccess(true)` + `setAllowContentAccess(true)` | DEX/WebView |
| high | M2 | FileProvider maps **device filesystem root** (`<root-path path=".">`) into content URIs with `grantUriPermissions=true` | manifest/res |
| medium | M3 / D4 | `CAMERA`+`RECORD_AUDIO` with `/recorder` deep link — attributed by DEX analysis to the user-initiated weather video-clip feature (`WOVideoUploader`), still unusual for a weather app | manifest/DEX |
| medium | M4 | Broad unguarded deep-link surface (38 paths incl. `/debug`, `/purchase`) | manifest |
| medium | M5 | `MainActivity` exported, no filter, no guard | manifest |
| medium | M6 | Car `RadarMapService` exported, unguarded, location FGS | manifest |
| medium | D2 | Private Elastic APM RUM + tiles analytics while Firebase/Crashlytics are publicly disabled — privacy-disclosure concern, not identifier exfiltration | DEX |
| medium | W4 | Android Auto payload fully parameter-driven (16 params, lat/lon/geosvg unvalidated) | DEX/assets |
| medium | W5 | No `networkSecurityConfig`, no cert pinning; legacy cleartext URL present (dead at targetSdk 36) | manifest/DEX |
| low | M7, M8, W6, W7, W8, D3 | Widget exports; empty `process` attr; flag-gated spectorjs CDN script; UA rewrite; remote `dynamic-imports.js`; dead cleartext endpoints | mixed |
| info | D5–D8, N1–N5, W9–W11 | No dynamic code loading (Java side); UniFFI checksum stub; no a11y/overlay/SMS abuse; native layer clean (AccessKit embedded-dex explained); no native unlock/license vocabulary; JS bundle clean; no ARSC anomalies | all layers |

### Was malicious behavior injected by the mod?

Across all layers, the modded-malware differential is **negative**: no dynamic code loading, no overlay/SMS/contacts/accessibility abuse, no native hooks, no unlock/license-bypass code in the native binaries, no trackers or secrets in the embedded web UI, and no exfiltrated identifiers (the Rust HTTP bridge injects no tracking headers). What the build *does* carry is the re-signing itself plus license-check strings (`LICENSE_CHECK_FAILED`, `Offline license has expired or will expire soon. Remaining seconds:`, `Billing override value was set by a license tester.`) that are consistent with a premium-bypass toolchain operating at the billing/entitlement layer — consistent with, but not uniquely proving, the "Premium Mod" claim.

### The one unresolved item

**W1/D1 — the `geovis` Lambda endpoint** is the single capability that cannot be attributed. Evidence: `type=reversegeocoding&latitude=&longitude=&altitude=&tier=`, device coordinates, browser `ACTION_VIEW`. The Frankfurt region + reverse-geocoding semantics fit a legitimate vendor geodata service (a weather app needs place-name lookup), but a random-subdomain AWS Lambda that consumes live coordinates is also exactly the shape a lightweight exfiltration beacon takes, and it is *only* reachable from obfuscated code. Treat as unattributed; resolve via vendor confirmation or DNS/TLS ownership evidence. This is the audit's top residual risk and the reason the verdict is not "proven benign despite re-signing".

### Recommendations

1. **Do not install this build.** If the app is wanted, install the vendor build from Google Play on the same versionCode.
2. **Remove** the `<root-path>` FileProvider entry (expose only media subpaths); drop `setAllowFileAccess(true)`/`addJavascriptInterface` surface or bind methods with strict URL/path validation; add `networkSecurityConfig` with pinning for vendor hosts.
3. **Report** the `rockz5555/Droid Freedom` re-signing to WetterOnline; ask the vendor to confirm the `geovis` endpoint's ownership and parameters.
4. **Differential diff** against the legitimate APK (same versionCode) is the definitive injection test and remains the recommended next step if stronger attribution than static evidence is required.

### Scope statement (restated)

This audit is defensive and static. The artifact was never executed, installed, patched, or redistributed; no premium functionality was used, unlocked, or circumvented; the report contains no bypass instructions. All conclusions rest on the cited evidence in §§3–8 and `evidence/`.

## 10. Limitations

- Static analysis only; the artifact was never executed, so runtime behavior (actual C2 traffic, payload staging) is unobserved by design.
- All 16,505 classes are R8-obfuscated (`defpackage.*`); decompiled code is a *derived representation* — method semantics are read from JADX output, not original source.
- Native `.so` inspection is limited to ELF metadata, dynamic symbols, and embedded strings; deep disassembly of `libjern_verden.so` (13.4 MB stripped Rust) was out of the toolchain's scope.
- Attribution of "vendor feature vs. modded addition" is inherently limited without the legitimate vendor APK for differential comparison; flagged as the top follow-up in §11.

## 11. Recommended follow-ups

1. **Differential comparison** against the legitimate WetterOnline build (same versionCode) to enumerate modified/added classes — the definitive test for injected behavior.
2. Deep dynamic analysis **only inside a disposable device/emulator sandbox** (network capture, runtime hooking) if attribution beyond static evidence is required — out of scope here.
3. Disassembly of `libjern_verden.so` (Ghidra/IDA) for the native-layer questions raised in §7.
4. Report the cracked re-signing identity to the vendor.

## Appendix — evidence index

All paths under `docs/security-audits/weather-radar-pro-2026-11-1/evidence/`:
- `manifest-decoded.xml` — decoded binary AXML manifest (via REA + cross-checked against shipped binary)
- `classnames.txt` — full 16,505-class inventory (REA)
- `urls-dex1.txt`, `urls-dex2.txt` — URL strings harvested from `classes.dex` / `classes2.dex` with counts
- `signing-evidence.txt` — keytool/SF/digest cross-check output
- `native-analysis-REPORT.md` — full native-library analysis (F1–F4, per-lib inventory, cross-ABI hashes)
- Code-layer evidence (REA Evidence JSON for `inspect-android-package`, class inventory, `RustHttpClient`, `IntegrityCheckingUniffiLib`, `defpackage.su`, `com.PinkiePie`, `de.wetteronline.wetterapp.App`) and WebView/disassembly evidence (bytecode of `Lrd;->a`, `Lox2;->u`, `Lp4e`) were produced by the panel and are summarized verbatim in §§6–8; raw REA outputs remain in the isolated workdir `/tmp/opencode/rea/`.
