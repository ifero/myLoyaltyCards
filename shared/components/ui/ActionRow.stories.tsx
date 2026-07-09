import type { Meta, StoryObj } from '@storybook/react-native-web-vite';

import { ActionRow } from './ActionRow';

const meta = {
  title: 'UI/ActionRow',
  component: ActionRow,
  args: {
    label: 'Account',
    onPress: () => {}
  }
} satisfies Meta<typeof ActionRow>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = { args: { label: 'Account' } };

export const WithSubtitle: Story = {
  args: { label: 'Language', subtitle: 'Choose your preferred language' }
};

export const WithValue: Story = { args: { label: 'Language', value: 'English' } };

export const Destructive: Story = {
  args: { label: 'Delete account', destructive: true, showChevron: false }
};

export const Loading: Story = { args: { label: 'Syncing…', isLoading: true, showChevron: false } };

export const Plain: Story = { args: { label: 'About', variant: 'plain' } };
