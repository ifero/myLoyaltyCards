import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { View } from 'react-native';

import { BottomSheet } from './BottomSheet';
import { Button } from './Button';

const meta = {
  title: 'UI/BottomSheet',
  component: BottomSheet,
  // The sheet slides in with Reanimated, which Chromatic cannot pause the way it pauses CSS. Under
  // reduced motion the sheet simply appears, so every snapshot is of the settled sheet.
  parameters: { chromatic: { prefersReducedMotion: 'reduce' } },
  args: {
    visible: true,
    title: 'Sort cards',
    description: 'Choose how your cards are ordered.',
    onClose: () => {},
    children: (
      <Button variant="primary" onPress={() => {}}>
        Got it
      </Button>
    )
  }
} satisfies Meta<typeof BottomSheet>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Open: Story = {};

export const TitleOnly: Story = { args: { description: undefined } };

/**
 * The confirm shape as the design system draws it (`cardi-design-system.md` _Sheets_): the
 * destructive action is the borderless label, ABOVE the bordered Cancel. This is the TARGET, not a
 * picture of the app today: the shipped sign-out and delete-account sheets still put Cancel first
 * (Story 13.6's inverted order) until Story 22.7 rebuilds them.
 */
export const ConfirmDestructive: Story = {
  args: {
    title: 'Sign Out?',
    description: 'You will return to guest mode. Your cards will remain on this device.',
    children: (
      <View style={{ gap: 8 }}>
        <Button variant="destructive" size="large" onPress={() => {}}>
          Sign Out
        </Button>
        <Button variant="secondary" size="large" onPress={() => {}}>
          Cancel
        </Button>
      </View>
    )
  }
};
