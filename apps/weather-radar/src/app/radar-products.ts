import type { RadarConfigData } from './radar-config.service.ts';

/** The seven products the layer picker and timeline can show. */
export type ProductKey = 'wr' | 'rr' | 'temp' | 'gust' | 'lightning' | 'warnings' | 'webcam';

/** One row of a product's legend: a low label, a category title, a high label. */
export interface LegendRow {
  readonly kind: 'lightning' | 'rain' | 'snow' | 'freezingrain' | 'temp' | 'gust' | 'warning';
  readonly left: string;
  readonly title: string;
  readonly right: string;
}

/** A period chip in the timeline, offset in minutes relative to "now" (negative = past). */
export interface PeriodOption {
  readonly id: string;
  readonly label: string;
  /** Frame index this chip selects; 0 = the current frame. */
  readonly frameIndex: number;
}

/** Everything a component needs to render one radar product and its timeline. */
export interface RadarProduct {
  readonly key: ProductKey;
  /** Product name as the original shows it. */
  readonly label: string;
  /** 2-3 character chip for the layer picker. */
  readonly badge: string;
  /**
   * Which field of the live config gates this product, or null when unconditional.
   * The live config is read by the real GET; a null flag means always available.
   */
  readonly configFlag: keyof RadarConfigData | null;
  readonly legendTitle: string;
  readonly legendRows: readonly LegendRow[];
  readonly periods: readonly PeriodOption[];
  /** Number of animation frames in the product's timeline. */
  readonly frames: number;
}

/** The product shown when the screen first opens. */
export const DEFAULT_PRODUCT: ProductKey = 'wr';

/** The full product catalogue, in picker order. */
export const RADAR_PRODUCTS: readonly RadarProduct[] = [
  {
    key: 'wr',
    label: 'WetterRadar',
    badge: 'WR',
    configFlag: null,
    legendTitle: 'WeatherRadar',
    legendRows: [
      { kind: 'lightning', left: 'isolated', title: 'Lightning', right: 'frequent' },
      { kind: 'rain', left: 'light', title: 'Precipitation', right: 'heavy' },
      { kind: 'snow', left: 'light', title: 'Snow', right: 'heavy' },
      { kind: 'freezingrain', left: 'light', title: 'Ice', right: 'heavy' },
    ],
    periods: [
      { id: 'now', label: 'now', frameIndex: 0 },
      { id: '-24h', label: '- 24 h', frameIndex: 1 },
      { id: 'today', label: 'today', frameIndex: 2 },
      { id: 'tomorrow', label: 'tomorrow', frameIndex: 3 },
      { id: '+3d', label: '+3 d', frameIndex: 4 },
      { id: '+4d', label: '+4 d', frameIndex: 5 },
    ],
    frames: 6,
  },
  {
    key: 'rr',
    label: 'RegenRadar',
    badge: 'RR',
    configFlag: 'ppt_enabled',
    legendTitle: 'RainRadar',
    legendRows: [{ kind: 'rain', left: 'light', title: 'Precipitation', right: 'heavy' }],
    periods: [
      { id: 'now', label: 'now', frameIndex: 0 },
      { id: '-90m', label: '- 90 min', frameIndex: 1 },
      { id: '-24h', label: '- 24 h', frameIndex: 2 },
    ],
    frames: 3,
  },
  {
    key: 'temp',
    label: 'Temperature',
    badge: 'T°',
    configFlag: 'layer_temperature_enabled',
    legendTitle: 'Temperature',
    legendRows: [{ kind: 'temp', left: 'cold', title: 'Temperatur', right: 'hot' }],
    periods: [
      { id: 'now', label: 'now', frameIndex: 0 },
      { id: '-24h', label: '- 24 h', frameIndex: 1 },
      { id: '+24h', label: '+ 24 h', frameIndex: 2 },
      { id: 'tomorrow', label: 'tomorrow', frameIndex: 3 },
      { id: '+3d', label: '+3 d', frameIndex: 4 },
    ],
    frames: 5,
  },
  {
    key: 'gust',
    label: 'Gust',
    badge: 'G°',
    configFlag: 'layer_gust_enabled',
    legendTitle: 'Gusts',
    legendRows: [{ kind: 'gust', left: 'calm', title: 'Gusts', right: 'storm' }],
    periods: [
      { id: 'now', label: 'now', frameIndex: 0 },
      { id: '-24h', label: '- 24 h', frameIndex: 1 },
      { id: '+24h', label: '+ 24 h', frameIndex: 2 },
      { id: 'tomorrow', label: 'tomorrow', frameIndex: 3 },
      { id: '+3d', label: '+3 d', frameIndex: 4 },
    ],
    frames: 5,
  },
  {
    key: 'lightning',
    label: 'Lightning',
    badge: '⚡',
    configFlag: 'layer_lightning_enabled',
    legendTitle: 'Lightning',
    legendRows: [{ kind: 'lightning', left: '15 min ago', title: 'Lightning', right: 'Live' }],
    periods: [
      { id: 'now', label: 'now', frameIndex: 0 },
      { id: '-30m', label: '- 30 min', frameIndex: 1 },
      { id: '-90m', label: '- 90 min', frameIndex: 2 },
      { id: '-6h', label: '- 6 hrs', frameIndex: 3 },
      { id: '-12h', label: '- 12 hrs', frameIndex: 4 },
      { id: '-24h', label: '- 24 h', frameIndex: 5 },
      { id: '-48h', label: '- 48 hrs', frameIndex: 6 },
    ],
    frames: 7,
  },
  {
    key: 'warnings',
    label: 'Warning',
    badge: '!',
    configFlag: null,
    legendTitle: 'Weather alert levels',
    legendRows: [
      { kind: 'warning', left: 'watch', title: 'Weather alert levels', right: 'extreme' },
    ],
    periods: [{ id: 'now', label: 'now', frameIndex: 0 }],
    frames: 1,
  },
  {
    key: 'webcam',
    label: 'Webcam',
    badge: '▣',
    configFlag: 'layer_webcams_enabled',
    legendTitle: 'Nearby webcams',
    legendRows: [{ kind: 'freezingrain', left: 'now', title: 'Nearby webcams', right: 'later' }],
    periods: [{ id: 'now', label: 'now', frameIndex: 0 }],
    frames: 1,
  },
];

/**
 * Look a product up by key. Throws on an unknown key: the caller can only pass a `ProductKey`,
 * so an unknown value is a programming error rather than bad user input.
 */
export function productByKey(key: ProductKey): RadarProduct {
  const product = RADAR_PRODUCTS.find((candidate) => candidate.key === key);
  if (!product) {
    throw new Error(`Unknown radar product key: ${key}`);
  }
  return product;
}
