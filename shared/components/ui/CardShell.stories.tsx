import type { Meta, StoryObj } from '@storybook/react-native-web-vite';

import { CardShell } from './CardShell';

const meta = {
  title: 'UI/CardShell',
  component: CardShell,
  args: {
    type: 'catalogue',
    size: 'grid',
    cardName: 'ACME',
    brandColor: '#1A73E8'
  }
} satisfies Meta<typeof CardShell>;

export default meta;

type Story = StoryObj<typeof meta>;

export const CatalogueGrid: Story = { args: { type: 'catalogue', size: 'grid' } };

export const CatalogueHero: Story = { args: { type: 'catalogue', size: 'hero' } };

export const CustomGrid: Story = {
  args: { type: 'custom', size: 'grid', cardName: 'Nero', brandColor: '#000000' }
};

export const CustomHero: Story = {
  args: { type: 'custom', size: 'hero', cardName: 'Rossi', brandColor: '#E2231A' }
};
