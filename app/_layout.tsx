import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

const RootLayout = () => {
  return (
    <>
      <Stack>
        <Stack.Screen name="index" options={{ title: 'myLoyaltyCards' }} />
      </Stack>
      <StatusBar style="auto" />
    </>
  );
};

export default RootLayout;
