import { describe, expect, test } from 'vitest';
import {
  LIGHTNING_HISTORIC_COLORS,
  LIGHTNING_LIVE_COLORS,
  PRECIPITATION_RAMP,
  SNOW_RAMP,
} from './design-tokens.ts';
import {
  TIME_UNIT_MS,
  contoneField,
  lightningStrikes,
  precipitationField,
  rampColor,
} from './radar-field.ts';

/** A fixed, arbitrary timestamp; nothing here depends on the wall clock. */
const T = 1_700_000_000_000;

describe('rampColor', () => {
  test('clamps at both ends', () => {
    const ramp = ['#000000', '#808080', '#ffffff'];
    expect(rampColor(ramp, -1)).toBe('#000000');
    expect(rampColor(ramp, 2)).toBe('#ffffff');
  });

  test('returns an exact midpoint stop for an odd ramp at v=0.5', () => {
    const ramp = ['#000000', '#808080', '#ffffff'];
    expect(rampColor(ramp, 0.5)).toBe('#808080');
  });

  test('interpolates between adjacent stops', () => {
    expect(rampColor(['#000000', '#ffffff'], 0.5)).toBe('#808080');
  });

  test('returns the only stop of a single-colour ramp', () => {
    expect(rampColor(['#123456'], 0.42)).toBe('#123456');
  });
});

describe('precipitationField', () => {
  test('is deterministic for the same t', () => {
    expect(precipitationField(T)).toEqual(precipitationField(T));
  });

  test('paints a different picture for a different t', () => {
    const now = precipitationField(T)
      .map((cell) => cell.color)
      .join(',');
    const later = precipitationField(T + 3 * 3_600_000)
      .map((cell) => cell.color)
      .join(',');
    expect(now).not.toBe(later);
  });

  // Regression: the map once passed `frameIndex * 5`, a delta far below TIME_UNIT_MS, so every
  // timeline frame painted an identical picture and playback looked frozen. One frame must be one
  // five-minute step for the field to visibly advance.
  test('one TIME_UNIT_MS step is enough to change the picture (frame stepping)', () => {
    const colours = (t: number) =>
      precipitationField(t, 14, 20)
        .map((cell) => cell.color)
        .join(',');
    expect(colours(0)).not.toBe(colours(TIME_UNIT_MS));
    expect(colours(0)).not.toBe(colours(2 * TIME_UNIT_MS));
    // A raw frame index, or frames multiplied by 5, is NOT a time step: it must collapse.
    expect(colours(0)).toBe(colours(5));
  });

  test('only emits colours that are exact stops of the precipitation ramp', () => {
    const cells = precipitationField(T);
    expect(cells.length).toBeGreaterThan(0);
    for (const cell of cells) {
      expect(PRECIPITATION_RAMP).toContain(cell.color);
    }
  });

  test('keeps every cell inside the unit square with opacity between 0.55 and 0.95', () => {
    for (const cell of precipitationField(T)) {
      expect(cell.x).toBeGreaterThanOrEqual(0);
      expect(cell.x).toBeLessThanOrEqual(1);
      expect(cell.y).toBeGreaterThanOrEqual(0);
      expect(cell.y).toBeLessThanOrEqual(1);
      expect(cell.opacity).toBeGreaterThanOrEqual(0.55);
      expect(cell.opacity).toBeLessThanOrEqual(0.95);
    }
  });

  test('never exceeds the cols x rows cell budget and uses stable unique ids', () => {
    const cols = 14;
    const rows = 20;
    const cells = precipitationField(T, cols, rows);
    expect(cells.length).toBeGreaterThan(0);
    expect(cells.length).toBeLessThanOrEqual(cols * rows);
    expect(new Set(cells.map((cell) => cell.id)).size).toBe(cells.length);
  });
});

describe('lightningStrikes', () => {
  test('is deterministic per t', () => {
    expect(lightningStrikes(T)).toEqual(lightningStrikes(T));
  });

  test('draws every colour from the lightning ramps with stable, unique ids', () => {
    const palette = [...LIGHTNING_LIVE_COLORS, ...LIGHTNING_HISTORIC_COLORS];
    const strikes = lightningStrikes(T);
    expect(strikes.length).toBe(24);
    for (const strike of strikes) {
      expect(palette).toContain(strike.color);
      expect(strike.x).toBeGreaterThanOrEqual(0);
      expect(strike.x).toBeLessThanOrEqual(1);
      expect(strike.y).toBeGreaterThanOrEqual(0);
      expect(strike.y).toBeLessThanOrEqual(1);
      expect(strike.size).toBeGreaterThanOrEqual(5);
      expect(strike.size).toBeLessThan(20);
    }
    expect(new Set(strikes.map((strike) => strike.id)).size).toBe(strikes.length);
  });

  test('honours a custom count', () => {
    expect(lightningStrikes(T, 3).length).toBe(3);
  });

  test('moves the strike field by one TIME_UNIT_MS step', () => {
    const positions = (t: number) => lightningStrikes(t).map((s) => `${s.x},${s.y}`).join(';');
    expect(positions(0)).not.toBe(positions(TIME_UNIT_MS));
    // A sub-unit delta cannot reseed the strike PRNG: that was the frozen-frame bug.
    expect(positions(0)).toBe(positions(5));
  });
});

describe('contoneField', () => {
  test('paints every grid cell from the given ramp', () => {
    const cols = 10;
    const rows = 12;
    const cells = contoneField(T, SNOW_RAMP, cols, rows);
    expect(cells.length).toBe(cols * rows);
    for (const cell of cells) {
      expect(SNOW_RAMP).toContain(cell.color);
      expect(cell.opacity).toBe(0.85);
    }
  });

  test('is deterministic and differs between ramps for the same t', () => {
    const snow = contoneField(T, SNOW_RAMP, 10, 12);
    expect(contoneField(T, SNOW_RAMP, 10, 12)).toEqual(snow);
    const snowColors = snow.map((cell) => cell.color).join(',');
    const tempColors = contoneField(T, PRECIPITATION_RAMP, 10, 12)
      .map((cell) => cell.color)
      .join(',');
    expect(snowColors).not.toBe(tempColors);
  });
});
