import { render, screen, userEvent } from '@ng-native/testing';
import { of, throwError } from 'rxjs';
import { expect, test, vi } from 'vitest';
import { App } from './app.ts';
import type { ProductKey } from './radar-products.ts';
import { RadarConfigService, type RadarConfigData } from './radar-config.service.ts';

/** Hermetic stub: no HttpClient, no network. Deterministic per test. */
function stubService(loadConfig: () => ReturnType<RadarConfigService['loadConfig']>) {
  return { provide: RadarConfigService, useValue: { loadConfig } };
}

/**
 * The root owns every signal and method behind `protected`, which is right for the app and awkward
 * for a unit test. This view of the instance lets a test drive the root's own state machine
 * directly, without depending on a child component's internal markup.
 */
interface AppProbe {
  frameIndex: () => number;
  playing: () => boolean;
  activeProduct: () => ProductKey;
  available: () => ReadonlyMap<ProductKey, boolean>;
  activePanel: () => 'layer' | 'legend' | 'webcam' | null;
  selectFrame: (index: number) => void;
  togglePlay: () => void;
}

function probe(instance: App): AppProbe {
  return instance as unknown as AppProbe;
}

test('renders the full screen chrome and makes no network call on init', async () => {
  const loadConfig = vi.fn(() => of<RadarConfigData>({}));
  await render(App, { providers: [stubService(loadConfig)] });

  // The corner controls exist, by the labels a screen reader would read.
  expect(screen.getByRole('button', { name: 'Show my location' })).toBeTruthy();
  expect(screen.getByRole('button', { name: 'Legend' })).toBeTruthy();
  expect(screen.getByRole('button', { name: 'Radar layers' })).toBeTruthy();
  expect(screen.getByRole('button', { name: 'Webcams' })).toBeTruthy();

  // The static scale bar and the timeline's own notice are on screen.
  expect(screen.getByText('50 km')).toBeTruthy();
  expect(screen.getByText('Not real weather — simulated forecast')).toBeTruthy();

  // Initial render must make no network call.
  expect(loadConfig).not.toHaveBeenCalled();
});

test('the two safety strings are the entire labelling surface', async () => {
  await render(App, { providers: [stubService(vi.fn(() => of<RadarConfigData>({})))] });

  expect(screen.getByText('Simulated data · read-only demo')).toBeTruthy();
  expect(screen.getByText('Not real weather — simulated forecast')).toBeTruthy();

  // The human's minimised-labelling decision: none of the old MOCK/FICTIONAL wording survives.
  expect(screen.queryAllByText(/mock|fictional/i)).toHaveLength(0);

  // "demo" survives only inside the single allowed sentence — the safety line. (The word appears
  // there in lower case by design; the point of this assertion is that no *second* node carries it.)
  expect(screen.queryAllByText(/demo/i)).toHaveLength(1);
});

test('opens and closes the legend, layers and webcam panels', async () => {
  await render(App, { providers: [stubService(vi.fn(() => of<RadarConfigData>({})))] });
  const user = userEvent.setup();

  // Legend toggles on and off.
  await user.press(screen.getByRole('button', { name: 'Legend' }));
  expect(screen.getByText('WeatherRadar')).toBeTruthy();
  await user.press(screen.getByRole('button', { name: 'Legend' }));
  expect(screen.queryByText('WeatherRadar')).toBeNull();

  // Layers opens the product picker.
  await user.press(screen.getByRole('button', { name: 'Radar layers' }));
  expect(screen.getByText('WetterRadar')).toBeTruthy();
  expect(screen.getByText('RegenRadar')).toBeTruthy();

  // Webcams opens the sheet.
  await user.press(screen.getByRole('button', { name: 'Webcams' }));
  expect(screen.getByText('Nearby webcams')).toBeTruthy();
});

test('product selection re-drives the legend and the timeline', async () => {
  await render(App, { providers: [stubService(vi.fn(() => of<RadarConfigData>({})))] });
  const user = userEvent.setup();

  await user.press(screen.getByRole('button', { name: 'Radar layers' }));
  await user.press(screen.getByLabelText('Lightning'));

  // Picking a product closes the panel that offered it.
  expect(screen.queryByText('WetterRadar')).toBeNull();

  // The legend now speaks for the selected product...
  await user.press(screen.getByRole('button', { name: 'Legend' }));
  expect(screen.getAllByText('Lightning').length).toBeGreaterThan(0);

  // ...and the timeline switched to the lightning periods.
  expect(screen.getByText('- 30 min')).toBeTruthy();
});

test('seeks frames within bounds and animates on play', async () => {
  const view = await render(App, {
    providers: [stubService(vi.fn(() => of<RadarConfigData>({})))],
  });
  const app = probe(view.instance);

  // selectFrame clamps to [0, frames - 1]; the default product has 6 frames.
  app.selectFrame(-1);
  expect(app.frameIndex()).toBe(0);
  app.selectFrame(99);
  expect(app.frameIndex()).toBe(5);

  // The play button animates: the frame advances every 900ms, modulo the frame count.
  app.selectFrame(0);
  vi.useFakeTimers();
  try {
    app.togglePlay();
    expect(app.playing()).toBe(true);

    vi.advanceTimersByTime(900);
    expect(app.frameIndex()).toBe(1);
    vi.advanceTimersByTime(900);
    expect(app.frameIndex()).toBe(2);

    // Pausing stops the clock.
    app.togglePlay();
    expect(app.playing()).toBe(false);
    vi.advanceTimersByTime(1800);
    expect(app.frameIndex()).toBe(2);
  } finally {
    vi.useRealTimers();
  }
});

test('the one live GET drives product availability from the loaded flags', async () => {
  const loadConfig = vi.fn(() =>
    of<RadarConfigData>({ layer_lightning_enabled: true, ppt_enabled: false }),
  );
  const view = await render(App, { providers: [stubService(loadConfig)] });
  const user = userEvent.setup();

  await user.press(screen.getByRole('button', { name: 'Radar layers' }));
  await user.press(screen.getByRole('button', { name: 'Fetch public layer config' }));

  expect(loadConfig).toHaveBeenCalledTimes(1);

  // The loaded flags gate availability: lightning stays, rain radar does not.
  const available = probe(view.instance).available();
  expect(available.get('lightning')).toBe(true);
  expect(available.get('rr')).toBe(false);
});

test('a failing request drives the layer panel into its unavailable state', async () => {
  const loadConfig = vi.fn(() => throwError(() => new Error('no network available')));
  await render(App, { providers: [stubService(loadConfig)] });
  const user = userEvent.setup();

  await user.press(screen.getByRole('button', { name: 'Radar layers' }));
  await user.press(screen.getByRole('button', { name: 'Fetch public layer config' }));

  expect(loadConfig).toHaveBeenCalledTimes(1);
  expect(
    screen.getByText('Public config unavailable (offline or blocked). Nothing else is fetched.'),
  ).toBeTruthy();
});

test('makes no network call beyond the single GET across a full interaction sweep', async () => {
  const loadConfig = vi.fn(() => of<RadarConfigData>({ layer_lightning_enabled: true }));
  await render(App, { providers: [stubService(loadConfig)] });
  const user = userEvent.setup();

  await user.press(screen.getByRole('button', { name: 'Share' }));
  await user.press(screen.getByRole('button', { name: 'Fullscreen' }));
  await user.press(screen.getByRole('button', { name: 'Legend' }));
  await user.press(screen.getByRole('button', { name: 'Legend' }));
  await user.press(screen.getByRole('button', { name: 'Radar layers' }));
  await user.press(screen.getByRole('button', { name: 'Fetch public layer config' }));
  await user.press(screen.getByRole('button', { name: 'Webcams' }));
  await user.press(screen.getByRole('button', { name: 'Show my location' }));

  expect(loadConfig.mock.calls.length).toBeLessThanOrEqual(1);
});
