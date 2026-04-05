/**
 * BrandPill Component Tests
 * Story 13.4: Restyle Add Card Flow (AC4)
 */

import { render, screen } from '@testing-library/react-native';

import { CatalogueBrand } from '@/catalogue/types';

import { BrandPill } from './BrandPill';

jest.mock('@/shared/theme/luminance', () => ({
  getContrastForeground: jest.fn(() => '#FFFFFF')
}));

const MockLogo = ({ width, height }: { width: number; height: number }) =>
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  require('react').createElement('View', { testID: 'pill-logo', style: { width, height } });

jest.mock('@/features/cards/utils/brandLogos', () => ({
  getBrandLogoComponent: jest.fn(() => MockLogo)
}));

const testBrand: CatalogueBrand = {
  id: 'esselunga',
  name: 'Esselunga',
  color: '#FF0000',
  logo: 'esselunga',
  aliases: []
};

describe('BrandPill', () => {
  it('renders brand name', () => {
    render(<BrandPill brand={testBrand} />);
    expect(screen.getByText('Esselunga')).toBeTruthy();
  });

  it('renders with default testID', () => {
    render(<BrandPill brand={testBrand} />);
    expect(screen.getByTestId('brand-pill')).toBeTruthy();
  });

  it('renders logo when available', () => {
    render(<BrandPill brand={testBrand} />);
    expect(screen.getByTestId('pill-logo')).toBeTruthy();
  });

  it('does not render logo when getBrandLogoComponent returns null', () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { getBrandLogoComponent } = require('@/features/cards/utils/brandLogos');
    (getBrandLogoComponent as jest.Mock).mockReturnValueOnce(undefined);

    render(<BrandPill brand={testBrand} />);
    expect(screen.queryByTestId('pill-logo')).toBeNull();
  });

  it('accepts custom testID', () => {
    render(<BrandPill brand={testBrand} testID="custom-pill" />);
    expect(screen.getByTestId('custom-pill')).toBeTruthy();
  });
});
