import { Pressable, StyleSheet, View } from 'react-native';

import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

import { ThemedText } from './themed-text';

export type ChipOption<T> = { value: T; label: string };

type ChipGroupProps<T> = {
  label: string;
  options: readonly ChipOption<T>[];
  selected: T;
  onSelect: (value: T) => void;
  disabled?: boolean;
};

/** A row of single-select chips, used for the radius, type filter and view switch. */
export function ChipGroup<T extends string | number>({
  label,
  options,
  selected,
  onSelect,
  disabled,
}: ChipGroupProps<T>) {
  const theme = useTheme();

  return (
    <View style={styles.row} accessibilityRole="radiogroup" accessibilityLabel={label}>
      {options.map((option) => {
        const isSelected = option.value === selected;
        return (
          <Pressable
            key={String(option.value)}
            accessibilityRole="radio"
            accessibilityState={{ selected: isSelected, disabled }}
            disabled={disabled}
            onPress={() => onSelect(option.value)}
            style={({ pressed }) => [
              styles.chip,
              {
                backgroundColor: isSelected ? theme.tint : theme.backgroundElement,
                borderColor: isSelected ? theme.tint : theme.border,
              },
              pressed && styles.pressed,
              disabled && styles.disabled,
            ]}>
            <ThemedText type="smallBold" style={{ color: isSelected ? theme.onTint : theme.text }}>
              {option.label}
            </ThemedText>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  chip: {
    paddingVertical: Spacing.one + Spacing.half,
    paddingHorizontal: Spacing.three,
    borderRadius: 999,
    borderWidth: 1,
  },
  pressed: {
    opacity: 0.7,
  },
  disabled: {
    opacity: 0.5,
  },
});
