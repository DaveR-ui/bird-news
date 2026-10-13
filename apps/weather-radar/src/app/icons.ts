import { Component, computed, input } from '@angular/core';
import { View } from '@ng-native/components';

/**
 * The icon set, rebuilt from native views because ng-native 0.9.0 ships no SVG element and no
 * icon library (`react-native-svg` is not a dependency). Each glyph is a small tree of `<view>`s
 * whose shape comes from `border-radius` and `transform: rotate(...)` and whose colour comes from
 * a single inline style binding, so a size or a tone change costs no new art.
 *
 * `skew` is deliberately never used: the CSS compiler refuses a skew in a rule that can land on
 * Android, where a view has no skew. Rotation only.
 */
export type IconName =
  | 'layers'
  | 'layers-open'
  | 'lightning'
  | 'rain'
  | 'temperature'
  | 'gust'
  | 'warnings'
  | 'webcam'
  | 'globe'
  | 'clouds'
  | 'info'
  | 'locate'
  | 'share'
  | 'play'
  | 'pause'
  | 'stop'
  | 'plus'
  | 'minus'
  | 'close'
  | 'chevron-left'
  | 'chevron-right'
  | 'back'
  | 'logo'
  | 'drop';

/** White glyph on the blue control. */
const INK_LIGHT = '#ffffff';
/** Primary-pressed glyph on a light surface. */
const INK_DARK = '#00537f';
/** The colour an "hole" inside a light glyph shows: the control blue behind it. */
const CUT_LIGHT = '#10658e';
/** The colour an "hole" inside a dark glyph shows: the surface behind it. */
const CUT_DARK = '#ffffff';

@Component({
  selector: 'icon',
  standalone: true,
  imports: [View],
  template: `
    <view class="icon" [style]="{ width: size(), height: size() }">
      @switch (name()) {
        @case ('layers') {
          <!-- three stacked bars, narrowing like a stack -->
          <view class="el b3 l1" [style]="{ backgroundColor: ink() }"></view>
          <view class="el b3 l2" [style]="{ backgroundColor: ink() }"></view>
          <view class="el b3 l3" [style]="{ backgroundColor: ink() }"></view>
        }
        @case ('layers-open') {
          <!-- the same stack, plus a diagonal slash -->
          <view class="el b3 l1" [style]="{ backgroundColor: ink() }"></view>
          <view class="el b3 l2" [style]="{ backgroundColor: ink() }"></view>
          <view class="el b3 l3" [style]="{ backgroundColor: ink() }"></view>
          <view class="el b2 slash" [style]="{ backgroundColor: ink() }"></view>
        }
        @case ('lightning') {
          <!-- a bolt: three rotated bars zig-zagging -->
          <view class="el b2 lb1" [style]="{ backgroundColor: ink() }"></view>
          <view class="el b2 lb2" [style]="{ backgroundColor: ink() }"></view>
          <view class="el b2 lb3" [style]="{ backgroundColor: ink() }"></view>
        }
        @case ('rain') {
          <!-- a rounded head with two drops under it -->
          <view class="el round head" [style]="{ backgroundColor: ink() }"></view>
          <view class="el b2 drop-a" [style]="{ backgroundColor: ink() }"></view>
          <view class="el b2 drop-b" [style]="{ backgroundColor: ink() }"></view>
        }
        @case ('drop') {
          <!-- a single drop: rounded head with one tail -->
          <view class="el round head" [style]="{ backgroundColor: ink() }"></view>
          <view class="el b2 drop-c" [style]="{ backgroundColor: ink() }"></view>
        }
        @case ('temperature') {
          <!-- a thin column over a bulb -->
          <view class="el round tbar" [style]="{ backgroundColor: ink() }"></view>
          <view class="el round tbulb" [style]="{ backgroundColor: ink() }"></view>
        }
        @case ('gust') {
          <!-- three alternating wavy bars -->
          <view class="el g1" [style]="{ backgroundColor: ink() }"></view>
          <view class="el g2" [style]="{ backgroundColor: ink() }"></view>
          <view class="el g3" [style]="{ backgroundColor: ink() }"></view>
        }
        @case ('warnings') {
          <!-- a clipped rotated square reads as a triangle, with a small bang inside -->
          <view class="warn-clip">
            <view class="el b3 warn-tri" [style]="{ backgroundColor: ink() }"></view>
          </view>
          <view class="el b2 warn-bar" [style]="{ backgroundColor: cut() }"></view>
          <view class="el round warn-dot" [style]="{ backgroundColor: cut() }"></view>
        }
        @case ('webcam') {
          <!-- body, lens and a small mounting tail -->
          <view class="el b2 cam-tail" [style]="{ backgroundColor: ink() }"></view>
          <view class="el b3 cam-body" [style]="{ backgroundColor: ink() }"></view>
          <view class="el round cam-lens" [style]="{ backgroundColor: cut() }"></view>
        }
        @case ('globe') {
          <!-- a filled disc crossed by two hairline meridians -->
          <view class="el round globe-body" [style]="{ backgroundColor: ink() }"></view>
          <view class="el globe-h" [style]="{ backgroundColor: cut() }"></view>
          <view class="el round globe-v" [style]="{ backgroundColor: cut() }"></view>
        }
        @case ('clouds') {
          <!-- a wide rounded bar with a puff on its left top -->
          <view class="el round cloud-bar" [style]="{ backgroundColor: ink() }"></view>
          <view class="el round cloud-puff" [style]="{ backgroundColor: ink() }"></view>
        }
        @case ('info') {
          <!-- a disc with an i cut out of it -->
          <view class="el round info-body" [style]="{ backgroundColor: ink() }"></view>
          <view class="el round info-dot" [style]="{ backgroundColor: cut() }"></view>
          <view class="el b2 info-bar" [style]="{ backgroundColor: cut() }"></view>
        }
        @case ('locate') {
          <!-- a ring, a centre dot and four ticks -->
          <view class="el round loc-body" [style]="{ backgroundColor: ink() }"></view>
          <view class="el round loc-hole" [style]="{ backgroundColor: cut() }"></view>
          <view class="el round loc-dot" [style]="{ backgroundColor: ink() }"></view>
          <view class="el round loc-t" [style]="{ backgroundColor: ink() }"></view>
          <view class="el round loc-b" [style]="{ backgroundColor: ink() }"></view>
          <view class="el round loc-l" [style]="{ backgroundColor: ink() }"></view>
          <view class="el round loc-r" [style]="{ backgroundColor: ink() }"></view>
        }
        @case ('share') {
          <!-- a box with an arrow leaving its top-right corner -->
          <view class="el b3 share-out" [style]="{ backgroundColor: ink() }"></view>
          <view class="el b2 share-in" [style]="{ backgroundColor: cut() }"></view>
          <view class="el b2 share-shaft" [style]="{ backgroundColor: ink() }"></view>
          <view class="el b2 share-head" [style]="{ backgroundColor: ink() }"></view>
        }
        @case ('play') {
          <!-- a right-pointing arrowhead -->
          <view class="el b2 play-v" [style]="{ backgroundColor: ink() }"></view>
          <view class="el b2 play-u" [style]="{ backgroundColor: ink() }"></view>
          <view class="el b2 play-l" [style]="{ backgroundColor: ink() }"></view>
        }
        @case ('pause') {
          <view class="el b2 pause-a" [style]="{ backgroundColor: ink() }"></view>
          <view class="el b2 pause-b" [style]="{ backgroundColor: ink() }"></view>
        }
        @case ('stop') {
          <view class="el b3 stop-sq" [style]="{ backgroundColor: ink() }"></view>
        }
        @case ('plus') {
          <view class="el b2 plus-h" [style]="{ backgroundColor: ink() }"></view>
          <view class="el b2 plus-v" [style]="{ backgroundColor: ink() }"></view>
        }
        @case ('minus') {
          <view class="el b2 minus-h" [style]="{ backgroundColor: ink() }"></view>
        }
        @case ('close') {
          <view class="el b2 close-a" [style]="{ backgroundColor: ink() }"></view>
          <view class="el b2 close-b" [style]="{ backgroundColor: ink() }"></view>
        }
        @case ('chevron-left') {
          <view class="el b2 chev-u" [style]="{ backgroundColor: ink() }"></view>
          <view class="el b2 chev-d" [style]="{ backgroundColor: ink() }"></view>
        }
        @case ('chevron-right') {
          <view class="el b2 chevr-u" [style]="{ backgroundColor: ink() }"></view>
          <view class="el b2 chevr-d" [style]="{ backgroundColor: ink() }"></view>
        }
        @case ('back') {
          <view class="el b2 chev-u" [style]="{ backgroundColor: ink() }"></view>
          <view class="el b2 chev-d" [style]="{ backgroundColor: ink() }"></view>
          <view class="el b2 back-shaft" [style]="{ backgroundColor: ink() }"></view>
        }
        @case ('logo') {
          <!-- the app mark: a cloud over a drop -->
          <view class="el round logo-cloud" [style]="{ backgroundColor: ink() }"></view>
          <view class="el round logo-puff" [style]="{ backgroundColor: ink() }"></view>
          <view class="el round logo-drop" [style]="{ backgroundColor: ink() }"></view>
        }
      }
    </view>
  `,
  styles: `
    :host {
      align-items: center;
      justify-content: center;
    }
    .icon {
      position: relative;
    }
    .el {
      position: absolute;
      border-radius: 1px;
    }
    .round {
      border-radius: 999px;
    }
    .b2 {
      border-radius: 2px;
    }
    .b3 {
      border-radius: 3px;
    }
    /* layers / layers-open */
    .l1 {
      top: 20%;
      left: 8%;
      width: 84%;
      height: 14%;
    }
    .l2 {
      top: 43%;
      left: 18%;
      width: 64%;
      height: 14%;
    }
    .l3 {
      top: 66%;
      left: 28%;
      width: 44%;
      height: 14%;
    }
    .slash {
      top: 4%;
      left: 66%;
      width: 12%;
      height: 52%;
      transform: rotate(45deg);
    }
    /* lightning */
    .lb1 {
      top: 3%;
      left: 50%;
      width: 18%;
      height: 46%;
      transform: rotate(22deg);
    }
    .lb2 {
      top: 42%;
      left: 26%;
      width: 48%;
      height: 15%;
      transform: rotate(-22deg);
    }
    .lb3 {
      top: 52%;
      left: 30%;
      width: 18%;
      height: 46%;
      transform: rotate(22deg);
    }
    /* rain / drop */
    .head {
      top: 5%;
      left: 26%;
      width: 48%;
      height: 48%;
    }
    .drop-a {
      top: 62%;
      left: 34%;
      width: 10%;
      height: 26%;
    }
    .drop-b {
      top: 62%;
      left: 56%;
      width: 10%;
      height: 26%;
    }
    .drop-c {
      top: 62%;
      left: 45%;
      width: 10%;
      height: 26%;
    }
    /* temperature */
    .tbar {
      top: 4%;
      left: 42%;
      width: 16%;
      height: 56%;
    }
    .tbulb {
      top: 56%;
      left: 32%;
      width: 36%;
      height: 36%;
    }
    /* gust */
    .g1 {
      top: 22%;
      left: 8%;
      width: 74%;
      height: 12%;
      border-radius: 6px;
    }
    .g2 {
      top: 44%;
      left: 18%;
      width: 74%;
      height: 12%;
      border-radius: 0 6px 0 6px;
    }
    .g3 {
      top: 66%;
      left: 8%;
      width: 84%;
      height: 12%;
      border-radius: 6px 0 6px 0;
    }
    /* warnings */
    .warn-clip {
      position: absolute;
      top: 10%;
      left: 6%;
      width: 88%;
      height: 52%;
      overflow: hidden;
    }
    .warn-tri {
      top: 0%;
      left: 16%;
      width: 68%;
      height: 96%;
      transform: rotate(45deg);
    }
    .warn-bar {
      top: 30%;
      left: 46%;
      width: 8%;
      height: 18%;
    }
    .warn-dot {
      top: 53%;
      left: 46%;
      width: 8%;
      height: 8%;
    }
    /* webcam */
    .cam-tail {
      top: 8%;
      left: 38%;
      width: 24%;
      height: 20%;
      border-radius: 999px 999px 0 0;
    }
    .cam-body {
      top: 26%;
      left: 10%;
      width: 80%;
      height: 50%;
      border-radius: 8px;
    }
    .cam-lens {
      top: 38%;
      left: 37%;
      width: 26%;
      height: 26%;
    }
    /* globe */
    .globe-body {
      top: 10%;
      left: 10%;
      width: 80%;
      height: 80%;
    }
    .globe-h {
      top: 46%;
      left: 12%;
      width: 76%;
      height: 8%;
    }
    .globe-v {
      top: 12%;
      left: 46%;
      width: 8%;
      height: 76%;
    }
    /* clouds */
    .cloud-bar {
      top: 48%;
      left: 8%;
      width: 84%;
      height: 34%;
    }
    .cloud-puff {
      top: 24%;
      left: 20%;
      width: 42%;
      height: 42%;
    }
    /* info */
    .info-body {
      top: 8%;
      left: 8%;
      width: 84%;
      height: 84%;
    }
    .info-dot {
      top: 24%;
      left: 46%;
      width: 9%;
      height: 9%;
    }
    .info-bar {
      top: 40%;
      left: 46%;
      width: 9%;
      height: 30%;
    }
    /* locate */
    .loc-body {
      top: 22%;
      left: 22%;
      width: 56%;
      height: 56%;
    }
    .loc-hole {
      top: 35%;
      left: 35%;
      width: 30%;
      height: 30%;
    }
    .loc-dot {
      top: 44%;
      left: 44%;
      width: 12%;
      height: 12%;
    }
    .loc-t {
      top: 2%;
      left: 45%;
      width: 10%;
      height: 12%;
    }
    .loc-b {
      bottom: 2%;
      left: 45%;
      width: 10%;
      height: 12%;
    }
    .loc-l {
      left: 2%;
      top: 45%;
      width: 12%;
      height: 10%;
    }
    .loc-r {
      right: 2%;
      top: 45%;
      width: 12%;
      height: 10%;
    }
    /* share */
    .share-out {
      top: 44%;
      left: 14%;
      width: 68%;
      height: 52%;
      border-radius: 3px;
    }
    .share-in {
      top: 54%;
      left: 24%;
      width: 48%;
      height: 34%;
    }
    .share-shaft {
      top: 14%;
      left: 52%;
      width: 12%;
      height: 38%;
      transform: rotate(45deg);
    }
    .share-head {
      top: 6%;
      left: 62%;
      width: 18%;
      height: 18%;
      transform: rotate(45deg);
    }
    /* play */
    .play-v {
      top: 16%;
      left: 28%;
      width: 13%;
      height: 68%;
    }
    .play-u {
      top: 16%;
      left: 38%;
      width: 13%;
      height: 40%;
      transform: rotate(40deg);
    }
    .play-l {
      top: 48%;
      left: 38%;
      width: 13%;
      height: 40%;
      transform: rotate(-40deg);
    }
    /* pause */
    .pause-a {
      top: 18%;
      left: 28%;
      width: 16%;
      height: 64%;
    }
    .pause-b {
      top: 18%;
      left: 56%;
      width: 16%;
      height: 64%;
    }
    /* stop */
    .stop-sq {
      top: 24%;
      left: 24%;
      width: 52%;
      height: 52%;
    }
    /* plus / minus */
    .plus-h {
      top: 44%;
      left: 14%;
      width: 72%;
      height: 12%;
    }
    .plus-v {
      top: 14%;
      left: 44%;
      width: 12%;
      height: 72%;
    }
    .minus-h {
      top: 44%;
      left: 14%;
      width: 72%;
      height: 12%;
    }
    /* close */
    .close-a {
      top: 44%;
      left: 14%;
      width: 72%;
      height: 12%;
      transform: rotate(45deg);
    }
    .close-b {
      top: 44%;
      left: 14%;
      width: 72%;
      height: 12%;
      transform: rotate(-45deg);
    }
    /* chevrons */
    .chev-u {
      top: 30%;
      left: 28%;
      width: 42%;
      height: 12%;
      transform: rotate(-45deg);
    }
    .chev-d {
      top: 58%;
      left: 28%;
      width: 42%;
      height: 12%;
      transform: rotate(45deg);
    }
    .chevr-u {
      top: 30%;
      left: 30%;
      width: 42%;
      height: 12%;
      transform: rotate(45deg);
    }
    .chevr-d {
      top: 58%;
      left: 30%;
      width: 42%;
      height: 12%;
      transform: rotate(-45deg);
    }
    .back-shaft {
      top: 44%;
      left: 30%;
      width: 44%;
      height: 12%;
    }
    /* logo */
    .logo-cloud {
      top: 24%;
      left: 8%;
      width: 84%;
      height: 30%;
    }
    .logo-puff {
      top: 12%;
      left: 20%;
      width: 34%;
      height: 34%;
    }
    .logo-drop {
      top: 64%;
      left: 42%;
      width: 18%;
      height: 26%;
    }
  `,
})
export class Icon {
  readonly name = input.required<IconName>();
  /** `light` is a white glyph on the blue control; `dark` is the pressed blue on a surface. */
  readonly tone = input<'light' | 'dark'>('light');
  readonly size = input<number>(24);

  /** The glyph colour. */
  protected readonly ink = computed(() => (this.tone() === 'light' ? INK_LIGHT : INK_DARK));

  /** The colour a cut-out inside the glyph shows, i.e. what sits behind the icon. */
  protected readonly cut = computed(() => (this.tone() === 'light' ? CUT_LIGHT : CUT_DARK));
}
