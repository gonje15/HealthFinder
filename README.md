# HealthFinder

Find the nearest hospitals, clinics and pharmacies, even with a weak or missing connection.
HealthFinder uses your device's location and OpenStreetMap data (via the Overpass API) to show
nearby health facilities on a map and in a distance-sorted list, with tap-to-call and directions.
The last search is saved on the device so it stays available offline.

CIS-MSD-321 Mobile Solutions Development. Built with React Native (Expo, Expo Router) and
deployed as a web app.

## Run it locally

Requires Node.js 20 or newer.

```bash
npm install
npm run web
```

Then open the URL Expo prints (usually http://localhost:8081). Location only works on
`localhost` or over HTTPS.

Other scripts:

| Script | What it does |
| --- | --- |
| `npm run web` | Start the dev server for the browser |
| `npm start` | Start the dev server (press `w` for web) |
| `npm run build:web` | Build the static web app into `dist/` |
| `npm run typecheck` | Type-check the project |
| `npm run lint` | Lint with Expo's ESLint config |

## Environment variables

All settings are optional; defaults are in [src/constants/config.ts](src/constants/config.ts).
Copy `.env.example` to `.env` to change them. Because they are `EXPO_PUBLIC_` variables they are
built into the web app and visible to users, so they must never hold secrets.

| Variable | Default | Meaning |
| --- | --- | --- |
| `EXPO_PUBLIC_OVERPASS_URLS` | `https://overpass-api.de/api/interpreter,https://overpass.private.coffee/api/interpreter` | Overpass servers, comma-separated, tried in order |
| `EXPO_PUBLIC_DEFAULT_RADIUS_KM` | `5` | Search radius on first load (km) |
| `EXPO_PUBLIC_REQUEST_TIMEOUT_MS` | `20000` | Time allowed per server before trying the next (ms) |

## Deploying to Vercel

`vercel.json` holds the settings: build command `npx expo export --platform web`, output
directory `dist`, and a rewrite so every path serves the app. Add the environment variables in
the Vercel project settings if you want to change the defaults.

## Project structure

```
src/
  app/                 Screens (Expo Router). One route: the home screen at /
    _layout.tsx
    index.tsx          Search, radius and type filters, list/map views, banners
  components/
    chip-group.tsx     Single-select chips (radius, type, view)
    facility-card.tsx  List item
    facility-details.tsx  Details pop-up with Call and Get directions
    facility-map.web.tsx  Leaflet + OpenStreetMap tiles (web)
    facility-map.tsx   Plain fallback for phones
    notice-banner.tsx  Error / offline messages with Try again
  hooks/
    use-facilities.ts  Runs the location → Overpass → cache steps
  services/
    location.ts        Foreground permission, balanced-accuracy position
    overpass.ts        Query, two-server fallback with timeout, clean-up, distance sort
    storage.ts         Saves / loads the last result (AsyncStorage → localStorage on web)
  constants/           Config (env vars) and theme
  types/               Facility types
```

## Requirements map

| Req | Where it is met |
| --- | --- |
| FR1 Location permission, explain and retry if denied | `services/location.ts`, `NoticeBanner` Try again |
| FR2 Hospitals, clinics, pharmacies within radius (default 5 km) | `services/overpass.ts`; radius chips 2 / 5 / 10 km reuse the position |
| FR3 Filter by type | Type chips on the home screen |
| FR4 Map and list | List / Map switch; `facility-map.web.tsx` |
| FR5 Saved results shown offline | `services/storage.ts`; loaded on start and when a search fails |
| FR6 Details, call and directions | `components/facility-details.tsx` (phone shows "Not listed" when missing) |
| NFR1 Cached results within 2 s offline | Cache read from local storage on start, before any network call |
| NFR2 Fresh results within 10 s, loading indicator | Spinner and status text on the search button |
| NFR3 No crash on network failure, clear message, cached results | Two Overpass servers with timeouts, then the offline banner with saved results |

## Data

Facility data © OpenStreetMap contributors, available under the Open Database License.
