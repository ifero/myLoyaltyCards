/**
 * FormatPicker Component Tests
 * Story 2.2: Add Card Manually - AC5
 */

import { render, screen } from '@testing-library/react-native';

import { FormatPicker } from './FormatPicker';

describe('FormatPicker', () => {
  const mockOnChange = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('renders the Barcode Format label', () => {
      render(<FormatPicker value="CODE128" onChange={mockOnChange} />);

      expect(screen.getByText('Barcode Format')).toBeTruthy();
    });

    it('renders the picker component', () => {
      render(
        <FormatPicker value="CODE128" onChange={mockOnChange} testID="format-picker-container" />
      );

      expect(screen.getByTestId('format-picker')).toBeTruthy();
    });

    it('displays the selected value', () => {
      render(<FormatPicker value="CODE128" onChange={mockOnChange} />);

      expect(screen.getByText('CODE128')).toBeTruthy();
    });
  });

  describe('Format Options', () => {
    it('includes Code 128 option', () => {
      render(<FormatPicker value="CODE128" onChange={mockOnChange} />);
      // The Picker is mocked, but we verify the component renders with CODE128
      expect(screen.getByText('CODE128')).toBeTruthy();
    });

    it('displays EAN13 when selected', () => {
      render(<FormatPicker value="EAN13" onChange={mockOnChange} />);
      expect(screen.getByText('EAN13')).toBeTruthy();
    });

    it('displays QR when selected', () => {
      render(<FormatPicker value="QR" onChange={mockOnChange} />);
      expect(screen.getByText('QR')).toBeTruthy();
    });
  });

  describe('testID prop', () => {
    it('applies testID to container when provided', () => {
      render(
        <FormatPicker value="CODE128" onChange={mockOnChange} testID="custom-format-picker" />
      );

      expect(screen.getByTestId('custom-format-picker')).toBeTruthy();
    });
  });
});
