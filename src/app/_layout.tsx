import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import { Platform, useColorScheme } from 'react-native';

// Lets the web app open offline after the first visit (see public/sw.js). Skipped in
// development so cached files never hide code changes.
if (Platform.OS === 'web' && !__DEV__ && typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js').catch(() => {
    // Not supported or blocked (e.g. some private windows): the app works without it.
  });
}

export default function RootLayout() {
  const colorScheme = useColorScheme();
  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack screenOptions={{ headerShown: false, title: 'HealthFinder' }} />
    </ThemeProvider>
  );
}
