import { Pressable, StyleSheet, View } from 'react-native';

import { Spacing } from '@/constants/theme';
import type { Notice } from '@/hooks/use-facilities';
import { useTheme } from '@/hooks/use-theme';

import { ThemedText } from './themed-text';

type NoticeBannerProps = {
  notice: Notice;
  onRetry: () => void;
  retryDisabled?: boolean;
};

/** Error and offline messages, each with a Try again action. */
export function NoticeBanner({ notice, onRetry, retryDisabled }: NoticeBannerProps) {
  const theme = useTheme();
  const isError = notice.kind === 'location';
  const background = isError ? theme.errorBackground : theme.warningBackground;
  const color = isError ? theme.errorText : theme.warningText;

  return (
    <View
      accessibilityRole="alert"
      accessibilityLiveRegion="polite"
      style={[styles.banner, { backgroundColor: background }]}>
      <ThemedText type="small" style={[styles.message, { color }]}>
        {notice.message}
      </ThemedText>
      <Pressable
        accessibilityRole="button"
        disabled={retryDisabled}
        onPress={onRetry}
        style={({ pressed }) => [styles.retry, { borderColor: color }, pressed && styles.pressed]}>
        <ThemedText type="smallBold" style={{ color }}>
          Try again
        </ThemedText>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: Spacing.two,
    padding: Spacing.three,
    borderRadius: Spacing.three,
  },
  message: {
    flex: 1,
    minWidth: 200,
  },
  retry: {
    paddingVertical: Spacing.one,
    paddingHorizontal: Spacing.three,
    borderRadius: 999,
    borderWidth: 1,
  },
  pressed: {
    opacity: 0.7,
  },
});
