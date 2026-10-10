import { Component, computed, inject, signal } from '@angular/core';
import { Pressable, SafeAreaProvider, SafeAreaView, ScrollView, Text, View } from '@ng-native/components';
import { StatusBar } from '@ng-native/device';
import { RadarConfigService, type RadarConfigData } from './radar-config.service.ts';

type LoadStatus = 'idle' | 'loading' | 'loaded' | 'error';

interface FlagRow {
  label: string;
  on: boolean;
}

/**
 * Element names are lowercase, and that is load-bearing rather than style: an uppercase name is
 * read as an unknown Angular component and commits as a plain view with nothing in it.
 *
 * Read-only screen: the only network call is the parameterless GET in RadarConfigService, fired
 * on an explicit press. The radar map below is unmistakably labelled mock data.
 */
@Component({
  imports: [Pressable, SafeAreaProvider, SafeAreaView, ScrollView, Text, View],
  selector: 'app-root',
  template: `
    <safe-area-provider>
      <safe-area-view class="screen">
        <scroll-view class="scroll">
          <view class="body">
            <view class="header">
              <text class="title">Weather Radar (read-only)</text>
              <text class="subtitle">
                Public GET only · no data sent · personal/educational use
              </text>
            </view>

            <view class="card">
              <view class="section-head">
                <text class="section-title">Live radar config</text>
                <text class="badge badge-live">REAL · verified GET</text>
              </view>
              <text class="section-note">
                Calls radar.wo-cloud.com/config/config.json over a single parameterless GET. Nothing
                is sent back.
              </text>

              <pressable
                accessibilityRole="button"
                accessibilityLabel="Load live radar config"
                class="button"
                [style]="{ opacity: status() === 'loading' ? 0.6 : 1 }"
                (press)="load()"
              >
                <text class="button-label">Load live radar config</text>
              </pressable>

              @if (status() === 'idle') {
                <text class="status">Status: idle — press to fetch.</text>
              }
              @if (status() === 'loading') {
                <text class="status">Status: loading…</text>
              }
              @if (status() === 'error') {
                <view class="error-box">
                  <text class="error-title">Live config unavailable (offline or blocked)</text>
                  <text class="error-detail">No response from the public config endpoint. The app stays fully read-only.</text>
                </view>
              }
              @if (status() === 'loaded') {
                <view class="flags">
                  @for (flag of flags(); track flag.label) {
                    <view class="flag-row">
                      <text class="flag-label">{{ flag.label }}</text>
                      <text
                        class="flag-value"
                        [style]="{ color: flag.on ? '#0b6b3a' : '#9a9aa5' }"
                      >
                        {{ flag.on ? 'ON' : 'OFF' }}
                      </text>
                    </view>
                  }
                </view>
                <text class="source">
                  source: radar.wo-cloud.com/config/config.json (HTTP 200, live GET)
                </text>
              }
            </view>

            <view class="card">
              <view class="section-head">
                <text class="section-title">Radar map — MOCK (not live)</text>
                <text class="badge badge-mock">FICTIONAL</text>
              </view>
              <text class="section-note">
                nowcast/v10 (+warnings/v6) return HTTP 401 (vendor-authenticated). Sample frames
                below are FICTIONAL, for layout only.
              </text>

              <view class="frames">
                @for (frame of mockFrames; track frame.stamp) {
                  <view class="frame">
                    <text class="frame-stamp">{{ frame.stamp }}</text>
                    <view class="grid">
                      @for (cell of frame.cells; track $index) {
                        <view class="cell" [style]="{ backgroundColor: cell }"></view>
                      }
                    </view>
                  </view>
                }
              </view>
              <text class="mock-note">Not real weather. No nowcast or warning data is fetched.</text>
            </view>
          </view>
        </scroll-view>
      </safe-area-view>
    </safe-area-provider>
  `,
  styles: `
    :host {
      flex: 1;
    }
    .screen {
      flex: 1;
      background-color: #f5f5f7;
    }
    .scroll {
      flex: 1;
    }
    .body {
      padding: 20px;
      gap: 16px;
    }
    .header {
      gap: 4px;
    }
    .title {
      color: #101014;
      font-size: 26px;
      font-weight: 700;
    }
    .subtitle {
      color: #5f5f6b;
      font-size: 13px;
    }
    .card {
      padding: 16px;
      gap: 10px;
      border-radius: 14px;
      background-color: #ffffff;
    }
    .section-head {
      flex-direction: row;
      align-items: center;
      justify-content: space-between;
    }
    .section-title {
      color: #101014;
      font-size: 18px;
      font-weight: 700;
    }
    .badge {
      padding: 3px 8px;
      border-radius: 8px;
      font-size: 11px;
      font-weight: 700;
    }
    .badge-live {
      color: #0b6b3a;
      background-color: #d6f2e1;
    }
    .badge-mock {
      color: #8a5a00;
      background-color: #ffe9c2;
    }
    .section-note {
      color: #5f5f6b;
      font-size: 13px;
    }
    .button {
      align-items: center;
      margin-top: 4px;
      padding: 13px;
      border-radius: 10px;
      background-color: #3b6ef5;
    }
    .button-label {
      color: #ffffff;
      font-size: 16px;
      font-weight: 600;
    }
    .status {
      color: #5f5f6b;
      font-size: 13px;
    }
    .error-box {
      padding: 12px;
      gap: 4px;
      border-radius: 10px;
      background-color: #fdecec;
    }
    .error-title {
      color: #a01b1b;
      font-size: 14px;
      font-weight: 700;
    }
    .error-detail {
      color: #a01b1b;
      font-size: 12px;
    }
    .flags {
      gap: 6px;
    }
    .flag-row {
      flex-direction: row;
      align-items: center;
      justify-content: space-between;
    }
    .flag-label {
      color: #33333d;
      font-size: 14px;
    }
    .flag-value {
      font-size: 13px;
      font-weight: 700;
    }
    .source {
      color: #0b6b3a;
      font-size: 12px;
    }
    .frames {
      flex-direction: row;
      gap: 10px;
    }
    .frame {
      flex: 1;
      gap: 6px;
      padding: 8px;
      border-radius: 10px;
      background-color: #eef1f6;
    }
    .frame-stamp {
      color: #33333d;
      font-size: 11px;
      font-weight: 700;
    }
    .grid {
      flex-direction: row;
      flex-wrap: wrap;
      gap: 4px;
    }
    .cell {
      width: 18px;
      height: 18px;
      border-radius: 3px;
    }
    .mock-note {
      color: #8a5a00;
      font-size: 12px;
      font-style: italic;
    }
    @media (prefers-color-scheme: dark) {
      .screen {
        background-color: #101014;
      }
      .card {
        background-color: #1c1c22;
      }
      .title,
      .section-title {
        color: #ffffff;
      }
      .subtitle,
      .section-note,
      .status,
      .flag-label,
      .frame-stamp {
        color: #8b8b96;
      }
      .frame {
        background-color: #26262e;
      }
    }
  `,
})
export class App {
  private readonly radar = inject(RadarConfigService);

  protected readonly status = signal<LoadStatus>('idle');

  private readonly config = signal<RadarConfigData | null>(null);

  protected readonly flags = computed<FlagRow[]>(() => {
    const c = this.config();
    if (!c) {
      return [];
    }
    return [
      { label: 'Lightning layer', on: c.layer_lightning_enabled === true },
      { label: 'Lightning realtime overlay', on: c.layer_lightning_realtime_overlay_enabled === true },
      { label: 'Webcams', on: c.layer_webcams_enabled === true },
      { label: 'Precipitation (ppt)', on: c.ppt_enabled === true },
      { label: 'Temperature layer', on: c.layer_temperature_enabled === true },
      { label: 'Gust layer', on: c.layer_gust_enabled === true },
    ];
  });

  /**
   * Fictional rain-cell frames. Static, local, and never fetched: nowcast/v10 and warnings/v6 are
   * HTTP 401 vendor-authenticated, so the real data is out of reach for a read-only client.
   */
  protected readonly mockFrames = [
    {
      stamp: 'T−120 min',
      cells: ['#c9d8f2', '#9fb8e8', '#dbe6fb', '#7f9fe0', '#c9d8f2'],
    },
    {
      stamp: 'T−60 min',
      cells: ['#9fb8e8', '#6f93dc', '#9fb8e8', '#4f78d0', '#c9d8f2'],
    },
    {
      stamp: 'T−0 min',
      cells: ['#6f93dc', '#4f78d0', '#6f93dc', '#3a63c4', '#8fb0e4'],
    },
  ];

  constructor() {
    // Dark status bar icons in light mode and light ones in dark mode. Unclaimed, Android keeps
    // light icons whatever the scheme.
    inject(StatusBar).set({ style: 'auto' });
  }

  protected load(): void {
    this.status.set('loading');
    this.config.set(null);
    this.radar.loadConfig().subscribe({
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
}
