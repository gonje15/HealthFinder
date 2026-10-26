import { Pressable, StyleSheet, View } from 'react-native';

import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { FacilityTypeLabels, type Facility } from '@/types/facility';

import { ThemedText } from './themed-text';

export function formatDistance(km: number) {
  return km < 1 ? `${Math.round(km * 1000)} m` : `${km.toFixed(1)} km`;
}

type FacilityCardProps = {
  facility: Facility;
  onPress: (facility: Facility) => void;
};

export function FacilityCard({ facility, onPress }: FacilityCardProps) {
  const theme = useTheme();
  const typeColor = theme[facility.type];

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${facility.name}, ${FacilityTypeLabels[facility.type]}, ${formatDistance(facility.distanceKm)} away`}
      onPress={() => onPress(facility)}
      style={({ pressed }) => [
        styles.card,
        { backgroundColor: theme.backgroundElement, borderLeftColor: typeColor },
        pressed && styles.pressed,
      ]}>
      <View style={styles.main}>
        <ThemedText type="smallBold" numberOfLines={2} style={styles.name}>
          {facility.name}
        </ThemedText>
        <ThemedText type="small" style={{ color: typeColor }}>
          {FacilityTypeLabels[facility.type]}
        </ThemedText>
        {facility.address && (
          <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
            {facility.address}
          </ThemedText>
        )}
      </View>
      <ThemedText type="smallBold" themeColor="textSecondary">
        {formatDistance(facility.distanceKm)}
      </ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    paddingVertical: Spacing.three,
    paddingHorizontal: Spacing.three,
    borderRadius: Spacing.three,
    borderLeftWidth: 4,
  },
  main: {
    flex: 1,
    gap: Spacing.half,
  },
  name: {
    fontSize: 16,
    lineHeight: 22,
  },
  pressed: {
    opacity: 0.7,
  },
});
