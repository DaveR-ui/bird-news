import { Component, computed, input, output } from '@angular/core';
import { Pressable, ScrollView, Text, View } from '@ng-native/components';
import { COLOR } from './design-tokens.ts';
import { Icon, type IconName } from './icons.ts';
import { RADAR_PRODUCTS, type ProductKey } from './radar-products.ts';

/** Each product's picker glyph. */
const PRODUCT_ICON: Record<ProductKey, IconName> = {
  wr: 'rain',
  rr: 'rain',
  temp: 'temperature',
  gust: 'gust',
  lightning: 'lightning',
  warnings: 'warnings',
  webcam: 'webcam',
};

/**
 * The right-hand layer picker: one row per product, plus the config-sync footer. It never fetches
 * anything itself — the one real GET is fired from the `(fetchConfig)` output the root answers.
 */
@Component({
  selector: 'layer-panel',
  standalone: true,
  imports: [Pressable, ScrollView, Text, View, Icon],
  template: `
    <view class="panel">
      <view class="head">
        <text class="title">Radar layers</text>
        <pressable
          class="close"
          accessibilityRole="button"
          accessibilityLabel="Close layers"
          (press)="close.emit()"
        >
          <icon [name]="'close'" [size]="20" />
        </pressable>
      </view>

      <scroll-view class="list">
        <view class="list-inner">
          @for (product of products; track product.key) {
            <pressable
              class="row"
              [style]="{ opacity: isUnavailable(product.key) ? 0.5 : 1 }"
              accessibilityRole="button"
              accessibilityLabel="{{ product.label }}"
              (press)="selectProduct.emit(product.key)"
            >
              <view class="tile" [style]="{ backgroundColor: tileColor(product.key) }">
                <icon [name]="iconFor(product.key)" [size]="26" />
              </view>
              <text class="label">{{ product.label }}</text>
              <view class="badge">
                <text class="badge-text">{{ product.badge }}</text>
              </view>
            </pressable>
          }
        </view>
      </scroll-view>

      <view class="foot">
        <pressable
          class="fetch"
          accessibilityRole="button"
          accessibilityLabel="Fetch public layer config"
          (press)="fetchConfig.emit()"
        >
          <text class="fetch-label">Fetch public layer config</text>
        </pressable>
        <text class="status">{{ statusText() }}</text>
      </view>
    </view>
  `,
  styles: `
    :host {
      position: absolute;
      top: 55px;
      right: 0;
      width: 212px;
      max-height: 78%;
      flex-direction: column;
    }
    .panel {
      flex: 1;
      background-color: #ffffff;
      border-radius: 5px 0 0 5px;
      box-shadow: -2px 0 6px rgba(0, 0, 0, 0.25);
    }
    .head {
      flex-direction: row;
      align-items: center;
      justify-content: space-between;
      padding: 10px 10px 6px 12px;
    }
    .title {
      color: #000000;
      font-size: 14px;
      font-weight: 700;
    }
    .close {
      width: 40px;
      height: 40px;
      align-items: center;
      justify-content: center;
      border-radius: 4px;
      background-color: #e6eff3;
    }
    .list {
      flex: 1;
    }
    .list-inner {
      padding: 4px 8px;
      gap: 4px;
    }
    .row {
      flex-direction: row;
      align-items: center;
      gap: 10px;
      padding: 6px 8px;
      border-radius: 4px;
    }
    .tile {
      width: 40px;
      height: 40px;
      align-items: center;
      justify-content: center;
      border-radius: 4px;
    }
    .label {
      flex: 1;
      color: #000000;
      font-size: 13px;
    }
    .badge {
      padding: 2px 6px;
      border-radius: 2px;
      background-color: #e6eff3;
    }
    .badge-text {
      color: #003959;
      font-size: 11px;
      font-weight: 700;
    }
    .foot {
      padding: 8px 10px 12px;
      gap: 8px;
      border-top-width: 1px;
      border-top-color: #e6eff3;
    }
    .fetch {
      min-height: 40px;
      align-items: center;
      justify-content: center;
      padding: 0 12px;
      border-radius: 4px;
      background-color: #10658e;
    }
    .fetch-label {
      color: #ffffff;
      font-size: 13px;
      font-weight: 700;
    }
    .status {
      color: #a0a0a0;
      font-size: 11px;
    }
    @media (prefers-color-scheme: dark) {
      .panel {
        background-color: #003959;
      }
      .title,
      .label {
        color: #f2f7f9;
      }
      .close {
        background-color: #00273c;
      }
      .badge {
        background-color: #00273c;
      }
      .badge-text {
        color: #f2f7f9;
      }
      .foot {
        border-top-color: #00273c;
      }
    }
  `,
})
export class LayerPanelComponent {
  /** The product whose row is highlighted. */
  readonly activeProduct = input.required<ProductKey>();
  /** ProductKey -> is available. A MISSING key means "unknown, treat as available". */
  readonly available = input.required<ReadonlyMap<ProductKey, boolean>>();
  /** State of the one real GET. */
  readonly configStatus = input.required<'idle' | 'loading' | 'loaded' | 'error'>();
  readonly selectProduct = output<ProductKey>();
  readonly close = output<void>();
  /** Asks the root to fire the single parameterless live GET. */
  readonly fetchConfig = output<void>();

  /** The picker order. */
  protected readonly products = RADAR_PRODUCTS;

  /** The footer's honest description of the single GET, by status. */
  protected readonly statusText = computed(() => {
    switch (this.configStatus()) {
      case 'loading':
        return 'Fetching public config…';
      case 'loaded':
        return 'Public config loaded — layers updated.';
      case 'error':
        return 'Public config unavailable (offline or blocked). Nothing else is fetched.';
      default:
        return 'Layer availability comes from the public radar config.';
    }
  });

  /** A missing key means "unknown", which reads as available. */
  protected isUnavailable(key: ProductKey): boolean {
    return this.available().get(key) === false;
  }

  protected iconFor(key: ProductKey): IconName {
    return PRODUCT_ICON[key];
  }

  /** Active beats the plain blue; unavailable grey beats both. */
  protected tileColor(key: ProductKey): string {
    if (this.isUnavailable(key)) {
      return COLOR.textMuted;
    }
    return key === this.activeProduct() ? COLOR.primaryPressed : COLOR.primary;
  }
}
