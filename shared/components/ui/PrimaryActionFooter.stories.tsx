import type { Meta, StoryObj } from '@storybook/react-native-web-vite';

import { Button } from './Button';
import { PrimaryActionFooter } from './PrimaryActionFooter';

const meta = {
  title: 'UI/PrimaryActionFooter',
  component: PrimaryActionFooter,
  args: {
    children: (
      <Button variant="primary" size="large" onPress={() => {}}>
        Done
      </Button>
    )
  }
} satisfies Meta<typeof PrimaryActionFooter>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

/** Busy is not disabled: the fill stays, the label becomes a spinner. */
export const Busy: Story = {
  args: {
    children: (
      <Button variant="primary" size="large" loading onPress={() => {}}>
        Done
      </Button>
    )
  }
};

/** The wallet's empty state: the one footer drawn on the 16pt card-grid margin. */
export const GridMargin: Story = {
  args: {
    margin: 'grid',
    children: (
      <Button variant="primary" size="large" onPress={() => {}}>
        Add your first card
      </Button>
    )
  }
};
