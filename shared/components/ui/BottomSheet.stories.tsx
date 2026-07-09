import type { Meta, StoryObj } from '@storybook/react-native-web-vite';

import { BottomSheet } from './BottomSheet';
import { Button } from './Button';

const meta = {
  title: 'UI/BottomSheet',
  component: BottomSheet,
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
