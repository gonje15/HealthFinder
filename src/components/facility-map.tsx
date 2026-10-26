import { StyleSheet, View } from 'react-native';

import { Spacing } from '@/constants/theme';
import type { Coords, Facility } from '@/types/facility';

import { ThemedText } from './themed-text';

export type FacilityMapProps = {
  facilities: Facility[];
  position: Coords | null;
  onSelect: (facility: Facility) => void;
};

/**
 * Fallback for phones. The interactive map is web-only (facility-map.web.tsx, using Leaflet),
 * because the hosted web build is the deliverable and react-native-maps does not run in browsers.
 */
export function FacilityMap(_props: FacilityMapProps) {
  return (
    <View style={styles.container}>
      <ThemedText type="small" themeColor="textSecondary" style={styles.text}>
        The map is available in the web version. Use the List view, or tap Get directions on a facility
        to open it in your maps app.
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: Spacing.four,
    alignItems: 'center',
  },
  text: {
    textAlign: 'center',
  },
});
