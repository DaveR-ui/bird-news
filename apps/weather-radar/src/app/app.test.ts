import { render, screen, userEvent } from '@ng-native/testing';
import { of, throwError } from 'rxjs';
import { expect, test, vi } from 'vitest';
import { App } from './app.ts';
import { RadarConfigService, type RadarConfigData } from './radar-config.service.ts';

/** Hermetic stub: no HttpClient, no network. Deterministic per test. */
function stubService(loadConfig: () => ReturnType<RadarConfigService['loadConfig']>) {
  return { provide: RadarConfigService, useValue: { loadConfig } };
}

test('renders the mock radar section and the load button without fetching on init', async () => {
  const loadConfig = vi.fn(() => of<RadarConfigData>({}));
  await render(App, { providers: [stubService(loadConfig)] });

  expect(screen.getByText(/Radar map — MOCK \(not live\)/)).toBeTruthy();
  expect(screen.getByText('FICTIONAL, for layout only', { exact: false })).toBeTruthy();
  expect(screen.getByText('T−120 min')).toBeTruthy();
  expect(screen.getByRole('button', { name: 'Load live radar config' })).toBeTruthy();

  // Initial render must make no network call.
  expect(loadConfig).not.toHaveBeenCalled();
});

test('pressing loads the live config and shows flags plus the source line', async () => {
  const loadConfig = vi.fn(() =>
    of<RadarConfigData>({ layer_lightning_enabled: true, layer_webcams_enabled: false }),
  );
  await render(App, { providers: [stubService(loadConfig)] });

  await userEvent.setup().press(screen.getByRole('button', { name: 'Load live radar config' }));

  expect(loadConfig).toHaveBeenCalledTimes(1);
  expect(screen.getByText('Lightning layer')).toBeTruthy();
  expect(screen.getByText(/HTTP 200, live GET/)).toBeTruthy();
});

test('a failing request drives the screen into an unavailable state', async () => {
  const loadConfig = vi.fn(() => throwError(() => new Error('no network available')));
  await render(App, { providers: [stubService(loadConfig)] });

  await userEvent.setup().press(screen.getByRole('button', { name: 'Load live radar config' }));

  expect(loadConfig).toHaveBeenCalledTimes(1);
  expect(screen.getByText('Live config unavailable (offline or blocked)')).toBeTruthy();
});
