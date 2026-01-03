import '../global.css';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

import { ThemeProvider, useTheme } from '@/shared/theme';

const RootLayoutContent = () => {
  const { isDark, theme } = useTheme();

  return (
    <>
      <Stack
        screenOptions={{
          headerStyle: {
            backgroundColor: theme.surface,
          },
          headerTintColor: theme.textPrimary,
          contentStyle: {
            backgroundColor: theme.background,
          },
        }}
      >
        <Stack.Screen name="index" options={{ title: 'myLoyaltyCards' }} />
      </Stack>
      <StatusBar style={isDark ? 'light' : 'dark'} />
    </>
  );
};

const RootLayout = () => {
  return (
    <ThemeProvider>
      <RootLayoutContent />
    </ThemeProvider>
  );
};

export default RootLayout;
