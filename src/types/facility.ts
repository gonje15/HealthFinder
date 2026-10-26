export type FacilityType = 'hospital' | 'clinic' | 'pharmacy';

export type Coords = {
  latitude: number;
  longitude: number;
};

export type Facility = {
  /** OpenStreetMap element id, e.g. "node/123". */
  id: string;
  name: string;
  type: FacilityType;
  latitude: number;
  longitude: number;
  distanceKm: number;
  address?: string;
  phone?: string;
  openingHours?: string;
};

/** The last successful search, as saved on the device. */
export type SavedResult = {
  facilities: Facility[];
  position: Coords;
  radiusKm: number;
  savedAt: number;
};

export const FacilityTypeLabels: Record<FacilityType, string> = {
  hospital: 'Hospital',
  clinic: 'Clinic',
  pharmacy: 'Pharmacy',
};
