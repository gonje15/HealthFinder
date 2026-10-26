import { Config } from '@/constants/config';
import { FacilityTypeLabels, type Coords, type Facility, type FacilityType } from '@/types/facility';

const FACILITY_TYPES: FacilityType[] = ['hospital', 'clinic', 'pharmacy'];
// Primary-care places mapped under other tags (common for rural health posts) count as clinics.
const CLINIC_AMENITIES = ['doctors', 'health_post'];
const CLINIC_HEALTHCARE = ['doctor', 'health_post', 'centre'];

export type OverpassElement = {
  type: 'node' | 'way' | 'relation';
  id: number;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: Record<string, string>;
};

export class NetworkError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'NetworkError';
  }
}

function buildQuery({ latitude, longitude }: Coords, radiusKm: number) {
  const around = `around:${Math.round(radiusKm * 1000)},${latitude},${longitude}`;
  const amenities = [...FACILITY_TYPES, ...CLINIC_AMENITIES].join('|');
  const healthcare = [...FACILITY_TYPES, ...CLINIC_HEALTHCARE].join('|');
  return `[out:json][timeout:25];
(
  nwr["amenity"~"^(${amenities})$"](${around});
  nwr["healthcare"~"^(${healthcare})$"](${around});
);
out center tags;`;
}

/** Great-circle distance between two points, in kilometres. */
export function distanceKm(a: Coords, b: Coords) {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b.latitude - a.latitude);
  const dLon = toRad(b.longitude - a.longitude);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.latitude)) * Math.cos(toRad(b.latitude)) * Math.sin(dLon / 2) ** 2;
  return 6371 * 2 * Math.asin(Math.sqrt(h));
}

function facilityType(tags: Record<string, string>): FacilityType | undefined {
  const type =
    FACILITY_TYPES.find((t) => tags.amenity === t) ?? FACILITY_TYPES.find((t) => tags.healthcare === t);
  if (type) return type;
  if (CLINIC_AMENITIES.includes(tags.amenity) || CLINIC_HEALTHCARE.includes(tags.healthcare)) return 'clinic';
  return undefined;
}

function firstValue(value: string | undefined) {
  const first = value?.split(';')[0]?.trim();
  return first ? first : undefined;
}

function buildAddress(tags: Record<string, string>) {
  if (tags['addr:full']) return tags['addr:full'];
  const street = [tags['addr:housenumber'], tags['addr:street']].filter(Boolean).join(' ');
  const parts = [
    street,
    tags['addr:suburb'],
    tags['addr:city'] ?? tags['addr:town'] ?? tags['addr:village'],
  ].filter(Boolean);
  return parts.length > 0 ? parts.join(', ') : undefined;
}

/** Turns raw Overpass elements into clean facilities, nearest first. */
export function toFacilities(elements: OverpassElement[], origin: Coords): Facility[] {
  const seen = new Set<string>();
  const facilities: Facility[] = [];

  for (const element of elements) {
    const tags = element.tags ?? {};
    const type = facilityType(tags);
    const latitude = element.lat ?? element.center?.lat;
    const longitude = element.lon ?? element.center?.lon;
    const id = `${element.type}/${element.id}`;
    if (!type || latitude === undefined || longitude === undefined || seen.has(id)) continue;
    seen.add(id);

    const position = { latitude, longitude };
    facilities.push({
      id,
      type,
      latitude,
      longitude,
      name: tags.name?.trim() || tags['name:en']?.trim() || `Unnamed ${FacilityTypeLabels[type].toLowerCase()}`,
      distanceKm: distanceKm(origin, position),
      address: buildAddress(tags),
      phone: firstValue(tags.phone ?? tags['contact:phone'] ?? tags.mobile ?? tags['contact:mobile']),
      openingHours: tags.opening_hours?.trim() || undefined,
    });
  }

  return facilities.sort((a, b) => a.distanceKm - b.distanceKm);
}

async function fetchFromServer(url: string, query: string) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), Config.requestTimeoutMs);
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `data=${encodeURIComponent(query)}`,
      signal: controller.signal,
    });
    if (!response.ok) throw new Error(`Overpass responded with ${response.status}`);
    const json = (await response.json()) as { elements?: OverpassElement[] };
    return json.elements ?? [];
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Fetches hospitals, clinics and pharmacies within the radius. Each configured Overpass
 * server is tried in turn; a NetworkError is thrown if none of them answers.
 */
export async function fetchNearbyFacilities(position: Coords, radiusKm: number) {
  const query = buildQuery(position, radiusKm);
  for (const url of Config.overpassUrls) {
    try {
      const elements = await fetchFromServer(url, query);
      return toFacilities(elements, position);
    } catch {
      // Try the next server.
    }
  }
  throw new NetworkError('Could not reach the facility servers.');
}
