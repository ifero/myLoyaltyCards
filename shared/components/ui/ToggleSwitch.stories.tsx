import type { Meta, StoryObj } from '@storybook/react-native-web-vite';

import { ToggleSwitch } from './ToggleSwitch';

const meta = {
  title: 'UI/ToggleSwitch',
  component: ToggleSwitch,
  args: {
    value: false,
    label: 'Enable notifications',
    onValueChange: () => {}
  }
} satisfies Meta<typeof ToggleSwitch>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Off: Story = { args: { value: false } };

export const On: Story = { args: { value: true } };

export const WithoutLabel: Story = { args: { value: true, label: undefined } };

export const Disabled: Story = { args: { value: true, disabled: true } };
