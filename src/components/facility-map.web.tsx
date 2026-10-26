import 'leaflet/dist/leaflet.css';

import L from 'leaflet';
import { useEffect, useRef } from 'react';
import { StyleSheet, View } from 'react-native';

import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { FacilityTypeLabels, type FacilityType } from '@/types/facility';

import type { FacilityMapProps } from './facility-map';

const TYPE_LETTERS: Record<FacilityType, string> = { hospital: 'H', clinic: 'C', pharmacy: 'P' };

function pinIcon(letter: string, color: string) {
  return L.divIcon({
    className: 'hf-pin',
    html: `<div style="width:28px;height:28px;border-radius:50%;background:${color};color:#fff;border:2px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,.4);display:flex;align-items:center;justify-content:center;font:700 13px/1 system-ui,sans-serif">${letter}</div>`,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
  });
}

const userIcon = L.divIcon({
  className: 'hf-user',
  html: '<div style="width:18px;height:18px;border-radius:50%;background:#2F6FD9;border:3px solid #fff;box-shadow:0 0 0 4px rgba(47,111,217,.3)"></div>',
  iconSize: [18, 18],
  iconAnchor: [9, 9],
});

/** Leaflet map with OpenStreetMap tiles: one marker for the user and one per facility. */
export function FacilityMap({ facilities, position, onSelect }: FacilityMapProps) {
  const theme = useTheme();
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const layerRef = useRef<L.LayerGroup | null>(null);
  const onSelectRef = useRef(onSelect);

  useEffect(() => {
    onSelectRef.current = onSelect;
  }, [onSelect]);

  useEffect(() => {
    if (!containerRef.current) return;
    // Wheel zoom is off so scrolling the page past the map doesn't zoom it; use +/- or pinch.
    const map = L.map(containerRef.current, { zoomControl: true, scrollWheelZoom: false });
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(map);
    mapRef.current = map;
    layerRef.current = L.layerGroup().addTo(map);
    // Leaflet measures its container once; re-measure whenever the layout changes it.
    const observer = new ResizeObserver(() => map.invalidateSize());
    observer.observe(containerRef.current);
    return () => {
      observer.disconnect();
      map.remove();
      mapRef.current = null;
      layerRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    const layer = layerRef.current;
    if (!map || !layer) return;
    map.invalidateSize();
    layer.clearLayers();

    const points: L.LatLngExpression[] = [];
    if (position) {
      const latLng: L.LatLngExpression = [position.latitude, position.longitude];
      L.marker(latLng, { icon: userIcon, title: 'Your location', zIndexOffset: 1000 }).addTo(layer);
      points.push(latLng);
    }

    for (const facility of facilities) {
      const latLng: L.LatLngExpression = [facility.latitude, facility.longitude];
      L.marker(latLng, {
        icon: pinIcon(TYPE_LETTERS[facility.type], theme[facility.type]),
        title: `${facility.name} (${FacilityTypeLabels[facility.type]})`,
        alt: facility.name,
        keyboard: true,
      })
        .on('click', () => onSelectRef.current(facility))
        .addTo(layer);
      points.push(latLng);
    }

    if (points.length > 1) {
      map.fitBounds(L.latLngBounds(points), { padding: [32, 32], maxZoom: 16 });
    } else if (points.length === 1) {
      map.setView(points[0], 15);
    } else {
      map.setView([0, 20], 2);
    }
  }, [facilities, position, theme]);

  return (
    <View style={[styles.container, { borderColor: theme.border }]}>
      <div ref={containerRef} style={{ width: '100%', height: '100%' }} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: 480,
    borderRadius: Spacing.three,
    borderWidth: 1,
    overflow: 'hidden',
  },
});
