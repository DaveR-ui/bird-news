import { Component, computed, DestroyRef, inject, signal } from '@angular/core';
import { Pressable, SafeAreaProvider, SafeAreaView, Text, View } from '@ng-native/components';
import { HardwareBack, StatusBar } from '@ng-native/device';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Icon } from './icons.ts';
import { LayerPanelComponent } from './layer-panel.component.ts';
import { LegendOverlayComponent } from './legend-overlay.component.ts';
import { RadarMapComponent } from './radar-map.component.ts';
import { DEFAULT_PRODUCT, productByKey, RADAR_PRODUCTS, type ProductKey } from './radar-products.ts';
import { RadarConfigService, type RadarConfigData } from './radar-config.service.ts';
import { TimeControlComponent } from './time-control.component.ts';
import { WebcamSheetComponent } from './webcam-sheet.component.ts';

/** Where the one live GET is in its lifecycle. */
type LoadStatus = 'idle' | 'loading' | 'loaded' | 'error';

/** Which floating panel, if any, is open. At most one at a time. */
type PanelKey = 'layer' | 'legend' | 'webcam' | null;

/**
 * The single main screen, a visual clone of the original "Weather & Radar" Android app: one
 * full-bleed radar map with a floating, corner-anchored control overlay. No header, no cards, no
 * page title.
 *
 * Read-only contract (the standing rule for this whole app):
 * - The only network call is the single parameterless, unauthenticated GET in
 *   `RadarConfigService.loadConfig()`, and it fires only when the user presses "Fetch public layer
 *   config" in the layer panel. It is never fired on init.
 * - Nothing else is fetched, and no device capability that would leave the device is used: the
 *   locate control performs no location lookup, the share control performs no native share and no
 *   screenshot. Both are present for visual fidelity only.
 *
 * Labelling rule (a human decision, minimised on purpose): exactly TWO user-facing strings carry
 * the whole "this is not real" surface — the safety line rendered last in this template
 * ("Simulated data · read-only demo") and the timeline's own notice rendered by
 * `time-control` ("Not real weather — simulated forecast"). No other MOCK/FICTIONAL/DEMO wording
 * exists anywhere in the app.
 *
 * Element names are lowercase, and that is load-bearing rather than style: an uppercase name is
 * read as an unknown Angular component and commits as a plain view with nothing in it.
 */
@Component({
  selector: 'app-root',
  imports: [
    Pressable,
    SafeAreaProvider,
    SafeAreaView,
    Text,
    View,
    Icon,
    RadarMapComponent,
    LayerPanelComponent,
    LegendOverlayComponent,
    TimeControlComponent,
    WebcamSheetComponent,
  ],
  template: `
    <safe-area-provider>
      <safe-area-view class="screen">
        <!--
          The map's box comes from mapStyle rather than from a :host rule in its own stylesheet:
          a child component's host takes its size from the [style] the parent hands it.
        -->
        <radar-map
          [activeProduct]="activeProduct()"
          [frameIndex]="frameIndex()"
          [style]="mapStyle"
        />

        <!-- Floating control overlay: corner-anchored clusters over the map. -->
        <view class="controls-wrapper">
          <!-- top-left: back (fidelity only) + locate (no lookup — the read-only contract). -->
          <view class="cluster top-left">
            <pressable class="ctrl" accessibilityRole="button" accessibilityLabel="Back">
              <icon [name]="'back'" [size]="20" />
            </pressable>
            <!--
              Locate opens no panel and performs NO location lookup: the read-only contract forbids
              leaving the device, so the control is here for fidelity and does nothing else.
            -->
            <pressable
              class="ctrl"
              accessibilityRole="button"
              accessibilityLabel="Show my location"
            >
              <icon [name]="'locate'" [size]="20" />
            </pressable>
          </view>

          <!-- top-centre: fullscreen glyph + share + logo wordmark. -->
          <view class="cluster top-centre">
            <!--
              IconName has no fullscreen glyph, so the control draws its own: four corner brackets
              from four small views.
            -->
            <pressable class="ctrl" accessibilityRole="button" accessibilityLabel="Fullscreen">
              <view class="fs-glyph">
                <view class="fs-corner fs-tl"></view>
                <view class="fs-corner fs-tr"></view>
                <view class="fs-corner fs-bl"></view>
                <view class="fs-corner fs-br"></view>
              </view>
            </pressable>
            <!--
              Share performs NO native share and NO screenshot: it only toggles a small toast. The
              read-only demo has nothing to share.
            -->
            <pressable
              class="ctrl"
              accessibilityRole="button"
              accessibilityLabel="Share"
              (press)="toggleShareNotice()"
            >
              <icon [name]="'share'" [size]="20" />
            </pressable>
            <!-- Neutral wordmark, not the vendor's trademark: provenance honesty. -->
            <view class="logo">
              <icon [name]="'logo'" [size]="20" />
              <text class="logo-text">Weather Radar</text>
            </view>
          </view>

          <!-- right rail: legend, layers, webcams. -->
          <view class="cluster share-container">
            <pressable
              class="ctrl"
              accessibilityRole="button"
              accessibilityLabel="Legend"
              [class.ctrl-active]="activePanel() === 'legend'"
              (press)="openPanel('legend')"
            >
              <icon [name]="'info'" [size]="20" />
            </pressable>
            <pressable
              class="ctrl"
              accessibilityRole="button"
              accessibilityLabel="Radar layers"
              [class.ctrl-active]="activePanel() === 'layer'"
              (press)="openPanel('layer')"
            >
              <icon [name]="activePanel() === 'layer' ? 'layers-open' : 'layers'" [size]="20" />
            </pressable>
            <pressable
              class="ctrl"
              accessibilityRole="button"
              accessibilityLabel="Webcams"
              [class.ctrl-active]="activePanel() === 'webcam'"
              (press)="openPanel('webcam')"
            >
              <icon [name]="'webcam'" [size]="20" />
            </pressable>
          </view>

          <!-- bottom-left: a static distance scale bar. Nothing computes zoom: there is no map engine. -->
          <view class="cluster bottom-left">
            <view class="distance-bar">
              <text class="distance-text">50 km</text>
            </view>
          </view>

          <!-- bottom-centre: the timeline, capped at 400px and centred. -->
          <view class="cluster bottom">
            <view class="bottom-inner">
              <!-- The host is sized by [style], for the same reason as the map: a :host rule
                   alone leaves the box zero-sized. -->
              <time-control
                [style]="{ width: '100%', maxWidth: 400 }"
                [activeProduct]="activeProduct()"
                [playing]="playing()"
                [frameIndex]="frameIndex()"
                (selectFrame)="selectFrame($event)"
                (togglePlay)="togglePlay()"
              />
            </view>
          </view>

          <!-- The share toast: top-centre, dismissed on the second press. -->
          @if (shareNotice()) {
            <view class="share-toast-wrap">
              <text class="share-toast">Share is not available in this read-only demo</text>
            </view>
          }
        </view>

        @if (activePanel() === 'layer') {
          <layer-panel
            [style]="mapStyle"
            [activeProduct]="activeProduct()"
            [available]="available()"
            [configStatus]="status()"
            (selectProduct)="selectProduct($event)"
            (close)="closePanel()"
            (fetchConfig)="load()"
          />
        }
        @if (activePanel() === 'legend') {
          <legend-overlay
            [style]="mapStyle"
            [activeProduct]="activeProduct()"
            (close)="closePanel()"
          />
        }
        <!-- Always in the DOM; its own open input controls visibility. -->
        <webcam-sheet
          [style]="mapStyle"
          [open]="activePanel() === 'webcam'"
          (close)="closePanel()"
        />

        <!-- The ONLY safety notice. Deliberately last, so it paints above every overlay. -->
        <text class="safety-line">Simulated data · read-only demo</text>
      </safe-area-view>
    </safe-area-provider>
  `,
  styles: `
    :host {
      flex: 1;
    }
    .screen {
      flex: 1;
      position: relative;
      background-color: #f2f7f9;
      font-family: Roboto, Droid Sans, sans-serif;
    }
    /* The overlay floats above the map and lets touches through to it, bar its own clusters.
       The right and bottom edges are omitted on purpose: Yoga sizes an absolutely positioned box
       from left/top plus an explicit width, and an inset-only edge set leaves it zero-sized. */
    .controls-wrapper {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      z-index: 2;
      pointer-events: none;
    }
    .cluster {
      position: absolute;
      flex-direction: row;
      gap: 5px;
      /* A cluster takes touches again inside the pass-through wrapper. */
      pointer-events: auto;
    }
    .top-left {
      top: 5px;
      left: 5px;
      flex-direction: column;
    }
    .top-centre {
      top: 5px;
      left: 0;
      width: 100%;
      align-items: center;
      justify-content: center;
    }
    .share-container {
      top: 5px;
      right: 5px;
      flex-direction: column;
      /* Native resolves a right edge against an explicit width; without one the rail collapses. */
      width: 40px;
      align-items: flex-end;
    }
    .bottom-left {
      bottom: 5px;
      left: 5px;
    }
    .bottom {
      bottom: 5px;
      left: 0;
      width: 100%;
      align-items: center;
      justify-content: center;
    }
    .bottom-inner {
      width: 100%;
      max-width: 400px;
      align-items: center;
    }
    /* A control button: 40x40, radius 4, the vendor blue at 84%. */
    .ctrl {
      width: 40px;
      height: 40px;
      align-items: center;
      justify-content: center;
      border-radius: 4px;
      background-color: rgba(16, 101, 142, 0.84);
      box-shadow: 0 1px 4px rgba(0, 0, 0, 0.3);
    }
    .ctrl:active {
      background-color: rgba(0, 57, 89, 0.84);
    }
    /* An open toggle stays darker than any control. */
    .ctrl-active {
      background-color: #00537f;
    }

    /* The inline fullscreen glyph: four corner brackets. */
    .fs-glyph {
      width: 20px;
      height: 20px;
    }
    .fs-corner {
      position: absolute;
      width: 7px;
      height: 7px;
      border-color: #ffffff;
    }
    .fs-tl {
      top: 1px;
      left: 1px;
      border-top-width: 2px;
      border-left-width: 2px;
    }
    .fs-tr {
      top: 1px;
      right: 1px;
      border-top-width: 2px;
      border-right-width: 2px;
    }
    .fs-bl {
      bottom: 1px;
      left: 1px;
      border-bottom-width: 2px;
      border-left-width: 2px;
    }
    .fs-br {
      bottom: 1px;
      right: 1px;
      border-bottom-width: 2px;
      border-right-width: 2px;
    }

    .logo {
      flex-direction: row;
      align-items: center;
      gap: 5px;
    }
    .logo-text {
      color: #ffffff;
      font-size: 13px;
      font-weight: 700;
      text-shadow: 0 1px 2px rgba(0, 0, 0, 0.5);
    }

    /* A static scale bar; only its right corners are rounded, as in the original. */
    .distance-bar {
      width: 72px;
      height: 22px;
      align-items: center;
      justify-content: center;
      border-radius: 0 4px 4px 0;
      background-color: rgba(255, 255, 255, 0.75);
      border: 1px solid rgba(16, 101, 142, 0.6);
    }
    .distance-text {
      color: #3c3c3c;
      font-size: 11px;
    }

    .share-toast-wrap {
      position: absolute;
      top: 52px;
      left: 0;
      width: 100%;
      align-items: center;
      pointer-events: none;
      z-index: 3;
    }
    .share-toast {
      padding: 6px 10px;
      border-radius: 4px;
      background-color: rgba(0, 39, 60, 0.92);
      color: #ffffff;
      font-size: 11px;
    }

    /* The safety line: the one labelling string this screen owns.
       Sized from the left edge rather than the right, for the same Yoga reason as the wrapper. */
    .safety-line {
      position: absolute;
      left: 5px;
      bottom: 5px;
      font-size: 11px;
      color: #a0a0a0;
      pointer-events: none;
      z-index: 20;
    }

    /* Dark mode is dark-blue, not black. */
    @media (prefers-color-scheme: dark) {
      .screen {
        background-color: #00273c;
      }
      .ctrl {
        background-color: #00273c;
      }
      .ctrl:active {
        background-color: #003959;
      }
      .ctrl-active {
        background-color: #003959;
      }
      .logo-text {
        color: #f2f7f9;
      }
      .distance-bar {
        background-color: rgba(0, 39, 60, 0.75);
        border-color: rgba(39, 117, 156, 0.6);
      }
      .distance-text {
        color: #f2f7f9;
      }
      .share-toast {
        background-color: rgba(0, 57, 89, 0.95);
        color: #f2f7f9;
      }
      .safety-line {
        color: #a0a0a0;
      }
    }
  `,
})
export class App {
  private readonly radar = inject(RadarConfigService);

  private readonly destroyRef = inject(DestroyRef);

  /** The product the map, legend and timeline all speak for. */
  protected readonly activeProduct = signal<ProductKey>(DEFAULT_PRODUCT);

  /** Which floating panel is open, if any. */
  protected readonly activePanel = signal<PanelKey>(null);

  /**
   * The box a child component's host is given. A component's own `:host` rule does not reach its
   * host element, and neither `flex: 1` nor percentage dimensions size it — the engine resolves the
   * box only from the plain numbers handed in through [style]. 1080x2400 is the emulator's portrait
   * extent, which is what this screen is exercised against.
   */
  protected readonly mapStyle = {
    width: 1080,
    height: 2400,
  };

  /** Whether the timeline is animating. */
  protected readonly playing = signal<boolean>(false);

  /** The timeline's current frame. */
  protected readonly frameIndex = signal<number>(0);

  /** The one live GET's lifecycle state. */
  protected readonly status = signal<LoadStatus>('idle');

  /** The share toast's visibility; it is dismissed by a second press. */
  protected readonly shareNotice = signal<boolean>(false);

  /** The loaded config, or null. Read only by `available`. */
  private readonly config = signal<RadarConfigData | null>(null);

  /** The selected product's full definition (label, legend, periods, frame count). */
  protected readonly product = computed(() => productByKey(this.activeProduct()));

  /**
   * Product availability by key.
   *
   * A product with no config flag is unconditional. A flagged product is unknown until the config
   * has loaded, and unknown means available: the app must never look broken offline. Once loaded it
   * follows the flag exactly.
   */
  protected readonly available = computed<ReadonlyMap<ProductKey, boolean>>(() => {
    const status = this.status();
    const config = this.config();
    const map = new Map<ProductKey, boolean>();
    for (const entry of RADAR_PRODUCTS) {
      map.set(entry.key, flagIsAvailable(entry.configFlag, status, config));
    }
    return map;
  });

  /** The animation interval's handle while playing, null when stopped. */
  private timer: ReturnType<typeof setInterval> | null = null;

  /** Drops the hardware-back subscription, when there is a native side to subscribe to. */
  private unsubscribeBack: (() => void) | null = null;

  constructor() {
    // Dark status bar icons in light mode and light ones in dark mode.
    inject(StatusBar).set({ style: 'auto' });

    // Android's back button: close an open panel, otherwise let the platform do its default.
    // Off a device there is no native side; the subscription must not throw there.
    try {
      this.unsubscribeBack = inject(HardwareBack).handle(() => {
        if (this.activePanel() !== null) {
          this.activePanel.set(null);
          return true;
        }
        return false;
      });
    } catch {
      this.unsubscribeBack = null;
    }

    this.destroyRef.onDestroy(() => {
      // Guarantees the interval can never fire after destroy.
      if (this.timer !== null) {
        clearInterval(this.timer);
        this.timer = null;
      }
      this.unsubscribeBack?.();
    });
  }

  /** Open a panel, or close it when it is already open. */
  protected openPanel(panel: 'layer' | 'legend' | 'webcam'): void {
    this.activePanel.update((current) => (current === panel ? null : panel));
  }

  protected closePanel(): void {
    this.activePanel.set(null);
  }

  /** Select a product: stop playback, rewind, and close the panel that offered it. */
  protected selectProduct(key: ProductKey): void {
    this.activeProduct.set(key);
    this.stopPlayback();
    this.frameIndex.set(0);
    this.activePanel.set(null);
  }

  /** Seek to a frame, clamped to the selected product's frame count. */
  protected selectFrame(index: number): void {
    const frames = this.product().frames;
    const clamped = Math.max(0, Math.min(index, frames - 1));
    this.frameIndex.set(clamped);
  }

  /** Start animating the frames, or stop. Never autostarts. */
  protected togglePlay(): void {
    if (this.timer !== null) {
      this.stopPlayback();
      return;
    }
    this.playing.set(true);
    this.timer = setInterval(() => {
      const frames = this.product().frames;
      this.frameIndex.update((index) => (frames > 0 ? (index + 1) % frames : 0));
    }, 900);
  }

  /** Show or dismiss the share toast. Share does nothing native in the read-only demo. */
  protected toggleShareNotice(): void {
    this.shareNotice.update((shown) => !shown);
  }

  /**
   * The one real GET. Fired only from the layer panel's (fetchConfig); never on init.
   */
  protected load(): void {
    this.status.set('loading');
    this.config.set(null);
    // The one real GET. `takeUntilDestroyed` cancels it when the screen goes away, so a late
    // response can never write a signal after teardown — parity with the play interval.
    this.radar
      .loadConfig()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (data) => {
          this.config.set(data);
          this.status.set('loaded');
        },
        error: () => {
          this.config.set(null);
          this.status.set('error');
        },
      });
  }

  private stopPlayback(): void {
    if (this.timer !== null) {
      clearInterval(this.timer);
      this.timer = null;
    }
    this.playing.set(false);
  }
}

/** Whether a product's config flag permits it, given the live config's load state. */
function flagIsAvailable(
  flag: keyof RadarConfigData | null,
  status: LoadStatus,
  config: RadarConfigData | null,
): boolean {
  if (flag === null) {
    return true;
  }
  if (status !== 'loaded') {
    // Unknown before the config loads: assume available so the app never looks broken offline.
    return true;
  }
  return config?.[flag] === true;
}
