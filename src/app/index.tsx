import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ChipGroup, type ChipOption } from '@/components/chip-group';
import { FacilityCard } from '@/components/facility-card';
import { FacilityDetails } from '@/components/facility-details';
import { FacilityMap } from '@/components/facility-map';
import { NoticeBanner } from '@/components/notice-banner';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { RadiusOptionsKm } from '@/constants/config';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { formatSavedAt, useFacilities } from '@/hooks/use-facilities';
import { useTheme } from '@/hooks/use-theme';
import type { Facility, FacilityType } from '@/types/facility';

type TypeFilter = 'all' | FacilityType;
type ViewMode = 'list' | 'map';

const RADIUS_OPTIONS: ChipOption<number>[] = RadiusOptionsKm.map((km) => ({ value: km, label: `${km} km` }));

const TYPE_OPTIONS: ChipOption<TypeFilter>[] = [
  { value: 'all', label: 'All' },
  { value: 'hospital', label: 'Hospitals' },
  { value: 'clinic', label: 'Clinics' },
  { value: 'pharmacy', label: 'Pharmacies' },
];

const VIEW_OPTIONS: ChipOption<ViewMode>[] = [
  { value: 'list', label: 'List' },
  { value: 'map', label: 'Map' },
];

export default function HomeScreen() {
  const theme = useTheme();
  const {
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
  } = useFacilities();
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all');
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [selected, setSelected] = useState<Facility | null>(null);

  const busy = status !== 'idle';
  const visible = typeFilter === 'all' ? facilities : facilities.filter((f) => f.type === typeFilter);
  const hasResults = savedAt !== null;
  const radiusOptions = RADIUS_OPTIONS.some((option) => option.value === radiusKm)
    ? RADIUS_OPTIONS
    : [...RADIUS_OPTIONS, { value: radiusKm, label: `${radiusKm} km` }].sort((a, b) => a.value - b.value);

  const buttonLabel =
    status === 'locating' ? 'Finding your location…' : status === 'loading' ? 'Searching nearby…' : 'Find facilities near me';

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <View style={styles.header}>
            <ThemedText style={styles.title} accessibilityRole="header">
              HealthFinder
            </ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              Hospitals, clinics and pharmacies near you, from OpenStreetMap. Your last search is saved for
              offline use.
            </ThemedText>
          </View>

          <Pressable
            accessibilityRole="button"
            accessibilityState={{ busy, disabled: busy }}
            disabled={busy}
            onPress={() => search()}
            style={({ pressed }) => [
              styles.searchButton,
              { backgroundColor: theme.tint },
              (pressed || busy) && styles.pressed,
            ]}>
            {busy && <ActivityIndicator color={theme.onTint} />}
            <ThemedText style={[styles.searchLabel, { color: theme.onTint }]}>{buttonLabel}</ThemedText>
          </Pressable>

          <View style={styles.controls}>
            <ControlRow label="Radius">
              <ChipGroup
                label="Search radius"
                options={radiusOptions}
                selected={radiusKm}
                onSelect={changeRadius}
                disabled={busy}
              />
            </ControlRow>
            <ControlRow label="Type">
              <ChipGroup label="Facility type" options={TYPE_OPTIONS} selected={typeFilter} onSelect={setTypeFilter} />
            </ControlRow>
            <ControlRow label="View">
              <ChipGroup label="View" options={VIEW_OPTIONS} selected={viewMode} onSelect={setViewMode} />
            </ControlRow>
          </View>

          {notice && <NoticeBanner notice={notice} onRetry={() => search()} retryDisabled={busy} />}

          {hasResults && (
            <View style={styles.summary}>
              <ThemedText type="smallBold" accessibilityLiveRegion="polite">
                {visible.length} {visible.length === 1 ? 'facility' : 'facilities'} within {radiusKm} km
              </ThemedText>
              {fromCache && savedAt !== null && (
                <ThemedText type="small" themeColor="textSecondary">
                  Saved {formatSavedAt(savedAt)}
                </ThemedText>
              )}
            </View>
          )}

          {viewMode === 'map' ? (
            <FacilityMap facilities={visible} position={position} onSelect={setSelected} />
          ) : (
            <View style={styles.list}>
              {visible.map((facility) => (
                <FacilityCard key={facility.id} facility={facility} onPress={setSelected} />
              ))}
            </View>
          )}

          {hasLoadedCache && !busy && !(notice && !hasResults) && (
            <EmptyState hasResults={hasResults} isEmpty={visible.length === 0} typeFilter={typeFilter} />
          )}
        </ScrollView>
      </SafeAreaView>

      <FacilityDetails facility={selected} onClose={() => setSelected(null)} />
    </ThemedView>
  );
}

function ControlRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={styles.controlRow}>
      <ThemedText type="small" themeColor="textSecondary" style={styles.controlLabel}>
        {label}
      </ThemedText>
      <View style={styles.controlBody}>{children}</View>
    </View>
  );
}

function EmptyState({
  hasResults,
  isEmpty,
  typeFilter,
}: {
  hasResults: boolean;
  isEmpty: boolean;
  typeFilter: TypeFilter;
}) {
  if (!hasResults) {
    return (
      <ThemedText type="small" themeColor="textSecondary" style={styles.empty}>
        Tap Find facilities near me to search around your current location.
      </ThemedText>
    );
  }
  if (!isEmpty) return null;
  return (
    <ThemedText type="small" themeColor="textSecondary" style={styles.empty}>
      {typeFilter === 'all'
        ? 'No health facilities found in this area. Try a larger radius.'
        : 'None of this type nearby. Try another type or a larger radius.'}
    </ThemedText>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  content: {
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    padding: Spacing.three,
    paddingBottom: Spacing.six,
    gap: Spacing.three,
  },
  header: {
    gap: Spacing.one,
    paddingTop: Spacing.two,
  },
  title: {
    fontSize: 32,
    lineHeight: 40,
    fontWeight: 700,
  },
  searchButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
    paddingVertical: Spacing.three,
    borderRadius: Spacing.three,
  },
  searchLabel: {
    fontWeight: 700,
  },
  pressed: {
    opacity: 0.75,
  },
  controls: {
    gap: Spacing.two,
  },
  controlRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  controlLabel: {
    width: 52,
  },
  controlBody: {
    flex: 1,
  },
  summary: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: Spacing.two,
  },
  list: {
    gap: Spacing.two,
  },
  empty: {
    textAlign: 'center',
    paddingVertical: Spacing.four,
  },
});
