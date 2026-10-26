import AsyncStorage from '@react-native-async-storage/async-storage';

import type { SavedResult } from '@/types/facility';

const LAST_RESULT_KEY = 'healthfinder:last-result';

function isSavedResult(value: unknown): value is SavedResult {
  const record = value as SavedResult | null;
  return (
    !!record &&
    Array.isArray(record.facilities) &&
    typeof record.radiusKm === 'number' &&
    typeof record.savedAt === 'number' &&
    typeof record.position?.latitude === 'number' &&
    typeof record.position?.longitude === 'number'
  );
}

/** Saves the last search. Failures are ignored so storage problems never stop the app. */
export async function saveLastResult(result: SavedResult) {
  try {
    await AsyncStorage.setItem(LAST_RESULT_KEY, JSON.stringify(result));
  } catch {
    // Storage full or unavailable (e.g. some private windows): keep going without a cache.
  }
}

/** Loads the last saved search, or null if there is none or it cannot be read. */
export async function loadLastResult(): Promise<SavedResult | null> {
  try {
    const raw = await AsyncStorage.getItem(LAST_RESULT_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    return isSavedResult(parsed) ? parsed : null;
  } catch {
    return null;
  }
}
