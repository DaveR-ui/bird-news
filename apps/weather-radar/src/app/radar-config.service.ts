import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { catchError, throwError, type Observable } from 'rxjs';

/**
 * The radar-layer feature config the vendor publishes publicly. Every field is optional and
 * unknown-tolerant: the endpoint is feature-flagged and may add or drop keys at any time.
 */
export interface RadarConfigData {
  slow_live_mode?: boolean;
  non_aggressive_caching?: boolean;
  api_versions?: string[];
  layer_lightning_enabled?: boolean;
  layer_lightning_realtime_overlay_enabled?: boolean;
  layer_webcams_enabled?: boolean;
  ppt_enabled?: boolean;
  ab_test_key?: string | null;
  ab_test_percentage?: number;
  monitoring_staged_rollout_percentage?: number;
  only_get_route_metadata?: boolean;
  layer_temperature_enabled?: boolean;
  layer_gust_enabled?: boolean;
  freezing_rain_legend?: boolean;
  disable_zl_10?: boolean;
  layer_lightning_pwa_enabled?: boolean;
  layer_lightning_android_ios_enabled?: boolean;
}

/**
 * Reads the radar feature config over a single, parameterless, unauthenticated GET.
 *
 * Read-only by construction: no request body, no cookies, no Authorization header, no device
 * identifier, no query parameters, and no other host is ever touched.
 */
@Injectable({ providedIn: 'root' })
export class RadarConfigService {
  /** Public unauthenticated GET, verified HTTP 200, zero parameters. */
  private readonly CONFIG_URL = 'https://radar.wo-cloud.com/config/config.json';

  private readonly http = inject(HttpClient);

  /**
   * Fetch the live radar config. This is the only network call the app makes. Failures surface on
   * the Observable's error channel (an `HttpErrorResponse`) so the caller can render an
   * "unavailable" state rather than a silent blank.
   */
  loadConfig(): Observable<RadarConfigData> {
    return this.http.get<RadarConfigData>(this.CONFIG_URL).pipe(
      catchError((error: unknown) => throwError(() => error)),
    );
  }
}
