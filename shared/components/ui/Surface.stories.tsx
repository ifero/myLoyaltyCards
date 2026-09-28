import type { Meta, StoryObj } from '@storybook/react-native-web-vite';

import { ActionRow } from './ActionRow';
import { Surface } from './Surface';

const row = (label: string, value?: string) => (
  <ActionRow
    key={label}
    variant="plain"
    showBottomBorder={false}
    label={label}
    value={value}
    onPress={() => {}}
  />
);

const meta = {
  title: 'UI/Surface',
  component: Surface,
  args: {
    children: row('Theme', 'System')
  }
} satisfies Meta<typeof Surface>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

/** The settings list: rows on one surface, split by full-width hairline rules. */
export const Divided: Story = {
  args: {
    divided: true,
    children: [row('Export Data', 'JSON'), row('Import Data'), row('Sync Now', 'Synced')]
  }
};
