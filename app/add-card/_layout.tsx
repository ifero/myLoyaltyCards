/**
 * Add Card Flow — Nested Layout
 * Story 13.4: Restyle Add Card Flow (T7)
 *
 * Nested Stack navigator for the add-card flow.
 * Each screen manages its own header, so we hide the Stack header.
 */

import { Stack } from 'expo-router';
import React from 'react';

import { useTheme } from '@/shared/theme';

const AddCardLayout = () => {
  const { theme } = useTheme();

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: theme.background },
        animation: 'slide_from_right'
      }}
    >
      <Stack.Screen name="index" />
      <Stack.Screen
        name="scan"
        options={{
          animation: 'slide_from_right'
        }}
      />
      <Stack.Screen
        name="setup"
        options={{
          animation: 'slide_from_right'
        }}
      />
    </Stack>
  );
};

export default AddCardLayout;
