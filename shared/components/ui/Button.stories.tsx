import type { Meta, StoryObj } from '@storybook/react-native-web-vite';

import { Button } from './Button';

const meta = {
  title: 'UI/Button',
  component: Button,
  args: {
    variant: 'primary',
    children: 'Button',
    onPress: () => {}
  }
} satisfies Meta<typeof Button>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Primary: Story = { args: { variant: 'primary', children: 'Save' } };

export const Secondary: Story = { args: { variant: 'secondary', children: 'Cancel' } };

export const Tertiary: Story = { args: { variant: 'tertiary', children: 'Learn more' } };

export const Destructive: Story = { args: { variant: 'destructive', children: 'Delete card' } };

export const Loading: Story = { args: { variant: 'primary', loading: true, children: 'Saving' } };

export const Disabled: Story = {
  args: { variant: 'primary', disabled: true, children: 'Unavailable' }
};

export const Large: Story = { args: { variant: 'primary', size: 'large', children: 'Continue' } };
