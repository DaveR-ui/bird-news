import { Component, computed, input, output } from '@angular/core';
import { Pressable, Text, View } from '@ng-native/components';
import { COLOR } from './design-tokens.ts';
import { Icon } from './icons.ts';
import { productByKey, type PeriodOption, type ProductKey } from './radar-products.ts';

/**
 * The bottom-centre timeline: period chips, frame stepping, play/pause, a slider, and the one
 * always-visible safety notice. It renders no scrolling content.
 */
@Component({
  selector: 'time-control',
  standalone: true,
  imports: [Pressable, Text, View, Icon],
  template: `
    <view class="tc">
      <view class="chips">
        @for (period of periods(); track period.id) {
          <pressable
            class="chip"
            accessibilityRole="button"
            accessibilityLabel="{{ period.label }}"
            [style]="{
              backgroundColor: period.frameIndex === frameIndex() ? '#00537f' : 'transparent'
            }"
            (press)="selectFrame.emit(period.frameIndex)"
          >
            <text
              class="chip-text"
              [style]="{ fontWeight: period.frameIndex === frameIndex() ? '700' : '400' }"
            >
              {{ period.label }}
            </text>
          </pressable>
        }
      </view>

      <view class="timerow">
        <pressable
          class="step"
          accessibilityRole="button"
          accessibilityLabel="Previous frame"
          (press)="prev()"
        >
          <icon [name]="'chevron-left'" [size]="20" />
        </pressable>

        <text class="time" [style]="{ color: timeColor() }">{{ timeLabel() }}</text>

        <pressable
          class="step"
          accessibilityRole="button"
          accessibilityLabel="Next frame"
          (press)="next()"
        >
          <icon [name]="'chevron-right'" [size]="20" />
        </pressable>

        <pressable
          class="step"
          accessibilityRole="button"
          accessibilityLabel="{{ playing() ? 'Pause' : 'Play' }}"
          (press)="togglePlay.emit()"
        >
          <icon [name]="playing() ? 'pause' : 'play'" [size]="20" />
        </pressable>
      </view>

      <view class="slider">
        <view class="fill" [style]="{ width: pct() + '%' }"></view>
        <view class="knob" [style]="{ left: pct() + '%' }"></view>
      </view>

      <text class="safety">Not real weather — simulated forecast</text>
    </view>
  `,
  styles: `
    :host {
      width: 100%;
      max-width: 400px;
    }
    .tc {
      width: 100%;
      max-width: 400px;
      flex-direction: column;
      align-items: center;
      gap: 5px;
      padding: 6px 10px;
      background-color: rgba(0, 57, 89, 0.84);
      border-radius: 4px;
    }
    .chips {
      flex-direction: row;
      flex-wrap: wrap;
      align-items: center;
      justify-content: center;
      gap: 4px;
    }
    .chip {
      padding: 0 10px;
      min-height: 30px;
      align-items: center;
      justify-content: center;
      border-radius: 4px;
    }
    .chip-text {
      color: #ffffff;
      font-size: 13px;
    }
    .timerow {
      flex-direction: row;
      align-items: center;
      gap: 10px;
    }
    .step {
      width: 40px;
      height: 40px;
      align-items: center;
      justify-content: center;
      border-radius: 4px;
    }
    .time {
      min-width: 64px;
      text-align: center;
      font-size: 14px;
      font-weight: 700;
    }
    .slider {
      position: relative;
      width: 100%;
      height: 4px;
      margin-top: 8px;
      border-radius: 2px;
      background-image: linear-gradient(to right, #ffbe00 0%, #ffbe00 100%);
    }
    .fill {
      position: absolute;
      top: 0;
      left: 0;
      bottom: 0;
      background-color: #ffffff;
      border-radius: 2px;
    }
    .knob {
      position: absolute;
      top: -13px;
      width: 30px;
      height: 30px;
      margin-left: -15px;
      border-radius: 999px;
      background-color: #ffffff;
      box-shadow: 0 1px 4px rgba(0, 0, 0, 0.3);
    }
    .safety {
      color: #a0a0a0;
      font-size: 11px;
      pointer-events: none;
    }
  `,
})
export class TimeControlComponent {
  readonly activeProduct = input.required<ProductKey>();
  readonly playing = input.required<boolean>();
  readonly frameIndex = input.required<number>();
  readonly selectFrame = output<number>();
  readonly togglePlay = output<void>();

  /** The active product. */
  private readonly product = computed(() => productByKey(this.activeProduct()));

  /** The active product's period chips. */
  protected readonly periods = computed<readonly PeriodOption[]>(
    () => this.product().periods,
  );

  /** The current frame's label: its period's, or `now`. */
  protected readonly timeLabel = computed(() => {
    const index = this.frameIndex();
    const period = this.periods().find((candidate) => candidate.frameIndex === index);
    return period ? period.label : 'now';
  });

  /** Forecast frames are the accent; the current and past frames are plain white. */
  protected readonly timeColor = computed(() =>
    isForecast(this.timeLabel()) ? COLOR.accent : COLOR.onPrimary,
  );

  /** The played fraction along the slider, in percent. */
  protected readonly pct = computed(() => {
    const frames = this.product().frames;
    const span = Math.max(frames - 1, 1);
    const value = (this.frameIndex() / span) * 100;
    return Math.max(0, Math.min(100, Math.round(value)));
  });

  protected prev(): void {
    this.selectFrame.emit(Math.max(0, this.frameIndex() - 1));
  }

  protected next(): void {
    this.selectFrame.emit(Math.min(this.product().frames - 1, this.frameIndex() + 1));
  }
}

/** A period label is a forecast when it names a future frame. */
function isForecast(label: string): boolean {
  return label.startsWith('+') || label === 'tomorrow' || label === 'later';
}
