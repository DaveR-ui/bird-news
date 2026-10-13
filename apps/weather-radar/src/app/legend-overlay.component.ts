import { Component, computed, input, output } from '@angular/core';
import { Pressable, ScrollView, Text, View } from '@ng-native/components';
import {
  COLOR,
  LIGHTNING_HISTORIC_COLORS,
  LIGHTNING_LIVE_COLORS,
} from './design-tokens.ts';
import { Icon } from './icons.ts';
import { productByKey, type LegendRow, type ProductKey } from './radar-products.ts';

/** One dot of the lightning age walk, youngest first, growing as it ages. */
interface LegendDot {
  readonly id: string;
  readonly color: string;
  readonly size: number;
}

/** One numbered alert-level box. */
interface WarningBox {
  readonly n: string;
  readonly color: string;
}

/** Ten dots walking the live ramp then the historic one, 5px growing to 20px. */
const LIGHTNING_DOTS: readonly LegendDot[] = [
  ...LIGHTNING_LIVE_COLORS,
  ...LIGHTNING_HISTORIC_COLORS,
]
  .slice(0, 10)
  .map((color, index) => ({
    id: `dot-${index}`,
    color,
    size: 5 + (index * 15) / 9,
  }));

/** The alert levels the original labels 1..4. */
const WARNING_BOXES: readonly WarningBox[] = [
  { n: '1', color: COLOR.warning0 },
  { n: '2', color: COLOR.warning1 },
  { n: '3', color: COLOR.warning2 },
  { n: '4', color: COLOR.error },
];

/**
 * The legend that slides out of the info button. It always sits on the deep-blue chrome, in both
 * colour schemes, as the original's legend does.
 *
 * The bar gradients below are ramp samples baked into the stylesheet: the CSS compiler turns a
 * stylesheet `background-image: linear-gradient(...)` into native's background image, where an
 * inline one would not be read. Each stop is the matching ramp sampled at nine positions.
 */
@Component({
  selector: 'legend-overlay',
  standalone: true,
  imports: [Pressable, ScrollView, Text, View, Icon],
  template: `
    <view class="panel">
      <view class="head">
        <text class="title">{{ title() }}</text>
        <pressable
          class="close"
          accessibilityRole="button"
          accessibilityLabel="Close legend"
          (press)="close.emit()"
        >
          <icon [name]="'close'" [size]="20" />
        </pressable>
      </view>

      <scroll-view class="body">
        <view class="body-inner">
          @for (row of rows(); track row.title) {
            <view class="legend-row">
              @switch (row.kind) {
                @case ('lightning') {
                  <view class="lightning-row">
                    <text class="edge">{{ row.left }}</text>
                    <view class="dots">
                      @for (dot of dots; track dot.id) {
                        <view
                          class="dot"
                          [style]="{
                            width: dot.size,
                            height: dot.size,
                            backgroundColor: dot.color
                          }"
                        ></view>
                      }
                    </view>
                    <text class="edge">{{ row.right }}</text>
                  </view>
                }
                @case ('warning') {
                  <view class="warning-row">
                    @for (box of warningBoxes; track box.n) {
                      <view class="wbox" [style]="{ backgroundColor: box.color }">
                        <text class="wbox-text">{{ box.n }}</text>
                      </view>
                    }
                  </view>
                  <view class="labels">
                    <text class="edge">{{ row.left }}</text>
                    <text class="edge">{{ row.right }}</text>
                  </view>
                }
                @default {
                  <text class="bar-title">{{ row.title }}</text>
                  @switch (row.kind) {
                    @case ('rain') {
                      <view class="bar bar-rain"></view>
                    }
                    @case ('snow') {
                      <view class="bar bar-snow"></view>
                    }
                    @case ('freezingrain') {
                      <view class="bar bar-freezingrain"></view>
                    }
                    @case ('temp') {
                      <view class="bar bar-temp"></view>
                    }
                    @case ('gust') {
                      <view class="bar bar-gust"></view>
                    }
                  }
                  <view class="labels">
                    <text class="edge">{{ row.left }}</text>
                    <text class="edge">{{ row.right }}</text>
                  </view>
                }
              }
            </view>
          }
        </view>
      </scroll-view>
    </view>
  `,
  styles: `
    :host {
      position: absolute;
      top: 55px;
      right: 0;
      width: 232px;
      max-height: 78%;
      flex-direction: column;
    }
    .panel {
      flex: 1;
      padding: 16px;
      overflow: hidden;
      background-color: #003959;
      border-radius: 4px 0 0 4px;
    }
    .head {
      flex-direction: row;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 8px;
    }
    .title {
      flex: 1;
      color: #ffffff;
      font-size: 14px;
      font-weight: 700;
    }
    .close {
      width: 40px;
      height: 40px;
      align-items: center;
      justify-content: center;
      border-radius: 4px;
    }
    .body {
      flex: 1;
    }
    .body-inner {
      gap: 14px;
      padding-bottom: 4px;
    }
    .legend-row {
      gap: 6px;
    }
    .bar-title {
      color: #ffffff;
      font-size: 11px;
    }
    .bar {
      width: 100%;
      height: 10px;
      border-radius: 2px;
    }
    .bar-rain {
      background-image: linear-gradient(
        to right,
        #aaffff 0%,
        #53d2ff 13%,
        #33adff 25%,
        #2294f3 38%,
        #177edc 50%,
        #0d6ec7 63%,
        #903290 75%,
        #c72bc7 88%,
        #ff00ff 100%
      );
    }
    .bar-snow {
      background-image: linear-gradient(
        to right,
        #ffc2ff 0%,
        #fea8f1 13%,
        #fd8ee3 25%,
        #fb7cd1 38%,
        #f969bf 50%,
        #f45bb6 63%,
        #ef4cac 75%,
        #ed43a7 88%,
        #ea39a1 100%
      );
    }
    .bar-freezingrain {
      background-image: linear-gradient(
        to right,
        #ea39a1 0%,
        #ed43a7 13%,
        #ef4cac 25%,
        #f45bb6 38%,
        #f969bf 50%,
        #fb7cd1 63%,
        #fd8ee3 75%,
        #fea8f1 88%,
        #ffc2ff 100%
      );
    }
    .bar-temp {
      background-image: linear-gradient(
        to right,
        #f5f5f5 0%,
        #c75efe 13%,
        #002fcc 25%,
        #0093cc 38%,
        #88dc00 50%,
        #ff7d00 63%,
        #b10000 75%,
        #ff26ff 88%,
        #ffb5ff 100%
      );
    }
    .bar-gust {
      background-image: linear-gradient(
        to right,
        #009900 0%,
        #10ba22 13%,
        #ffc700 25%,
        #ff8900 38%,
        #f02000 50%,
        #df0000 63%,
        #fb00e1 75%,
        #ff71ff 88%,
        #ffb5ff 100%
      );
    }
    .labels {
      flex-direction: row;
      align-items: center;
      justify-content: space-between;
    }
    .edge {
      color: #ffffff;
      font-size: 11px;
    }
    .lightning-row {
      flex-direction: row;
      align-items: center;
      gap: 8px;
    }
    .dots {
      flex: 1;
      flex-direction: row;
      align-items: center;
      justify-content: space-between;
    }
    .dot {
      border-radius: 999px;
    }
    .warning-row {
      flex-direction: row;
      align-items: center;
      gap: 8px;
    }
    .wbox {
      width: 22px;
      height: 22px;
      align-items: center;
      justify-content: center;
      border-radius: 3px;
    }
    .wbox-text {
      color: #000000;
      font-size: 11px;
      font-weight: 700;
    }
    @media (prefers-color-scheme: dark) {
      .title,
      .bar-title,
      .edge {
        color: #f2f7f9;
      }
    }
  `,
})
export class LegendOverlayComponent {
  readonly activeProduct = input.required<ProductKey>();
  readonly close = output<void>();

  protected readonly dots = LIGHTNING_DOTS;
  protected readonly warningBoxes = WARNING_BOXES;

  /** The active product's legend rows. */
  protected readonly rows = computed<readonly LegendRow[]>(
    () => productByKey(this.activeProduct()).legendRows,
  );

  /** The active product's legend title. */
  protected readonly title = computed(
    () => productByKey(this.activeProduct()).legendTitle,
  );
}
