#!/usr/bin/env node
// Freeze-proof Android launcher for the weather-radar ng-native app.
//
// Root cause it fixes: `expo start --android` opens the exp:// URL on the
// device before Metro is serving the bundle, so Expo Go's native expo-updates
// hangs forever on "Checking for new update...". This script starts Metro,
// waits until it is actually ready, warms the Android bundle, resolves the
// device + LAN IP, and only then opens the experience. It is idempotent:
// re-running it is the recovery path.
//
// Self-test hook: set WEATHER_RADAR_WAIT_ONLY=1 to stop right after Metro is
// ready and skip every device step (used to smoke-test the Metro-wait logic
// without touching an emulator).

import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { networkInterfaces } from 'node:os';

const TAG = '[weather-radar]';
const log = (msg) => console.log(`${TAG} ${msg}`);
const logErr = (msg) => console.error(`${TAG} ${msg}`);

const WAIT_ONLY = process.env.WEATHER_RADAR_WAIT_ONLY === '1';
const METRO_READY_TIMEOUT_MS = 180_000;
const METRO_POLL_MS = 500;
const METRO_PROBE_ATTEMPTS = 2; // a couple of quick probes before assuming no Metro
const METRO_PROBE_TIMEOUT_MS = 1500; // short per-attempt timeout
const METRO_PROBE_POLL_MS = 300;
const BUNDLE_TIMEOUT_MS = 300_000;
const BUNDLE_ATTEMPTS = 3; // initial attempt + up to 2 retries
const ADB_TIMEOUT_MS = 15_000;

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// ---------------------------------------------------------------------------
// Child lifecycle (never leave an orphaned Metro process)
// ---------------------------------------------------------------------------

let child = null;
let shuttingDown = false;

function killChild(signal = 'SIGTERM') {
  if (child && child.exitCode === null && !child.killed) {
    try {
      child.kill(signal);
    } catch {
      // already gone
    }
  }
}

// Sentinel thrown by fatal() so async callers stop immediately.
const FATAL = Symbol('fatal');

// Terminate a failed run: stop Metro, print an actionable error, exit non-zero.
function fatal(message) {
  logErr(message);
  killChild('SIGTERM');
  setTimeout(() => {
    killChild('SIGKILL');
    process.exit(1);
  }, 500);
  throw FATAL;
}

function handleSignal(signal) {
  if (shuttingDown) return;
  shuttingDown = true;
  log(`received ${signal}; stopping Metro…`);
  killChild('SIGTERM');
  setTimeout(() => {
    killChild('SIGKILL');
    process.exit(0);
  }, 500);
}

process.on('SIGINT', () => handleSignal('SIGINT'));
process.on('SIGTERM', () => handleSignal('SIGTERM'));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

// Parse `--port <n>` from argv (default 8081).
function parsePort(argv) {
  const index = argv.indexOf('--port');
  if (index === -1) return 8081; // flag absent entirely → default 8081
  const raw = argv[index + 1];
  if (raw === undefined) {
    logErr('missing value for --port (expected `--port <number>`, e.g. `--port 8082`).');
    process.exit(1);
  }
  const port = Number(raw);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    logErr(`invalid --port value: ${raw}`);
    process.exit(1);
  }
  return port;
}

// Run a command with args as an array (no shell) and a hard timeout.
function run(cmd, args, { timeoutMs = ADB_TIMEOUT_MS } = {}) {
  return new Promise((resolve) => {
    let settled = false;
    let timer = null;
    const done = (result) => {
      if (settled) return;
      settled = true;
      if (timer) clearTimeout(timer);
      resolve(result);
    };

    const proc = spawn(cmd, args, { stdio: ['ignore', 'pipe', 'pipe'] });
    let stdout = '';
    let stderr = '';
    timer = setTimeout(() => {
      try {
        proc.kill('SIGKILL');
      } catch {
        // ignore
      }
      done({ code: -1, stdout, stderr: `${stderr}\n(timed out after ${timeoutMs}ms)` });
    }, timeoutMs);

    proc.stdout.on('data', (chunk) => (stdout += chunk.toString()));
    proc.stderr.on('data', (chunk) => (stderr += chunk.toString()));
    proc.on('error', (err) => done({ code: -1, stdout, stderr: `${stderr}${err.message || err}` }));
    proc.on('close', (code) => done({ code: code ?? -1, stdout, stderr }));
  });
}

// ---------------------------------------------------------------------------
// Steps
// ---------------------------------------------------------------------------

// Step 1 — probe /status a couple of times to detect an already-running Metro.
// If one is serving this port we reuse it and skip the spawn entirely.
async function isMetroRunning(port) {
  const url = `http://127.0.0.1:${port}/status`;
  for (let attempt = 1; attempt <= METRO_PROBE_ATTEMPTS; attempt++) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(METRO_PROBE_TIMEOUT_MS) });
      const body = await res.text();
      if (body.includes('packager-status:running')) return true;
    } catch {
      // connection refused / not up — assume no Metro and fall through to spawn
    }
    if (attempt < METRO_PROBE_ATTEMPTS) await delay(METRO_PROBE_POLL_MS);
  }
  return false;
}

// Step 2 — spawn Metro as a child, keeping its PID for signal forwarding.
function startMetro(port) {
  const metroArgs = ['start', '--port', String(port)];
  let cmd;
  let cmdArgs;
  try {
    const require = createRequire(import.meta.url);
    cmd = process.execPath;
    cmdArgs = [require.resolve('expo/bin/cli'), ...metroArgs];
  } catch {
    cmd = 'npx';
    cmdArgs = ['--no-install', 'expo', ...metroArgs];
  }

  log(`starting Metro: ${cmd} ${cmdArgs.join(' ')}`);
  const proc = spawn(cmd, cmdArgs, { stdio: 'inherit', detached: false });

  proc.on('error', (err) => {
    logErr(`failed to spawn Metro: ${err.message}`);
    process.exit(1);
  });
  proc.on('exit', (code, signal) => {
    if (shuttingDown) return;
    log(`Metro exited (code=${code} signal=${signal}); exiting.`);
    process.exit(code ?? (signal ? 1 : 0));
  });

  return proc;
}

// Step 3 — poll /status until Metro reports ready.
async function waitForMetro(port) {
  const url = `http://127.0.0.1:${port}/status`;
  const deadline = Date.now() + METRO_READY_TIMEOUT_MS;
  log(`waiting for Metro at ${url} …`);

  while (Date.now() < deadline) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
      const body = await res.text();
      if (body.includes('packager-status:running')) {
        log('Metro is ready (packager-status:running).');
        return;
      }
    } catch {
      // connection refused / not up yet — keep polling
    }
    await delay(METRO_POLL_MS);
  }

  fatal(
    `Metro did not become ready at ${url} within ${METRO_READY_TIMEOUT_MS / 1000}s. ` +
      'Check the Metro logs above (is the port already in use?).',
  );
}

// Step 4 — resolve the first connected Android device.
async function resolveDevice() {
  const { code, stdout, stderr } = await run('adb', ['devices']);
  if (code !== 0) {
    fatal(`\`adb devices\` failed: ${stderr.trim() || `exit ${code}`}`);
  }
  for (const line of stdout.split('\n')) {
    const match = line.trim().match(/^(\S+)\s+device$/);
    if (match) return match[1];
  }
  fatal(
    'no Android device connected. Start your emulator (AVD `pixel`) or plug in a device, then re-run. ' +
      'Legacy fallback: `npm run android:raw`.',
  );
}

// Step 5 — confirm Expo Go is installed on the device.
async function ensureExpoGo(serial) {
  const { code, stdout } = await run('adb', [
    '-s',
    serial,
    'shell',
    'pm',
    'list',
    'packages',
    'host.exp.exponent',
  ]);
  if (code !== 0 || !stdout.includes('host.exp.exponent')) {
    fatal(
      `Expo Go (host.exp.exponent) is not installed on ${serial}. ` +
        'Run `npm run android:raw` once to install it, then re-run `npm run android`.',
    );
  }
  log(`Expo Go present on ${serial}.`);
}

// Step 6 — clear any hung expo-updates state from a previous bad launch.
async function forceStopExpoGo(serial) {
  const { code } = await run('adb', ['-s', serial, 'shell', 'am', 'force-stop', 'host.exp.exponent']);
  if (code === 0) {
    log('Cleared any stuck Expo Go / expo-updates state (force-stop).');
  } else {
    log('Could not force-stop Expo Go (continuing).');
  }
}

// Step 7 — warm the Android bundle so Expo Go gets a fast first response.
async function warmBundle(port) {
  const url = `http://127.0.0.1:${port}/src/main.ts.bundle?platform=android&dev=true`;
  log('warming the Android bundle (first build can take ~10s) …');

  for (let attempt = 1; attempt <= BUNDLE_ATTEMPTS; attempt++) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(BUNDLE_TIMEOUT_MS) });
      if (res.status === 200) {
        await res.arrayBuffer(); // drain so the build fully completes
        log('Android bundle is ready.');
        return;
      }
      logErr(`bundle warm-up got HTTP ${res.status} (attempt ${attempt}/${BUNDLE_ATTEMPTS}).`);
    } catch (err) {
      logErr(
        `bundle warm-up failed: ${(err && err.message) || err} (attempt ${attempt}/${BUNDLE_ATTEMPTS}).`,
      );
    }
    if (attempt < BUNDLE_ATTEMPTS) await delay(2000);
  }

  fatal('Metro did not serve the Android bundle after 3 attempts. See the Metro logs above.');
}

// Step 8 — detect the LAN IP (never hardcoded), preferring a 192.168.x.x host.
function detectLanIp() {
  const candidates = [];
  for (const addresses of Object.values(networkInterfaces())) {
    for (const address of addresses ?? []) {
      const isIpv4 = address.family === 'IPv4' || address.family === 4;
      if (isIpv4 && !address.internal) candidates.push(address.address);
    }
  }
  const ip = candidates.find((candidate) => candidate.startsWith('192.168.')) ?? candidates[0];
  if (!ip) {
    fatal(
      'could not find a non-internal IPv4 address for the exp:// URL. ' +
        'Connect to Wi-Fi/LAN and re-run, or use `npm run android:raw`.',
    );
  }
  return ip;
}

// Step 9 — open the experience in Expo Go.
async function openExperience(serial, url) {
  const { code, stderr } = await run('adb', [
    '-s',
    serial,
    'shell',
    'am',
    'start',
    '-a',
    'android.intent.action.VIEW',
    '-d',
    url,
  ]);
  if (code !== 0) {
    fatal(`failed to open ${url} on ${serial}: ${stderr.trim() || `exit ${code}`}`);
  }
  log(`Opening ${url} on ${serial}`);
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  const port = parsePort(process.argv.slice(2));

  if (await isMetroRunning(port)) {
    log(`Reusing Metro already running on port ${port}`);
  } else {
    child = startMetro(port);
  }
  await waitForMetro(port);

  if (WAIT_ONLY) {
    log('WEATHER_RADAR_WAIT_ONLY=1: Metro is ready; skipping device steps (self-test).');
    return; // stay alive streaming Metro's logs
  }

  const serial = await resolveDevice();
  await ensureExpoGo(serial);
  await forceStopExpoGo(serial);
  await warmBundle(port);

  const url = `exp://${detectLanIp()}:${port}`;
  await openExperience(serial, url);

  log('ready — first paint can take ~30-60s on the software-GL (SwiftShader) emulator.');
  log('press Ctrl+C to stop Metro.');
}

main().catch((err) => {
  if (err === FATAL) return; // fatal() already printed and scheduled the exit
  logErr(`unexpected error: ${(err && err.stack) || err}`);
  killChild('SIGTERM');
  setTimeout(() => {
    killChild('SIGKILL');
    process.exit(1);
  }, 500);
});
