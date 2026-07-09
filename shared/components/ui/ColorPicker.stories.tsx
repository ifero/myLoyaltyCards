import type { Meta, StoryObj } from '@storybook/react-native-web-vite';

import { ColorPicker } from './ColorPicker';

const meta = {
  title: 'UI/ColorPicker',
  component: ColorPicker,
  args: {
    value: 'blue',
    onChange: () => {}
  }
} satisfies Meta<typeof ColorPicker>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Blue: Story = { args: { value: 'blue' } };

export const Green: Story = { args: { value: 'green' } };

export const Orange: Story = { args: { value: 'orange' } };

export const Red: Story = { args: { value: 'red' } };

export const Grey: Story = { args: { value: 'grey' } };
