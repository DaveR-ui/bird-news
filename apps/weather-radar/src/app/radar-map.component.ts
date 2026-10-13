import { Component, DestroyRef, computed, effect, inject, input, signal } from '@angular/core';
import { Text, View } from '@ng-native/components';
import { COLOR, GUST_RAMP, TEMPERATURE_RAMP } from './design-tokens.ts';
import {
  type FieldCell,
  TIME_UNIT_MS,
  contoneField,
  lightningStrikes,
  precipitationField,
} from './radar-field.ts';
import { type ProductKey } from './radar-products.ts';

/** One painted grid cell, already resolved to percentage geometry for the template. */
interface PaintCell {
  readonly id: string;
  /** Left offset as a percentage of the map width. */
  readonly left: number;
  /** Top offset as a percentage of the map height. */
  readonly top: number;
  /** Width as a percentage of the map width. */
  readonly w: number;
  /** Height as a percentage of the map height. */
  readonly h: number;
  readonly color: string;
  readonly opacity: number;
}

/** One lightning marker, resolved to percentage geometry. */
interface StrikeMark {
  readonly id: string;
  readonly left: number;
  readonly top: number;
  readonly size: number;
  readonly color: string;
}

/** One webcam pin, resolved to percentage geometry. */
interface WebcamPin {
  readonly id: string;
  readonly left: number;
  readonly top: number;
}

/** Warning alert levels, lowest first; the third band uses the error red. */
const WARNING_LEVELS: readonly string[] = [
  COLOR.warning0,
  COLOR.warning1,
  COLOR.warning2,
  COLOR.error,
  COLOR.warning4,
];

/** The coarse alert grid, in cells. */
const WARNING_COLS = 6;
const WARNING_ROWS = 8;

/** Fixed, deterministic webcam pin positions (fractions of the map). */
const WEBCAM_POSITIONS: readonly { readonly x: number; readonly y: number }[] = [
  { x: 0.22, y: 0.28 },
  { x: 0.62, y: 0.19 },
  { x: 0.78, y: 0.55 },
  { x: 0.38, y: 0.66 },
  { x: 0.55, y: 0.82 },
];

/** Resolve a field onto its grid, centring each cell on its sample point. */
function gridCells(
  field: readonly FieldCell[],
  cols: number,
  rows: number,
  opacityScale = 1,
): PaintCell[] {
  const w = 100 / cols;
  const h = 100 / rows;
  return field.map((cell) => ({
    id: cell.id,
    left: cell.x * 100 - w / 2,
    top: cell.y * 100 - h / 2,
    w,
    h,
    color: cell.color,
    opacity: cell.opacity * opacityScale,
  }));
}

/**
 * The full-bleed radar map: a static base map with the active product's synthetic field painted
 * over it. Pure and deterministic per `(activeProduct, frameIndex)`, and it renders with no
 * scrolling content and no network call.
 */
@Component({
  selector: 'radar-map',
  standalone: true,
  imports: [View, Text],
  template: `
    <view class="map">
      <!-- 1. sea wash -->
      <view class="sea"></view>

      <!-- 2. land masses, softened with opposite-corner radii -->
      <view class="land land-a"></view>
      <view class="land land-b"></view>
      <view class="land land-c"></view>

      <!-- 3. coastline / elevation hairlines -->
      <view class="coast coast-a"></view>
      <view class="coast coast-b"></view>
      <view class="coast coast-c"></view>
      <view class="coast coast-d"></view>

      <!-- 4. data field -->
      @for (cell of cells(); track cell.id) {
        <view
          class="cell"
          [style]="{
            left: cell.left + '%',
            top: cell.top + '%',
            width: cell.w + '%',
            height: cell.h + '%',
            backgroundColor: cell.color,
            opacity: cell.opacity
          }"
        ></view>
      }

      <!-- coarse warning bands -->
      @for (cell of warningCells(); track cell.id) {
        <view
          class="cell cell-warning"
          [style]="{
            left: cell.left + '%',
            top: cell.top + '%',
            width: cell.w + '%',
            height: cell.h + '%',
            backgroundColor: cell.color,
            opacity: cell.opacity
          }"
        ></view>
      }

      <!-- webcam pins -->
      @for (pin of pins(); track pin.id) {
        <view class="pin" [style]="{ left: pin.left + '%', top: pin.top + '%' }">
          <view class="pin-dot"></view>
          <view class="pin-stem"></view>
        </view>
      }

      <!-- lightning markers -->
      @for (strike of strikes(); track strike.id) {
        <view
          class="strike"
          [style]="{
            left: strike.left + '%',
            top: strike.top + '%',
            width: strike.size,
            height: strike.size,
            marginLeft: -strike.size / 2,
            marginTop: -strike.size / 2,
            backgroundColor: strike.color
          }"
        ></view>
      }

      <!-- 5. layer-switch cross-fade -->
      <view class="flash" [style]="{ opacity: flash() }"></view>

      <!-- 6. dark-blue darkening -->
      <view class="darken"></view>

      <!-- 7. map glyphs -->
      <view class="crosshair">
        <view class="cross-h"></view>
        <view class="cross-v"></view>
        <view class="cross-ring"></view>
      </view>
      <text class="city city-a">Berlin</text>
      <text class="city city-b">Hamburg</text>
      <text class="city city-c">Leipzig</text>
    </view>
  `,
  styles: `
    :host {
      flex: 1;
    }
    .map {
      position: relative;
      flex: 1;
      overflow: hidden;
      background-color: #dbe9f0;
    }
    .sea {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background-color: #dbe9f0;
    }
    .land {
      position: absolute;
      background-image: linear-gradient(135deg, #f2f7f9 0%, #ffffff 100%);
    }
    .land-a {
      top: 4%;
      left: -8%;
      width: 68%;
      height: 62%;
      border-radius: 40% 60% 55% 45%;
    }
    .land-b {
      top: 34%;
      right: -10%;
      width: 74%;
      height: 66%;
      border-radius: 60% 40% 45% 55%;
      background-image: linear-gradient(200deg, #f2f7f9 0%, #ffffff 100%);
    }
    .land-c {
      bottom: -14%;
      left: 8%;
      width: 52%;
      height: 46%;
      border-radius: 55% 45% 60% 40%;
      background-image: linear-gradient(90deg, #ffffff 0%, #f2f7f9 100%);
    }
    .coast {
      position: absolute;
      background-color: #5d93ae;
      opacity: 0.35;
    }
    .coast-a {
      top: 30%;
      left: 0;
      width: 46%;
      height: 2px;
      transform: rotate(6deg);
    }
    .coast-b {
      top: 58%;
      left: 60%;
      width: 40%;
      height: 2px;
      transform: rotate(-8deg);
    }
    .coast-c {
      top: 18%;
      left: 40%;
      width: 2px;
      height: 38%;
      transform: rotate(12deg);
    }
    .coast-d {
      bottom: 16%;
      left: 22%;
      width: 44%;
      height: 1px;
      transform: rotate(3deg);
    }
    .cell {
      position: absolute;
      border-radius: 40%;
    }
    .cell-warning {
      border-radius: 3px;
    }
    .pin {
      position: absolute;
      align-items: center;
    }
    .pin-dot {
      width: 10px;
      height: 10px;
      border-radius: 999px;
      background-color: #10658e;
      border: 2px solid #ffffff;
    }
    .pin-stem {
      width: 2px;
      height: 10px;
      background-color: #10658e;
    }
    .strike {
      position: absolute;
      border-radius: 999px;
    }
    .flash {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background-color: #ffffff;
    }
    .darken {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background-color: #00273c;
      opacity: 0;
    }
    .crosshair {
      position: absolute;
      top: 34%;
      left: 50%;
      width: 22px;
      height: 22px;
      margin-left: -11px;
      margin-top: -11px;
      align-items: center;
      justify-content: center;
    }
    .cross-h {
      position: absolute;
      top: 10px;
      left: 0;
      width: 22px;
      height: 2px;
      background-color: #ffbe00;
    }
    .cross-v {
      position: absolute;
      left: 10px;
      top: 0;
      width: 2px;
      height: 22px;
      background-color: #ffbe00;
    }
    .cross-ring {
      width: 8px;
      height: 8px;
      border-radius: 999px;
      background-color: #ffbe00;
    }
    .city {
      position: absolute;
      font-size: 11px;
      color: #464646;
    }
    .city-a {
      top: 22%;
      left: 12%;
    }
    .city-b {
      top: 40%;
      left: 58%;
    }
    .city-c {
      top: 64%;
      left: 30%;
    }
    @media (prefers-color-scheme: dark) {
      .darken {
        opacity: 0.55;
      }
    }
  `,
})
export class RadarMapComponent {
  readonly activeProduct = input.required<ProductKey>();
  readonly frameIndex = input.required<number>();

  /** The full-bleed white veil a layer switch fades out of. */
  protected readonly flash = signal(0);

  private flashTimer: ReturnType<typeof setTimeout> | null = null;
  private destroyed = false;
  /** The cross-fade belongs to a product switch, not to the first mount. */
  private firstRun = true;

  /** The precipitation/contone field for the active product and frame. */
  protected readonly cells = computed<PaintCell[]>(() => {
    const key = this.activeProduct();
    // One timeline frame is one five-minute step on the field's time axis; multiplying by
    // TIME_UNIT_MS (not by a raw frame count) is what makes each frame a distinct picture.
    const t = this.frameIndex() * TIME_UNIT_MS;
    switch (key) {
      case 'wr':
      case 'rr':
        return gridCells(precipitationField(t, 14, 20), 14, 20);
      case 'temp':
        return gridCells(contoneField(t, TEMPERATURE_RAMP, 10, 14), 10, 14);
      case 'gust':
        return gridCells(contoneField(t, GUST_RAMP, 10, 14), 10, 14);
      case 'lightning':
        // A dim precipitation underlay beneath the strike markers.
        return gridCells(precipitationField(t, 14, 20), 14, 20, 0.4);
      default:
        return [];
    }
  });

  /** The coarse warning bands. */
  protected readonly warningCells = computed<PaintCell[]>(() => {
    if (this.activeProduct() !== 'warnings') {
      return [];
    }
    const frame = this.frameIndex();
    const w = 100 / WARNING_COLS;
    const h = 100 / WARNING_ROWS;
    const cells: PaintCell[] = [];
    for (let col = 0; col < WARNING_COLS; col++) {
      for (let row = 0; row < WARNING_ROWS; row++) {
        const band = (((col * 3 + row * 5 + frame) % WARNING_LEVELS.length) + WARNING_LEVELS.length) %
          WARNING_LEVELS.length;
        cells.push({
          id: `w-${col}-${row}`,
          left: col * w,
          top: row * h,
          w,
          h,
          color: WARNING_LEVELS[band] ?? COLOR.warning0,
          opacity: band === 0 ? 0.35 : 0.75,
        });
      }
    }
    return cells;
  });

  /** Webcam pins for the webcam product. */
  protected readonly pins = computed<WebcamPin[]>(() => {
    if (this.activeProduct() !== 'webcam') {
      return [];
    }
    return WEBCAM_POSITIONS.map((position, index) => ({
      id: `cam-${index}`,
      left: position.x * 100,
      top: position.y * 100,
    }));
  });

  /** Lightning markers for the lightning product. */
  protected readonly strikes = computed<StrikeMark[]>(() => {
    if (this.activeProduct() !== 'lightning') {
      return [];
    }
    return lightningStrikes(this.frameIndex() * TIME_UNIT_MS, 24).map((strike) => ({
      id: strike.id,
      left: strike.x * 100,
      top: strike.y * 100,
      size: strike.size,
      color: strike.color,
    }));
  });

  constructor() {
    // The cross-fade: a white flash whenever the active product changes. The timer is guarded so
    // a fast unmount (as a hermetic test does) cannot set a signal after the component is gone.
    effect(() => {
      this.activeProduct();
      if (this.destroyed) {
        return;
      }
      if (this.firstRun) {
        // Effect runs once on injection; a mount is not a layer switch, so skip the veil.
        this.firstRun = false;
        return;
      }
      this.flash.set(1);
      if (this.flashTimer !== null) {
        clearTimeout(this.flashTimer);
      }
      this.flashTimer = setTimeout(() => {
        this.flashTimer = null;
        if (!this.destroyed) {
          this.flash.set(0);
        }
      }, 0);
    });

    inject(DestroyRef).onDestroy(() => {
      this.destroyed = true;
      if (this.flashTimer !== null) {
        clearTimeout(this.flashTimer);
        this.flashTimer = null;
      }
    });
  }
}
