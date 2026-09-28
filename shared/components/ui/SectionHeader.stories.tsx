import type { Meta, StoryObj } from '@storybook/react-native-web-vite';

import { SectionHeader } from './SectionHeader';

const meta = {
  title: 'UI/SectionHeader',
  component: SectionHeader,
  args: {
    title: 'Preferences'
  }
} satisfies Meta<typeof SectionHeader>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const LongTitle: Story = { args: { title: 'Popular cards near you' } };
