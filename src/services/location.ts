import * as Location from 'expo-location';

import type { Coords } from '@/types/facility';

const LOCATION_TIMEOUT_MS = 15000;

export type LocationErrorReason = 'denied' | 'unavailable';

export class LocationError extends Error {
  constructor(
    message: string,
    readonly reason: LocationErrorReason,
  ) {
    super(message);
    this.name = 'LocationError';
  }
}

function withTimeout<T>(promise: Promise<T>, ms: number) {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Location lookup timed out')), ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        clearTimeout(timer);
        reject(error);
      },
    );
  });
}

/**
 * Asks for foreground location permission and reads the current position.
 * Uses balanced accuracy to save battery. Throws a LocationError with a message
 * that can be shown to the user as-is.
 */
export async function getCurrentPosition(): Promise<Coords> {
  let granted = false;
  try {
    const { status } = await Location.requestForegroundPermissionsAsync();
    granted = status === 'granted';
  } catch {
    granted = false;
  }

  if (!granted) {
    throw new LocationError(
      'HealthFinder needs your location to find hospitals, clinics and pharmacies near you. ' +
        'Allow location access for this site in your browser or phone settings, then try again.',
      'denied',
    );
  }

  try {
    const position = await withTimeout(
      Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }),
      LOCATION_TIMEOUT_MS,
    );
    return { latitude: position.coords.latitude, longitude: position.coords.longitude };
  } catch {
    throw new LocationError(
      'We could not find your location. Check that location services are on, then try again.',
      'unavailable',
    );
  }
}
