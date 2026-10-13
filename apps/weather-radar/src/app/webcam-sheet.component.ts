import { Component, computed, input, output } from '@angular/core';
import { Pressable, ScrollView, Text, View } from '@ng-native/components';
import { Icon } from './icons.ts';

/**
 * The drag-up webcam sheet: a mock feed with a strip of mock thumbnails. Pure decoration — no
 * network call and no remote image source, so it renders hermetically.
 */
@Component({
  selector: 'webcam-sheet',
  standalone: true,
  imports: [Pressable, ScrollView, Text, View, Icon],
  template: `
    <view
      class="backdrop"
      [style]="{
        opacity: open() ? 1 : 0,
        pointerEvents: open() ? 'auto' : 'none'
      }"
    >
      <view class="sheet" [style]="sheetStyle()">
        <view class="handle"></view>

        <pressable
          class="sheet-close"
          accessibilityRole="button"
          accessibilityLabel="Close webcams"
          (press)="close.emit()"
        >
          <icon [name]="'close'" [tone]="'dark'" [size]="20" />
        </pressable>

        <view class="frame">
          <view class="frame-vignette"></view>
          <pressable
            class="frame-play"
            accessibilityRole="button"
            accessibilityLabel="Play webcam"
          >
            <icon [name]="'play'" [size]="20" />
          </pressable>
          <view class="frame-caption">
            <text class="frame-title">Summit webcam — north ridge</text>
            <text class="frame-source">Source: summit station</text>
          </view>
        </view>

        <scroll-view class="body">
          <view class="body-inner">
            <text class="body-title">Nearby webcams</text>

            <view class="grid">
              <view class="thumb">
                <view class="thumb-img thumb-0"></view>
                <text class="thumb-time">now</text>
              </view>
              <view class="thumb">
                <view class="thumb-img thumb-1"></view>
                <text class="thumb-time">- 30 min</text>
              </view>
              <view class="thumb">
                <view class="thumb-img thumb-2"></view>
                <text class="thumb-time">- 1 h</text>
              </view>
              <view class="thumb">
                <view class="thumb-img thumb-3"></view>
                <text class="thumb-time">- 2 h</text>
              </view>
            </view>

            <text class="disclaimer">Simulated data · read-only demo</text>
          </view>
        </scroll-view>
      </view>
    </view>
  `,
  styles: `
    :host {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
    }
    .backdrop {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background-color: rgba(0, 0, 0, 0.5);
    }
    .sheet {
      position: absolute;
      left: 0;
      bottom: 0;
      width: 100%;
      height: 62%;
      background-color: #ffffff;
      border-radius: 10px 10px 0 0;
    }
    .handle {
      width: 36px;
      height: 5px;
      margin: 10px auto 0;
      border-radius: 999px;
      background-color: #dedede;
    }
    .sheet-close {
      position: absolute;
      top: 8px;
      right: 12px;
      width: 40px;
      height: 40px;
      align-items: center;
      justify-content: center;
      border-radius: 4px;
      background-color: #e6eff3;
    }
    .frame {
      position: relative;
      height: 220px;
      margin: 10px 16px 0;
      border-radius: 5px;
      overflow: hidden;
      background-image: linear-gradient(160deg, #aaffff 0%, #53d2ff 45%, #177edc 100%);
    }
    .frame-vignette {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background-image: linear-gradient(45deg, transparent 70%, rgba(0, 0, 0, 0.2) 100%);
    }
    .frame-play {
      position: absolute;
      top: 50%;
      left: 50%;
      width: 50px;
      height: 50px;
      margin-left: -25px;
      margin-top: -25px;
      align-items: center;
      justify-content: center;
      border-radius: 999px;
      background-color: #10658e;
      border: 2px solid #ffffff;
    }
    .frame-caption {
      position: absolute;
      left: 12px;
      right: 12px;
      bottom: 10px;
    }
    .frame-title {
      color: #ffffff;
      font-size: 15px;
      font-weight: 700;
      text-shadow: 0 1px 3px rgba(0, 0, 0, 0.6);
    }
    .frame-source {
      color: #ffffff;
      font-size: 14px;
      text-shadow: 0 1px 3px rgba(0, 0, 0, 0.6);
    }
    .body {
      flex: 1;
    }
    .body-inner {
      padding: 16px;
      gap: 10px;
    }
    .body-title {
      color: #000000;
      font-size: 18px;
      font-weight: 700;
    }
    .grid {
      flex-direction: row;
      flex-wrap: wrap;
      gap: 4px;
    }
    .thumb {
      width: 23%;
      gap: 3px;
    }
    .thumb-img {
      width: 100%;
      height: 56px;
      border-radius: 5px;
    }
    .thumb-0 {
      background-image: linear-gradient(150deg, #aaffff 0%, #53d2ff 100%);
    }
    .thumb-1 {
      background-image: linear-gradient(150deg, #53d2ff 0%, #33adff 100%);
    }
    .thumb-2 {
      background-image: linear-gradient(150deg, #2294f3 0%, #0d6ec7 100%);
    }
    .thumb-3 {
      background-image: linear-gradient(150deg, #177edc 0%, #c72bc7 100%);
    }
    .thumb-time {
      color: #464646;
      font-size: 10px;
    }
    .disclaimer {
      color: #a0a0a0;
      font-size: 11px;
    }
    @media (prefers-color-scheme: dark) {
      .sheet {
        background-color: #003959;
      }
      .body-title {
        color: #f2f7f9;
      }
      .thumb-time {
        color: #f2f7f9;
      }
      .sheet-close {
        background-color: #00273c;
      }
    }
  `,
})
export class WebcamSheetComponent {
  readonly open = input.required<boolean>();
  readonly close = output<void>();

  /**
   * Sheets slide off the bottom edge with a transform written as a React Native style object, which
   * is the form the framework's own host bindings use. A CSS `transform` in a `styles` block is not
   * the same thing and is not bound to a dynamic value.
   */
  protected readonly sheetStyle = computed<Record<string, unknown>>(() => ({
    transform: [{ translateY: this.open() ? 0 : 700 }],
  }));
}
