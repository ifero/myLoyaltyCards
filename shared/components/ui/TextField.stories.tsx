import type { Meta, StoryObj } from '@storybook/react-native-web-vite';

import { TextField } from './TextField';

const meta = {
  title: 'UI/TextField',
  component: TextField,
  args: {
    label: 'Card name',
    value: '',
    placeholder: 'e.g. ACME Rewards',
    onChangeText: () => {}
  }
} satisfies Meta<typeof TextField>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Empty: Story = { args: { value: '' } };

export const Filled: Story = { args: { value: 'ACME Rewards' } };

export const WithError: Story = { args: { value: 'A', error: 'Card name is too short' } };

export const Disabled: Story = { args: { value: 'Locked field', disabled: true } };

export const Password: Story = {
  args: { label: 'Password', value: 'sup3rsecret', secureTextEntry: true }
};
