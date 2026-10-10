# Native Library Static Analysis - /tmp/opencode/rea/apk-copy/lib/

Analysis date: 2026-10-10. All evidence from readelf/strings/nm/python ELF parsing. No execution.
App: de.wetteronline.wetterapppro (jernverden Rust/UniFFI core, com.sun.jna JNA bridge).

## 1. Per-library inventory

x86_64 libjern_verden.so - ELF 64-bit LSB shared object, x86-64, version 1 (SYSV), dynamically linked, for Android 29, built by NDK r29-beta4 (14033849), stripped.
  NEEDED: libdl.so, libandroid.so, liblog.so, libm.so, libc.so. BIND_NOW, FLAGS_1 NOW.
  749 defined dynamic symbols. 318 ffi_* / 233 uniffi_* / 197 UNIFFI_META_* / 1 Java_*.
  Java_de_wetteronline_jernverden_RustRadarBridge_passNativeSurface (only Java_* export; JNI_OnLoad NOT exported).
  .comment: "rustc version 1.95.0 (59807616e 2026-04-14)"; "Android (13989888, +pgo, +bolt, +lto, +mlgo, based on r563880c) clang version 21.0.0"; "Linker: LLD 21.0.0".
  LOAD segments: R / R E / RW / RW. No RWX. No .so injection wrapper (no PK zip, no extra ELF payload).
  Embedded blob: one 3108-byte DEX at file offset 0x3042dc, magic b'dex\n035\x00', checksum 0x5c14e8e7, endian_tag 0x12345678, 3 class_defs, 60 strings, 20 types, 15 protos, 5 fields, 26 methods.

arm64-v8a/libjern_verden.so - 12475112 bytes. Android 35 (min API 35, vs 29 for the other three ABIs), same NDK r29-beta4, stripped, 749 exported symbols, same single Java_de_wetteronline_jernverden_RustRadarBridge_passNativeSurface.
  Embedded DEX at 0x3c429e, sha256 of the 3108-byte blob = 7927a7b44248ec83f67f9c3e65adaf37c1d5674eb85eb352d3da4a1f2bbbeefd - IDENTICAL to x86_64.
armeabi-v7a/libjern_verden.so - 8891916 bytes, Android 29, 749 exports, embedded DEX sha256 7927a7b44248ec83f67f9c3e65adaf37c1d5674eb85eb352d3da4a1f2bbbeefd (identical).
x86/libjern_verden.so - 14884136 bytes, Android 29, 749 exports, embedded DEX sha256 7927a7b44248ec83f67f9c3e65adaf37c1d5674eb85eb352d3da4a1f2bbbeefd (identical).
=> The DEX payload is byte-identical across all four ABIs; only the machine code around it differs. Expected.

libjnidispatch.so - JNA. x86_64: 126912 bytes, ELF 64-bit x86-64 shared object, NOT stripped, no SONAME, SYMBOLIC BIND_NOW, NEEDED libc.so/libdl.so/libm.so, 151 exports.
  arm64-v8a: 176520 bytes, 151 exports. armeabi-v7a: 126496 bytes, NOT stripped, SYMBOLIC BIND_NOW, 191 exports.
  All exports are Java_com_sun_jna_Native_* / Java_com_sun_jna_Native_ffi_* plus JNI-side helpers (Java_com_sun_jna_Native__1getPointer, __1getDirectBufferPointer, close, findSymbol, free, createNativeCallback, freeNativeCallback, initIDs, invokeDouble/Float, getAPIChecksum, getLastError, getNativeVersion, getWindowHandle0, indexOf, initialize_1ffi_1type). No custom/non-JNA exports. dlopen/dlsym/dlclose strings are JNA's own dynamic-loading layer (JNA must resolve native libs by path at runtime) - expected.

x86_64/libimage_processing_util_jni.so - 49416 bytes. Android 23, NDK r27, stripped, 8 exports, all Java_androidx_camera_core_ImageProcessingUtil_* versioned @@VERS_1.0. NEEDED: liblog, libandroid, libjnigraphics, libm, libdl, libc. Pure AndroidX Camera.

x86_64/libsurface_util_jni.so - 4912 bytes. Android 23, NDK r27, stripped, 1 export: Java_androidx_camera_core_impl_utils_SurfaceUtil_nativeGetSurfaceInfo@@VERS_1.0.

x86_64/libdatastore_shared_counter.so - 9424 bytes. Android 21, NDK r20, NOT stripped, 11 exports, 4 are Java_androidx_datastore_core_NativeSharedCounter_* (nativeCreateSharedCounter, nativeGetCounterValue, nativeIncrementAndGetCounterValue, nativeTruncateFile). AndroidX DataStore.

x86_64/libandroidx.graphics.path.so - 10760 bytes. Android 21, NDK r25c, stripped, 1 export: JNI_OnLoad@@LIBANDROIDX.GRAPHICS.PATH. Pure AndroidX.

## 2. Findings

### F1 - VERDICT: BENIGN. `dalvik/system/InMemoryDexClassLoader` + embedded DEX = AccessKit Android adapter (no third-party code loaded)

Evidence (x86_64/libjern_verden.so):
- `dex\n` magic found exactly once in the entire file, at file offset 0x3042dc. Same single occurrence in armeabi-v7a (0x3b3000), x86 (0x2fd85c), arm64-v8a (0x3c429e).
- Header parses cleanly: magic b'dex\n035\x00', checksum 0x5c14e8e7, file_size 3108, header_size 112, endian_tag 0x12345678, link 0, map_off 0xb60, strings 60@0x70, types 20@0x160, protos 15@0x1b0, fields 5@0x264, methods 26@0x28c, classdefs 3@0x35c.
- Byte-identical blob sha256 across all four ABIs: 7927a7b44248ec83f67f9c3e65adaf37c1d5674eb85eb352d3da4a1f2bbbeefd. Only the containing machine code differs per ABI, which is expected.

The DEX contains exactly 3 classes and 60 strings, all of them accessibility/UI plumbing:
- class_defs: Ldev/accesskit/android/Delegate$1; Ldev/accesskit/android/Delegate$2; Ldev/accesskit/android/Delegate;
- It imports only: Landroid/os/Bundle; Landroid/view/MotionEvent; Landroid/view/View$AccessibilityDelegate; Landroid/view/View$OnHoverListener; Landroid/view/View; Landroid/view/accessibility/AccessibilityNodeInfo; Landroid/view/accessibility/AccessibilityNodeProvider; Ldalvik/annotation/EnclosingMethod; Ldalvik/annotation/InnerClass; Ldalvik/annotation/Signature; Ldev/accesskit/android/Delegate[$1|$2|]; Ljava/lang/Object; Ljava/lang/Runnable;
- Its 26 methods are Delegate.getAccessibilityNodeProvider / createAccessibilityNodeInfo(JLandroid/view/View;I) / findFocus(JLandroid/view/View;I) / performAction(JLandroid/view/View;IILandroid/os/Bundle;)Z / onHover / onHoverEvent(JLandroid/view/View;IFF)Z / newCallback(Landroid/view/View;J)Ljava/lang/Runnable; / runCallback(Landroid/view/View;J)V - i.e. a subclass of View.AccessibilityDelegate that forwards accessibility requests into native code via a JNI adapterHandle long. Standard Android accessibility-adapter pattern.
- Source path of record present in .rodata: ~/.cargo/git/checkouts/accesskit-c6459a4682d5cf95/aca42fe/platforms/android/src/inject.rs (plus adapter.rs, event.rs, node.rs, util.rs)
- App-side wiring present in .rodata: platform/src/accesskit/android.rs, platform/src/accesskit/handlers.rs
- JNI symbols sitting next to the dex blob in .rodata (all used to instantiate and call the Delegate): dev.accesskit.android.Delegate, loadClass(Ljava/lang/String;)Ljava/lang/Class;, (Ljava/nio/ByteBuffer;Ljava/lang/ClassLoader;)V - the InMemoryDexClassLoader ctor - plus NewDirectByteBuffer / new_direct_byte_buffer data argument from the jni crate.

Reasoning: the app uses a git-pinned AccessKit (accesskit / accesskit_consumer / accesskit_android, the accessibility toolkit behind egui). On Android, AccessKit's InjectingAdapter cannot modify the host View class to add an AccessibilityDelegate, so it embeds a small pre-compiled Java delegate class as a DEX inside the native lib and instantiates it through InMemoryDexClassLoader(ByteBuffer, ClassLoader). The dex string pool includes the class name only because the JNI code names it when constructing the loader. The String "dex" adjacent to "dalvik/system/InMemoryDexClassLoader" in the strings dump is the tail of the DEX magic immediately following the string, not a separate token (verified by hexdump: `...BOOLEANdalvik/system/InMemoryDexClassLoader` directly followed by `dex\n035\x00` at 0x3042dc).

Attribution to AccessKit is confirmed by upstream: docs.rs accesskit_android lists the struct "InjectingAdapter - High-level AccessKit Android adapter that injects itself into an Android view without requiring the view class to be modified for accessibility", with deps accesskit, accesskit_consumer, jni ^0.21.1, log ^0.4.17 - matching the jni-0.21.1 crate found in the binary's registry strings.

Verdict: BENIGN LIBRARY ARTIFACT. The dynamic-dex-loading here is a fixed, ABI-independent, byte-identical 3 KB accessibility shim compiled into the lib at build time. It is not a downloaded, encrypted, obfuscated, or version-dependent payload. Note: this does technically mean the lib creates a ClassLoader at runtime, so a strict "no dynamic code loading" policy would flag it, but there is no evidence of anything being loaded other than this constant, first-party AccessKit class.

### F2 - BENIGN. Accessibility strings are standard GUI/accessibility plumbing (egui + AccessKit), not synthetic-event injection

- The AndroidX/AOSP accessibility surface in .rodata: android.view.accessibility.AccessibilityEvent, obtain(I)Landroid/view/accessibility/AccessibilityEvent;, setPackageName, setSource, setClassName, setBeforeText, setMovementGranularity, setAction, setToIndex, setFromIndex, setAddedCount, setRemovedCount, setItemCount, setContentChangeTypes, getParent()Landroid/view/ViewParent;, requestSendAccessibilityEvent(Landroid/view/View;Landroid/view/accessibility/AccessibilityEvent;)Z, getLocationOnScreen([I)V, setBoundsInScreen(Landroid/graphics/Rect;)V, getContext()Landroid/content/Context;, getPackageName()Ljava/lang/String;. This is the reflective API of AccessibilityEvent/AccessibilityRecord/AccessibilityNodeInfo.Builder.
- The setter names are consumed by AccessKit's consumer side, which walks the platform node tree and populates Android AccessibilityNodeInfo from it. The same AccessKit tree is what fed the embedded Delegate DEX (F1). The event-constructing strings belong to AccessKit's Event/Action plumbing.
- Why a GUI toolkit: egui-0.33.3, emath-0.33.3, ecolor-0.33.3, epaint-0.33.3, egui-wgpu-0.33.3, wgpu (git checkout 045f9a3b3e40a5c0/d61dc3a), naga, ash-0.38.0+1.3.281, usvg-0.47.0, resvg/resvg chain (tiny-skia-path-0.12.0, svgtypes-0.16.1, simplecss-0.2.2, fontdb-0.23.0, rustybuzz-0.20.1, image-0.25.10, png-0.18.1), tetsu-engine/tetsu-core, sky-scene/sky-scene-core, weather-radar/radar-layers, jern-composer, jern-verden, utils/astro-math. This is a GPU weather-radar/astro renderer, exactly as the app describes.
- Synthetic-event capability: could send synthetic accessibility events ONLY in the trivial sense that anything touching AccessibilityEvent can construct one. There is no performAction-on-other-apps, no AccessibilityService declaration, no gesture dispatch (dispatchGesture), no AccessibilityNodeInfo of other packages, no android.permission.BIND_ACCESSIBILITY_SERVICE, no screen reading of other apps. The API surface is purely describing this app's own View to TalkBack. No IME/clicker/hook markers found.
- No hooking evidence: no ArtMethod/JNI method-table patching. RegisterNatives appears only as a jni-crate panic-location string ("RegisterNatives"/"GetStaticMethodID result"/"JavaType::Method(_) should not come from parsing a ctor sig" region at 0x305272/0x305fee), i.e. jni crate internals; the word "Hook" appears only in the error-stack poison message ("internal error: entered unreachable code: Hook is poisoned..."), "hook" appears only in the error-stack path ~/.cargo/registry/src/index.crates.io-1949cf8c6b5b557f/error-stack-0.7.0/src/fmt/hook.rs and in the app's own lifecycle strings "Failed at lifecycle hook `fetch_data`" / "Failed at lifecycle hook `after_data`". Nothing touches JNIEnv function-table entries.

### F3 - Inventory-level IOCs: nothing malicious, but five items are analyst-notable

URLs / hosts found (verbatim, all first-party WetterOnline or benign crate sources):
- api-app.wo-cloud.com  api-app-stage.wo-cloud.com  api-app-dev.wo-cloud.com
- tiles.wo-cloud.com  tiles-stage.wo-cloud.com  tiles-dev.wo-cloud.com
- country-radar-bounds
- http://ns.adobe.com/xmp/extension/ and http://ns.adobe.com/xap/1.0/ (rexif/image metadata crate constants)
- https://bookstack.wo-cloud.com/books/webgpu-monorepo-jernverden/chapter/rustscene (internal docs URL leaked into the binary - shows the Rust monorepo path "webgpu-monorepo-jernverden")
- Crate-source URLs only otherwise: github.com/gfx-rs/wgpu, github.com/emilk/egui/issues/5295, github.com/hashintel/hash, docs.rs/egui, github.com/rerun-io/rerun, blog.demofox.org, shadertoy.com, w3.org SVG/XMP namespaces, auth scheme words "AMPMbasic_authrequesttargetmessageid" and "DevStaging" environment name.
No hardcoded IP addresses. No tracker/analytics/ad domains. No Telegram/C2-style IOCs.

Paths found (verbatim): /proc/stat, /proc/meminfo, /proc/cpuinfo, /proc/self/exe, /proc/self/mountinfo, /proc/self/cgroup, /sys/devices/system/cpu/cpu, /cpufreq/scaling_cur_freq, /sys/fs/cgroup, cpu.cfs_period_us, /dev/random, /proc/%d/maps (that last one is in libjnidispatch.so, JNA's own debug-support code).
These come from the sysinfo-0.38.4 crate (CPU/memory/system inventory) plus Rust std. No /data/user/0/... paths, no app-private file writes, no /system/bin/sh.

No executions primitives: no execve/execl/execv/system/popen/fork/posix_spawn in ANY of the 24 libs. The literal token "system" only occurs inside "dalvik/system/InMemoryDexClassLoader" and inside "weather-radar/vaer-api/src/..." cargo path fragments (/proc-fragment matches were all .rs file-path false positives).

No ptrace, no LD_PRELOAD, no /su, no magisk, no frida, no xposed, no gadget, no substrate, no busybox, no setuid/setgid, no /system/bin. (The single "Frida" regex hit is a false positive: it is the substring "Frida" inside "ThursdayFriday" in a date-format table.)
The only dlopen/dlsym/dlclose are in libjnidispatch.so (JNA) and libjern_verden.so's libloading from libdl.so, plus "NewDirectByteBuffer" for the AccessKit shim (F1).

Process env / misc strings in libjern_verden.so: getenv, RUST_LIB_BACKTRACE, RUST_BACKTRACE, debug_mode, logical_position, app package string de.wetteronline.jernverden, package name de.wetteronline.wetterapppro, prod/stage/dev backend names, "ProfiRadar", "WetterRadar", "RegenRadar", "Lightning". Nothing security-relevant.

Notable app-internal crate paths present (shows full scope of the Rust core, all consistent with a radar/astro renderer + HTTP fetching + caching):
  jern-verden/src/{lib.rs,logging.rs,sky_scene.rs,warning.rs,weather_radar.rs}
  jern-composer/src/{composer.rs,warning_overlay.rs}
  weather-radar/{weather-radar/src/rust_radar_instance.rs, radar-layers/src/*.rs, radar-services/src/*.rs, snippet-radar/src/*.rs, rendering/src/*.rs, vaer-api/src/{sse_parser.rs,tiles/*,images/request_image.rs,nowcast.rs,request_warning_bounds.rs}, api-client/warnings-api/src/request_warnings.rs}
  sky-scene/sky-scene[-core|-constants|-assets]/src/...
  tetsu-engine/tetsu-{core,render-world,input}/src/...
  utils/{astro-math,cache,geo,logging,math-helpers,wtch}/src/...
  platform/src/{accesskit/android.rs,asset_loader.rs,http.rs,lib.rs,runtime.rs,runtime/tokio.rs,window/android.rs}
  models/src/jern_verden/http.rs
Exported UniFFI API surfaces: weather_radar (RustRadarInstance: pan, zoom, recenter, render_frame, render_frame_fixed, replace_surface, resize, set_dark_mode, set_energy_saving, set_legend_visible, set_movement_state, set_network_state, set_placemark_location, set_radar_variant, set_compass_orientation, set_safe_ui_area, pause_rendering, resume_rendering, pointer_select, focused, loop_event, current_radar_state, all_time_steps_info, take_screenshot, release_surface), sky_scene, jern_verden (cache_used, clear_cache, create_composer, create_sky_scene, create_weather_radar, create_warning_radar, supports_gpu_compute, limit_center_within_bounds), jern_composer (add_sky_scene, add_weather_radar, remove_instance, render, resize, take_screenshot), callbacks (gpu_validation_error, analytics_logger.log). UniFFI checksums (uniffi_*_checksum_*) are present for ABI-version safety.

### F4 - No tampering/modded-build indicators in the native layer
- No JNI method-table hooking, no ArtMethod/ART patching, no inline hooking, no PLT/GOT hooking, no register_natives calls against Android framework classes.
- No license-gating strings anywhere in the 24 libs. Exact-word scan for: unlock, unlocked, premium, license, licensed, isPro, isPaid, bypass, crack, cracked, hack, hacked, patched, paid, trial, expired, fullversion, iap, billing, subscribed, removeads, noads - ZERO matches in every ABI of every lib. Same for root-detection strings and for su/magisk/frida/xposed/gadget/substrate/rum-panel.
- ELF metadata is uniform and clean: all stripped except libdatastore_shared_counter.so and libjnidispatch.so (both legitimately unstripped upstream), no RWX segment, no anomalous section names (only standard .note.android.ident/.dynsym/.dynstr/.rela.dyn/.relr.dyn/.rela.plt/.gcc_except_table/.rodata/.eh_frame_hdr/.eh_frame/.text/.plt/.data.rel.ro/.fini_array/.dynamic/.got/.got.plt/.relro_padding/.data/.bss/.comment/.shstrtab), no DT_RUNPATH/DT_RPATH, BIND_NOW/FULL RELRO everywhere.
- Confirmable NDK provenance: .comment shows Android clang 21.0.0 + LLD 21.0.0, .note.android.ident NDK r29-beta4 build 14033849, rustc 1.95.0. Uniform across all four ABIs. That is a coherent upstream toolchain, not an indicator of post-hoc binary patching (a modder would more likely show a mismatched/older compiler for edited functions).
- libjnidispatch.so carries the build path /home/matthias/src/jnalib/build/native-android-x86_64/libjnidispatch.so - stock JNA build artifact.

## 3. Limitations (what strings/symbols/ELF metadata cannot decide)
1. libjern_verden.so is stripped, so I cannot map the DEX-loading code (or any code) to specific functions. The claim that the InMemoryDexClassLoader+NewDirectByteBuffer+loadClass sequence runs is inferred from string co-location, DEX contents, and the jni-0.21.1 dependency, not from a traced call graph. Requires a disassembler (objdump/Ghidra/radare2) to confirm call order and that no OTHER class name is ever passed to the loader.
2. I confirmed the DEX contains only the 3 AccessKit Delegate classes, but I did not disassemble the Dalvik bytecode, so I cannot rule out that the Delegate's native callbacks do something beyond forwarding accessibility events. Static string evidence strongly indicates standard forwarding (only adapterHandle longs + AccessibilityNodeInfo/AccessibilityEvent types appear).
3. Whether the Rust HTTP layer sends the received BasicAuth credentials or any user identifier to api-app.wo-cloud.com cannot be determined statically; I only see the field names (HttpRequest/BasicAuth/HttpResponse/HttpStreamSource/HttpStreamTarget) and the hosts.
4. The `debug_mode` / `DevStaging` / `-dev` and `-stage` hostnames prove a dev/stage/prod environment switch exists, but not which is selected at runtime or whether a dev backend is reachable from production builds.
5. I compared ABIs only by hashes, symbol counts, ELF headers, and the shared DEX. Byte-level code comparison would need disassembly of each ABI to prove the arm64 build is not the "modified" one; hashes differing across ABIs is expected and proves nothing either way.
6. I did not look at Java/DEX side of the APK, only the native layer. Any license bypass, subscription spoofing or ad-removal would more plausibly live in smali, not .so, and is out of scope here.

## 4. Verdict

The native layer shows no behavior beyond the app's stated Rust radar-renderer purpose. Every one of the six libraries is attributable to a known upstream project with matching version strings and standard ELF provenance: the four AndroidX/Camera libs expose only their expected JNI entry points (bounded to 1-11 exports each, each szmbol named after its owning Java class), libjnidispatch.so is stock JNA (151-191 exports, all Java_com_sun_jna_Native_*, unstripped, with its own build path), and libjern_verden.so is a stripped UniFFI export surface (749 symbols: 318 ffi_*, 233 uniffi_*, 197 UNIFFI_META_*) wrapping an egui/wgpu/naga/usvg/resvg weather-radar and astro renderer whose internal crate paths (weather-radar/radar-layers, weather-radar/radar-services, sky-scene, tetsu-engine, jern-composer, jern-verden) are all consistent with that purpose. Its network footprint is limited to the vendor's own wo-cloud.com API and tile hosts plus dev/stage variants; there are no third-party domains, no IP literals, and no telemetry IOCs.

The two items that could have been alarming both resolved as benign, standard GUI-toolkit plumbing rather than as attack primitives. The `dalvik/system/InMemoryDexClassLoader` string is explained by an embedded, fixed, 3108-byte DEX that is byte-identical across all four ABIs and that contains exactly three classes - dev/accesskit/android/Delegate and its two inner classes - which subclass Android's View.AccessibilityDelegate and forward accessibility events into the Rust core via a long adapterHandle; this is AccessKit's documented InjectingAdapter strategy (its inject.rs is present in the binary's cargo checkout strings, and docs.rs describes InjectingAdapter as "injects itself into an Android view without requiring the view class to be modified for accessibility"). The AccessibilityEvent/AccessibilityRecord API strings belong to the same AccessKit consumer tree feeding egui's accessibility support; there is no accessibility-service abuse, no synthetic gesture/click dispatch, no cross-app node inspection, and no JNI/ART method-table hooking of any kind. Process- and device-inspection strings (/proc/cpuinfo, /proc/meminfo, /proc/self/mountinfo, /proc/self/cgroup) are from the sysinfo crate used by the renderer for CPU/GPU capability detection.

Does it explain the mod? No - the native layer does not explain a modded build. There is no license-bypass machinery, no premium/unlock/patch/crack vocabulary anywhere in the 24 binaries (zero exact-word matches), no root/tamper-detection bypass strings, no injected or dynamically fetched code, no hooking, and no behavioral capability beyond rendering and fetching the app's own tiles. The toolchain metadata is uniform and coherent across all four ABIs (NDK r29-beta4, clang/LLD 21.0.0, rustc 1.95.0), which is what an unmodified upstream build looks like. So whatever makes this APK "hostile" - if anything - is not in the .so files; it would have to be in the Java/DEX layer or in the build configuration, neither of which was in scope for this analysis.
