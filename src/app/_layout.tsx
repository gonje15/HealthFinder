import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from "expo-router";
import { Platform, useColorScheme } from "react-native";

if (
  Platform.OS === "web" &&
  !__DEV__ &&
  typeof navigator !== "undefined" &&
  "serviceWorker" in navigator
) {
  navigator.serviceWorker.register("/sw.js").catch(() => {});
}

export default function RootLayout() {
  const colorScheme = useColorScheme();
  return (
    <ThemeProvider value={colorScheme === "dark" ? DarkTheme : DefaultTheme}>
      <Stack screenOptions={{ headerShown: false, title: "HealthFinder" }} />
    </ThemeProvider>
  );
}
