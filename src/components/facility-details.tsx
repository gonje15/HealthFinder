import { Linking, Modal, Pressable, StyleSheet, View } from 'react-native';

import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { FacilityTypeLabels, type Facility } from '@/types/facility';

import { formatDistance } from './facility-card';
import { ThemedText } from './themed-text';

type FacilityDetailsProps = {
  facility: Facility | null;
  onClose: () => void;
};

function directionsUrl({ latitude, longitude }: Facility) {
  return `https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}`;
}

function DetailRow({ label, value }: { label: string; value?: string }) {
  return (
    <View style={styles.row}>
      <ThemedText type="small" themeColor="textSecondary" style={styles.rowLabel}>
        {label}
      </ThemedText>
      <ThemedText type="small" style={styles.rowValue}>
        {value ?? 'Not listed'}
      </ThemedText>
    </View>
  );
}

/** Pop-up with a facility's details and Call / Get directions actions. */
export function FacilityDetails({ facility, onClose }: FacilityDetailsProps) {
  const theme = useTheme();

  return (
    <Modal visible={facility !== null} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel="Close details">
        {facility && (
          <Pressable
            // Stops taps inside the sheet from closing it.
            onPress={() => {}}
            accessibilityViewIsModal
            style={[styles.sheet, { backgroundColor: theme.background, borderColor: theme.border }]}>
            <View style={styles.header}>
              <View style={styles.headerText}>
                <ThemedText type="small" style={{ color: theme[facility.type] }}>
                  {FacilityTypeLabels[facility.type]} · {formatDistance(facility.distanceKm)} away
                </ThemedText>
                <ThemedText style={styles.title} accessibilityRole="header">
                  {facility.name}
                </ThemedText>
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Close"
                onPress={onClose}
                style={({ pressed }) => [
                  styles.close,
                  { backgroundColor: theme.backgroundElement },
                  pressed && styles.pressed,
                ]}>
                <ThemedText type="smallBold">✕</ThemedText>
              </Pressable>
            </View>

            <View style={styles.rows}>
              <DetailRow label="Type" value={FacilityTypeLabels[facility.type]} />
              <DetailRow label="Address" value={facility.address} />
              <DetailRow label="Phone" value={facility.phone} />
              <DetailRow label="Opening hours" value={facility.openingHours} />
            </View>

            <View style={styles.actions}>
              {facility.phone && (
                <Pressable
                  accessibilityRole="button"
                  onPress={() => Linking.openURL(`tel:${facility.phone!.replace(/[^\d+]/g, '')}`)}
                  style={({ pressed }) => [styles.action, { backgroundColor: theme.tint }, pressed && styles.pressed]}>
                  <ThemedText type="smallBold" style={{ color: theme.onTint }}>
                    Call
                  </ThemedText>
                </Pressable>
              )}
              <Pressable
                accessibilityRole="link"
                onPress={() => Linking.openURL(directionsUrl(facility))}
                style={({ pressed }) => [
                  styles.action,
                  facility.phone
                    ? { borderWidth: 1, borderColor: theme.tint }
                    : { backgroundColor: theme.tint },
                  pressed && styles.pressed,
                ]}>
                <ThemedText type="smallBold" style={{ color: facility.phone ? theme.tint : theme.onTint }}>
                  Get directions
                </ThemedText>
              </Pressable>
            </View>
          </Pressable>
        )}
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.three,
  },
  sheet: {
    width: '100%',
    maxWidth: 480,
    borderRadius: Spacing.four,
    borderWidth: 1,
    padding: Spacing.four,
    gap: Spacing.four,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.three,
  },
  headerText: {
    flex: 1,
    gap: Spacing.one,
  },
  title: {
    fontSize: 22,
    lineHeight: 28,
    fontWeight: 700,
  },
  close: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rows: {
    gap: Spacing.two,
  },
  row: {
    flexDirection: 'row',
    gap: Spacing.three,
  },
  rowLabel: {
    width: 110,
  },
  rowValue: {
    flex: 1,
  },
  actions: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  action: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: Spacing.two + Spacing.one,
    borderRadius: Spacing.three,
  },
  pressed: {
    opacity: 0.7,
  },
});
