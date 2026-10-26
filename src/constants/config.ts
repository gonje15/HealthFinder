/**
 * Runtime settings. Each value can be overridden with an EXPO_PUBLIC_ environment variable
 * (see .env.example); the defaults below are used when a variable is missing or invalid.
 */

const DEFAULT_OVERPASS_URLS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.private.coffee/api/interpreter',
];

function parseUrls(value: string | undefined) {
  const urls = (value ?? '')
    .split(',')
    .map((url) => url.trim())
    .filter(Boolean);
  return urls.length > 0 ? urls : DEFAULT_OVERPASS_URLS;
}

function parsePositiveNumber(value: string | undefined, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

export const Config = {
  /** Overpass servers, tried in order until one answers. */
  overpassUrls: parseUrls(process.env.EXPO_PUBLIC_OVERPASS_URLS),
  /** Search radius used on first load, in kilometres. */
  defaultRadiusKm: parsePositiveNumber(process.env.EXPO_PUBLIC_DEFAULT_RADIUS_KM, 5),
  /** Time allowed for each Overpass server before trying the next, in milliseconds. */
  requestTimeoutMs: parsePositiveNumber(process.env.EXPO_PUBLIC_REQUEST_TIMEOUT_MS, 20000),
} as const;

export const RadiusOptionsKm = [2, 5, 10] as const;
