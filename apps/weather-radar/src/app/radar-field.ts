import {
  LIGHTNING_HISTORIC_COLORS,
  LIGHTNING_LIVE_COLORS,
  PRECIPITATION_RAMP,
} from './design-tokens.ts';

/**
 * A pure, dependency-free, deterministic synthetic radar field.
 *
 * No `Math.random`, no `Date.now`, no Angular: every value is a pure function of its inputs, so
 * tests are hermetic and the same timestamp always paints the same picture. The field is a
 * seeded value-noise landscape sampled on a grid; the seeded PRNG positions the lightning
 * markers. None of this is real weather — callers label it as a mock.
 */

/** One painted cell of the precipitation/snow/temperature field. Percentages of the map area. */
export interface FieldCell {
  readonly id: string;
  readonly x: number; // 0..1, left offset as a fraction of width
  readonly y: number; // 0..1, top offset as a fraction of height
  readonly color: string;
  readonly opacity: number;
}

/** One lightning strike marker. */
export interface LightningStrike {
  readonly id: string;
  readonly x: number; // 0..1
  readonly y: number; // 0..1
  readonly color: string;
  readonly size: number; // px diameter
}

/**
 * Milliseconds per lattice step on the field's time axis. Exported so a caller can turn a
 * timeline frame index into the `t` these functions expect: one frame is one five-minute step.
 * Passing anything smaller (a raw frame index, or frames × 5) collapses the whole lattice onto
 * one noise sample, and every frame then paints the same picture.
 */
export const TIME_UNIT_MS = 5 * 60_000;

/** How many noise blobs span the map width and height. */
const FIELD_SPAN_X = 3.2;
const FIELD_SPAN_Y = 4.4;

/** Intensity below this reads as "no precipitation" and emits no cell. */
const RAIN_THRESHOLD = 0.35;

/** Coordinate offset that gives the precipitation field its own, stable pattern. */
const PRECIP_SEED = 137;

/** Fixed opacity for contone cells, so the base map still shows through slightly. */
const CONTOONE_OPACITY = 0.85;

/** Default diameter range for a lightning marker, in px. */
const STRIKE_SIZE_MIN = 5;
const STRIKE_SIZE_RANGE = 15;

/** Age palette for lightning: live colours first (youngest), then the historic ramp. */
const AGE_PALETTE: readonly string[] = [
  ...LIGHTNING_LIVE_COLORS,
  ...LIGHTNING_HISTORIC_COLORS,
];

/** Clamp a number into the closed unit interval. */
function clamp01(value: number): number {
  if (value < 0) {
    return 0;
  }
  if (value > 1) {
    return 1;
  }
  return value;
}

/** Mix an integer lattice point into a deterministic value in [0, 1). */
function hash3(ix: number, iy: number, iz: number): number {
  let hash = 0x9e3779b9;
  hash = Math.imul(hash ^ (ix | 0), 0x85ebca6b);
  hash = Math.imul(hash ^ (iy | 0), 0xc2b2ae35);
  hash = Math.imul(hash ^ (iz | 0), 0x27d4eb2f);
  hash ^= hash >>> 15;
  hash = Math.imul(hash, 0x2545f491);
  hash ^= hash >>> 13;
  return (hash >>> 0) / 4294967296;
}

/** Smoothstep easing for value-noise interpolation. */
function fade(value: number): number {
  return value * value * (3 - 2 * value);
}

/** Trilinear value noise in [0, 1); identical inputs always yield the identical value. */
function valueNoise(x: number, y: number, z: number): number {
  const xi = Math.floor(x);
  const yi = Math.floor(y);
  const zi = Math.floor(z);
  const u = fade(x - xi);
  const v = fade(y - yi);
  const w = fade(z - zi);

  const c000 = hash3(xi, yi, zi);
  const c100 = hash3(xi + 1, yi, zi);
  const c010 = hash3(xi, yi + 1, zi);
  const c110 = hash3(xi + 1, yi + 1, zi);
  const c001 = hash3(xi, yi, zi + 1);
  const c101 = hash3(xi + 1, yi, zi + 1);
  const c011 = hash3(xi, yi + 1, zi + 1);
  const c111 = hash3(xi + 1, yi + 1, zi + 1);

  const x00 = c000 + (c100 - c000) * u;
  const x10 = c010 + (c110 - c010) * u;
  const x01 = c001 + (c101 - c001) * u;
  const x11 = c011 + (c111 - c011) * u;
  const y0 = x00 + (x10 - x00) * v;
  const y1 = x01 + (x11 - x01) * v;
  return y0 + (y1 - y0) * w;
}

/** Fractal (multi-octave) value noise in [0, 1]. */
function fbm(x: number, y: number, z: number, octaves: number): number {
  let amplitude = 0.5;
  let frequency = 1;
  let sum = 0;
  let norm = 0;
  for (let octave = 0; octave < octaves; octave++) {
    sum += amplitude * valueNoise(x * frequency, y * frequency, z * frequency);
    norm += amplitude;
    amplitude *= 0.5;
    frequency *= 2;
  }
  return sum / norm;
}

/**
 * Sample the field at a normalised map position for time `t`, returning an intensity in 0..1.
 * `offset` shifts the noise lattice so each product gets its own stable pattern.
 */
function intensityAt(x: number, y: number, t: number, offset: number): number {
  const z = t / TIME_UNIT_MS + offset * 0.11;
  const raw = fbm(x * FIELD_SPAN_X + offset, y * FIELD_SPAN_Y + offset * 0.37, z, 3);
  return clamp01((raw - 0.18) / 0.64);
}

/** Split one hex channel out of `#rrggbb`. */
function channel(hex: string, index: number): number {
  return Number.parseInt(hex.slice(1 + index * 2, 3 + index * 2), 16);
}

/** Format a 0..255 channel as a two-digit lowercase hex pair. */
function toHex(value: number): string {
  const clamped = Math.max(0, Math.min(255, Math.round(value)));
  return clamped.toString(16).padStart(2, '0');
}

/** Linear blend between two `#rrggbb` colours. */
function mixHex(from: string, to: string, amount: number): string {
  const r = channel(from, 0) + (channel(to, 0) - channel(from, 0)) * amount;
  const g = channel(from, 1) + (channel(to, 1) - channel(from, 1)) * amount;
  const b = channel(from, 2) + (channel(to, 2) - channel(from, 2)) * amount;
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

/** Snap an intensity in 0..1 to the nearest exact stop of a ramp (hard, banded colours). */
function rampStop(ramp: readonly string[], value: number): string {
  if (ramp.length === 0) {
    throw new Error('rampStop: ramp must contain at least one colour');
  }
  const index = Math.min(ramp.length - 1, Math.round(clamp01(value) * (ramp.length - 1)));
  return ramp[index] ?? (ramp[0] ?? '#000000');
}

/** Coordinate offset derived from a ramp's contents, so each product samples a distinct field. */
function rampOffset(ramp: readonly string[]): number {
  let hash = 2166136261;
  for (const color of ramp) {
    for (let index = 0; index < color.length; index++) {
      hash ^= color.charCodeAt(index);
      hash = Math.imul(hash, 16777619);
    }
  }
  return (hash >>> 0) % 4096;
}

/** Hash an integer into a 32-bit unsigned seed for the PRNG. */
function hashInt(value: number): number {
  let hash = Math.imul(value ^ 0x9e3779b9, 0x85ebca6b);
  hash ^= hash >>> 13;
  hash = Math.imul(hash, 0xc2b2ae35);
  hash ^= hash >>> 16;
  return hash >>> 0;
}

/** Seeded mulberry32 PRNG: identical seeds produce identical streams. */
function mulberry32(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

/** Interpolate a ramp at v in 0..1. Clamps at both ends. */
export function rampColor(ramp: readonly string[], v: number): string {
  if (ramp.length === 0) {
    throw new Error('rampColor: ramp must contain at least one colour');
  }
  const first = ramp[0] ?? '#000000';
  if (ramp.length === 1) {
    return first;
  }
  const position = clamp01(v) * (ramp.length - 1);
  const lower = Math.floor(position);
  const upper = Math.min(lower + 1, ramp.length - 1);
  const amount = position - lower;
  const from = ramp[lower] ?? first;
  const to = ramp[upper] ?? from;
  return amount === 0 ? from : mixHex(from, to, amount);
}

/**
 * The precipitation field for a frame. Deterministic: the same (t, cols, rows) always yields
 * the same cells with the same colours and positions. Cells below the intensity threshold are
 * omitted so they read as "no rain".
 */
export function precipitationField(t: number, cols = 14, rows = 20): readonly FieldCell[] {
  const cells: FieldCell[] = [];
  for (let col = 0; col < cols; col++) {
    for (let row = 0; row < rows; row++) {
      const x = (col + 0.5) / cols;
      const y = (row + 0.5) / rows;
      const intensity = intensityAt(x, y, t, PRECIP_SEED);
      if (intensity < RAIN_THRESHOLD) {
        continue;
      }
      cells.push({
        id: `p-${col}-${row}`,
        x,
        y,
        color: rampStop(PRECIPITATION_RAMP, intensity),
        opacity: 0.55 + intensity * 0.4,
      });
    }
  }
  return cells;
}

/** Lightning strikes visible in a frame, newest (bright yellow) to oldest (dark red). */
export function lightningStrikes(t: number, count = 24): readonly LightningStrike[] {
  const strikes: LightningStrike[] = [];
  const rng = mulberry32(hashInt(Math.floor(t / TIME_UNIT_MS)));
  const span = AGE_PALETTE.length - 1;
  const denominator = Math.max(count - 1, 1);
  // A slow per-frame drift keeps the palette evolving with time while staying ordered by age.
  const drift = ((Math.floor(t / TIME_UNIT_MS) % 2) + 2) % 2;
  for (let index = 0; index < count; index++) {
    const bucket = Math.min(
      AGE_PALETTE.length - 1,
      Math.round(((index + drift) * span) / denominator),
    );
    strikes.push({
      id: `l-${index}`,
      x: rng(),
      y: rng(),
      color: AGE_PALETTE[bucket] ?? (AGE_PALETTE[0] ?? '#fffd54'),
      size: STRIKE_SIZE_MIN + rng() * STRIKE_SIZE_RANGE,
    });
  }
  return strikes;
}

/** A coarse contone layer for the temperature and gust products, sampling their ramps. */
export function contoneField(
  t: number,
  ramp: readonly string[],
  cols = 14,
  rows = 20,
): readonly FieldCell[] {
  const offset = rampOffset(ramp);
  const cells: FieldCell[] = [];
  for (let col = 0; col < cols; col++) {
    for (let row = 0; row < rows; row++) {
      const x = (col + 0.5) / cols;
      const y = (row + 0.5) / rows;
      const intensity = intensityAt(x, y, t, offset);
      cells.push({
        id: `c-${col}-${row}`,
        x,
        y,
        color: rampStop(ramp, intensity),
        opacity: CONTOONE_OPACITY,
      });
    }
  }
  return cells;
}
