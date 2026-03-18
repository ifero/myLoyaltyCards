/**
 * Thin wrapper around Linking.getInitialURL() for testability.
 * React Native's auto-mocked Linking is tricky to spy on in Jest,
 * so this module provides a stable mock surface.
 */

import { Linking } from 'react-native';

export const getInitialURL = (): Promise<string | null> => Linking.getInitialURL();
