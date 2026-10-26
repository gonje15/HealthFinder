import { useCallback, useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';

import { Config } from '@/constants/config';
import { getCurrentPosition, LocationError } from '@/services/location';
import { fetchNearbyFacilities } from '@/services/overpass';
import { loadLastResult, saveLastResult } from '@/services/storage';
import type { Coords, Facility, SavedResult } from '@/types/facility';

export type SearchStatus = 'idle' | 'locating' | 'loading';

export type Notice =
  /** Location permission denied or the position could not be read. */
  | { kind: 'location'; message: string }
  /** No network: the saved results are shown instead. */
  | { kind: 'offline'; message: string }
  /** No network and nothing saved on this device yet. */
  | { kind: 'no-cache'; message: string };

function isKnownOffline() {
  return Platform.OS === 'web' && typeof navigator !== 'undefined' && navigator.onLine === false;
}

export function formatSavedAt(savedAt: number) {
  return new Date(savedAt).toLocaleString(undefined, {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/** On the web we can tell a missing connection apart from servers that are down or busy. */
function failureReason() {
  return isKnownOffline()
    ? 'No network available.'
    : 'Could not load new results: no connection, or the facility servers are busy.';
}

function offlineNotice(saved: SavedResult): Notice {
  return {
    kind: 'offline',
    message: `${failureReason()} Showing results saved ${formatSavedAt(saved.savedAt)}.`,
  };
}

function noCacheNotice(): Notice {
  return {
    kind: 'no-cache',
    message: `${failureReason()} There are no saved results yet. Check your connection and try again.`,
  };
}

/**
 * Runs the location → Overpass → cache steps for the home screen. Saved results are shown
 * straight away on start, and again whenever a fresh search fails.
 */
export function useFacilities() {
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [position, setPosition] = useState<Coords | null>(null);
  const [radiusKm, setRadiusKm] = useState<number>(Config.defaultRadiusKm);
  const [status, setStatus] = useState<SearchStatus>('idle');
  const [notice, setNotice] = useState<Notice | null>(null);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [fromCache, setFromCache] = useState(false);
  const [hasLoadedCache, setHasLoadedCache] = useState(false);

  // Position from a live lookup this session; reused when only the radius changes.
  const livePosition = useRef<Coords | null>(null);
  const requestId = useRef(0);

  const showSaved = useCallback((saved: SavedResult) => {
    setFacilities(saved.facilities);
    setPosition(saved.position);
    setRadiusKm(saved.radiusKm);
    setSavedAt(saved.savedAt);
    setFromCache(true);
  }, []);

  useEffect(() => {
    let cancelled = false;
    loadLastResult().then((saved) => {
      if (cancelled) return;
      if (saved) {
        showSaved(saved);
        if (isKnownOffline()) setNotice(offlineNotice(saved));
      }
      setHasLoadedCache(true);
    });
    return () => {
      cancelled = true;
    };
  }, [showSaved]);

  const search = useCallback(
    async (nextRadiusKm?: number) => {
      const id = ++requestId.current;
      const radius = nextRadiusKm ?? radiusKm;
      setRadiusKm(radius);
      setNotice(null);

      let position = livePosition.current;
      if (!position) {
        setStatus('locating');
        try {
          position = await getCurrentPosition();
          livePosition.current = position;
        } catch (error) {
          if (id !== requestId.current) return;
          const message =
            error instanceof LocationError ? error.message : 'We could not find your location. Try again.';
          setNotice({ kind: 'location', message });
          setStatus('idle');
          return;
        }
        if (id !== requestId.current) return;
      }

      setStatus('loading');
      try {
        if (isKnownOffline()) throw new Error('offline');
        const results = await fetchNearbyFacilities(position, radius);
        if (id !== requestId.current) return;
        const saved: SavedResult = { facilities: results, position, radiusKm: radius, savedAt: Date.now() };
        setFacilities(results);
        setPosition(position);
        setSavedAt(saved.savedAt);
        setFromCache(false);
        await saveLastResult(saved);
      } catch {
        const saved = await loadLastResult();
        if (id !== requestId.current) return;
        if (saved) {
          showSaved(saved);
          setNotice(offlineNotice(saved));
        } else {
          setNotice(noCacheNotice());
        }
      } finally {
        if (id === requestId.current) setStatus('idle');
      }
    },
    [radiusKm, showSaved],
  );

  /** Changes the radius, repeating the search if one has already run this session. */
  const changeRadius = useCallback(
    (nextRadiusKm: number) => {
      if (livePosition.current) {
        search(nextRadiusKm);
      } else {
        setRadiusKm(nextRadiusKm);
      }
    },
    [search],
  );

  return {
    facilities,
    position,
    radiusKm,
    status,
    notice,
    savedAt,
    fromCache,
    hasLoadedCache,
    search,
    changeRadius,
  };
}
