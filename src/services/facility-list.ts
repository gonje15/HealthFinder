import AsyncStorage from '@react-native-async-storage/async-storage';

import { Config } from '@/constants/config';
import type { Coords, Facility } from '@/types/facility';

import { toFacilities, type OverpassElement } from './overpass';

/**
 * The country-wide facility list shipped with the app (public/data, built by
 * scripts/export-facilities.mjs). Searching it happens on the device, so results are instant
 * and work offline once the list has been downloaded.
 */
export type FacilityList = {
  country: string;
  generatedAt: string;
  elements: OverpassElement[];
};

type LoadedList = FacilityList & {
  /** Area covered by the list, with a small margin. */
  bounds: { minLat: number; maxLat: number; minLon: number; maxLon: number };
};

const LIST_STORAGE_KEY = 'healthfinder:facility-list';
const FETCH_TIMEOUT_MS = 15000;
const BOUNDS_MARGIN_DEG = 0.1;

let current: LoadedList | null = null;
let loading: Promise<LoadedList | null> | null = null;

function isFacilityList(value: unknown): value is FacilityList {
  const list = value as FacilityList | null;
  return !!list && typeof list.generatedAt === 'string' && Array.isArray(list.elements) && list.elements.length > 0;
}

function withBounds(list: FacilityList): LoadedList {
  let minLat = Infinity;
  let maxLat = -Infinity;
  let minLon = Infinity;
  let maxLon = -Infinity;
  for (const { lat, lon } of list.elements) {
    if (lat === undefined || lon === undefined) continue;
    minLat = Math.min(minLat, lat);
    maxLat = Math.max(maxLat, lat);
    minLon = Math.min(minLon, lon);
    maxLon = Math.max(maxLon, lon);
  }
  const m = BOUNDS_MARGIN_DEG;
  return { ...list, bounds: { minLat: minLat - m, maxLat: maxLat + m, minLon: minLon - m, maxLon: maxLon + m } };
}

async function readStored(): Promise<FacilityList | null> {
  try {
    const raw = await AsyncStorage.getItem(LIST_STORAGE_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : null;
    return isFacilityList(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

async function fetchList(): Promise<FacilityList | null> {
  try {
    const response = await fetch(Config.facilityListUrl, { signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) });
    if (!response.ok) return null;
    const parsed: unknown = await response.json();
    return isFacilityList(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

async function store(list: FacilityList) {
  try {
    await AsyncStorage.setItem(LIST_STORAGE_KEY, JSON.stringify(list));
  } catch {
    // Storage full or unavailable: the list still works for this visit.
  }
}

async function load(): Promise<LoadedList | null> {
  const stored = await readStored();
  if (stored) {
    current = withBounds(stored);
    // Use the saved copy now; pick up a newer list in the background.
    fetchList().then((fresh) => {
      if (fresh && fresh.generatedAt !== stored.generatedAt) {
        current = withBounds(fresh);
        store(fresh);
      }
    });
    return current;
  }
  const fresh = await fetchList();
  if (!fresh) return null;
  current = withBounds(fresh);
  await store(fresh);
  return current;
}

/** Loads the list (saved copy first, then the network). Safe to call many times. */
export function loadFacilityList(): Promise<LoadedList | null> {
  if (current) return Promise.resolve(current);
  if (!loading) {
    loading = load().finally(() => {
      loading = null;
    });
  }
  return loading;
}

export type ListSearchResult = {
  facilities: Facility[];
  /** When the list was exported from OpenStreetMap. */
  updatedAt: string;
};

/**
 * Searches the on-device list. Returns null when the position is outside the area it covers,
 * the list is unavailable, or nothing in it is within the radius (so a live search can try).
 */
export async function searchFacilityList(position: Coords, radiusKm: number): Promise<ListSearchResult | null> {
  const list = await loadFacilityList();
  if (!list) return null;
  const { minLat, maxLat, minLon, maxLon } = list.bounds;
  const { latitude, longitude } = position;
  if (latitude < minLat || latitude > maxLat || longitude < minLon || longitude > maxLon) return null;

  // Cheap box filter before the exact distance (1 degree of latitude is about 111 km).
  const latDelta = radiusKm / 111;
  const lonDelta = radiusKm / (111 * Math.max(Math.cos((latitude * Math.PI) / 180), 0.01));
  const nearby = list.elements.filter(
    ({ lat, lon }) =>
      lat !== undefined &&
      lon !== undefined &&
      Math.abs(lat - latitude) <= latDelta &&
      Math.abs(lon - longitude) <= lonDelta,
  );
  const facilities = toFacilities(nearby, position).filter((facility) => facility.distanceKm <= radiusKm);
  return facilities.length > 0 ? { facilities, updatedAt: list.generatedAt } : null;
}
