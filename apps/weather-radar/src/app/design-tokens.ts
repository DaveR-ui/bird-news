/**
 * Design tokens for the Weather & Radar visual clone.
 *
 * Palette, layout metrics, and the radar data-viz ramps were extracted verbatim from the
 * original "Weather & Radar" Android radar app and are the fidelity requirement. This module is
 * pure TypeScript (no Angular, no `@ng-native/*`) so both the component tree and the Node test
 * suite can consume it.
 */

/** Core UI palette (light and dark surfaces). */
export const COLOR = {
  primary: '#10658e',
  primaryPressed: '#00537f',
  primaryHover: '#1375a5',
  primaryDeep: '#003959',
  tint: '#e6eff3',
  tintHover: '#daedf7',
  surface: '#ffffff',
  tooltipSurface: '#f3f7fb',
  surfaceSnow: '#f2f7f9',
  onPrimary: '#ffffff',
  textPrimary: '#000000',
  textMuted: '#a0a0a0',
  textBody: '#3c3c3c',
  textMeta: '#464646',
  divider: '#27759c',
  accent: '#ffbe00',
  error: '#e00000',
  warning0: '#e6e6e6',
  warning1: '#feff00',
  warning2: '#ff9b01',
  warning4: '#ff29ff',
  baseMapSea: '#dbe9f0',
  baseMapLand: '#f2f7f9',
  baseMapStroke: '#5d93ae',
  darkBase: '#00273c',
  darkSurface: '#003959',
  darkCard: '#10658e',
  darkControl: '#00273c',
  darkControlActive: '#003959',
  darkText: '#f2f7f9',
} as const;

/** Control, chip, and card geometry in density-independent pixels. */
export const LAYOUT = {
  control: 40,
  controlMargin: 5,
  radiusControl: 4,
  radiusChip: 2,
  radiusCard: 5,
  radiusSheet: 10,
  radiusRound: 999,
  legendIcon: 26,
} as const;

/** The original app's typeface stack, with platform fallbacks. */
export const FONT_FAMILY = 'Roboto, Droid Sans, sans-serif';

/** Precipitation intensity, hard stops. */
export const PRECIPITATION_RAMP: readonly string[] = [
  '#aaffff',
  '#53d2ff',
  '#33adff',
  '#2294f3',
  '#177edc',
  '#0d6ec7',
  '#903290',
  '#c72bc7',
  '#ff00ff',
];

/** Snow, light to heavy. */
export const SNOW_RAMP: readonly string[] = ['#ffc2ff', '#fd8ee3', '#f969bf', '#ef4cac', '#ea39a1'];

/** Temperature, cold to hot. */
export const TEMPERATURE_RAMP: readonly string[] = [
  '#f5f5f5',
  '#eeeeee',
  '#dddddd',
  '#cccccc',
  '#bbbbbb',
  '#d588f5',
  '#c558ff',
  '#b400ff',
  '#8500cc',
  '#5800c5',
  '#0011c4',
  '#0022cc',
  '#0033cc',
  '#0044cc',
  '#0055cc',
  '#0066cc',
  '#0077cc',
  '#0088cc',
  '#0099cc',
  '#00aacc',
  '#00bb22',
  '#11c500',
  '#33d000',
  '#77d800',
  '#99e000',
  '#ffd500',
  '#ffcc00',
  '#ffaa00',
  '#ff9900',
  '#ff8500',
  '#ff7000',
  '#ff5500',
  '#ff3200',
  '#e50000',
  '#cc0000',
  '#b50000',
  '#a50000',
  '#c00040',
  '#dd0088',
  '#ee00bb',
  '#ff00ee',
  '#ff22ff',
  '#ff44ff',
  '#ff66ff',
  '#ff88ff',
  '#ffaaff',
  '#ffccff',
  '#ffb5ff',
];

/** Gust / wind, calm to storm. */
export const GUST_RAMP: readonly string[] = [
  '#009900',
  '#0ea620',
  '#0eb820',
  '#1dc72f',
  '#ffcd00',
  '#ffb400',
  '#ff9b00',
  '#ff6c00',
  '#ff4000',
  '#e00000',
  '#eb0000',
  '#d70000',
  '#ee00bb',
  '#ff00ee',
  '#ff44ff',
  '#ff77ff',
  '#ff99ff',
  '#ffb5ff',
];

/** Lightning strike colour by age bucket, youngest first. */
export const LIGHTNING_LIVE_COLORS: readonly string[] = [
  '#fffd54',
  '#ffdc00',
  '#ffbb00',
  '#ff8800',
  '#ff0000',
];

/** Historic lightning age ramp, newest to oldest. */
export const LIGHTNING_HISTORIC_COLORS: readonly string[] = [
  '#ffff00',
  '#d29c00',
  '#d27700',
  '#be4500',
  '#aa2200',
  '#820000',
];
