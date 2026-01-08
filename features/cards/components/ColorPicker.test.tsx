/**
 * ColorPicker Component Tests
 * Story 2.2: Add Card Manually - AC6
 */

import { render, screen, fireEvent } from '@testing-library/react-native';

import { ColorPicker } from './ColorPicker';

describe('ColorPicker', () => {
  const mockOnChange = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('renders all 5 color options', () => {
      render(<ColorPicker value="grey" onChange={mockOnChange} />);

      expect(screen.getByTestId('color-option-blue')).toBeTruthy();
      expect(screen.getByTestId('color-option-red')).toBeTruthy();
      expect(screen.getByTestId('color-option-green')).toBeTruthy();
      expect(screen.getByTestId('color-option-orange')).toBeTruthy();
      expect(screen.getByTestId('color-option-grey')).toBeTruthy();
    });

    it('renders the "Card Color" label', () => {
      render(<ColorPicker value="grey" onChange={mockOnChange} />);

      expect(screen.getByText('Card Color')).toBeTruthy();
    });

    it('shows checkmark on selected color', () => {
      render(<ColorPicker value="blue" onChange={mockOnChange} />);

      const blueOption = screen.getByTestId('color-option-blue');
      expect(blueOption).toHaveTextContent('✓');
    });

    it('does not show checkmark on unselected colors', () => {
      render(<ColorPicker value="blue" onChange={mockOnChange} />);

      const redOption = screen.getByTestId('color-option-red');
      expect(redOption).not.toHaveTextContent('✓');
    });
  });

  describe('Selection', () => {
    it('calls onChange when a color is pressed', () => {
      render(<ColorPicker value="grey" onChange={mockOnChange} />);

      fireEvent.press(screen.getByTestId('color-option-blue'));

      expect(mockOnChange).toHaveBeenCalledWith('blue');
    });

    it('calls onChange with correct color for each option', () => {
      render(<ColorPicker value="grey" onChange={mockOnChange} />);

      fireEvent.press(screen.getByTestId('color-option-red'));
      expect(mockOnChange).toHaveBeenCalledWith('red');

      fireEvent.press(screen.getByTestId('color-option-green'));
      expect(mockOnChange).toHaveBeenCalledWith('green');

      fireEvent.press(screen.getByTestId('color-option-orange'));
      expect(mockOnChange).toHaveBeenCalledWith('orange');
    });

    it('allows selecting the currently selected color', () => {
      render(<ColorPicker value="blue" onChange={mockOnChange} />);

      fireEvent.press(screen.getByTestId('color-option-blue'));

      expect(mockOnChange).toHaveBeenCalledWith('blue');
    });
  });

  describe('Accessibility', () => {
    it('has accessible labels for each color option', () => {
      render(<ColorPicker value="grey" onChange={mockOnChange} />);

      expect(screen.getByLabelText('Blue color')).toBeTruthy();
      expect(screen.getByLabelText('Red color')).toBeTruthy();
      expect(screen.getByLabelText('Green color')).toBeTruthy();
      expect(screen.getByLabelText('Orange color')).toBeTruthy();
      expect(screen.getByLabelText(/Grey color/)).toBeTruthy();
    });

    it('indicates selected state in accessibility label', () => {
      render(<ColorPicker value="blue" onChange={mockOnChange} />);

      expect(screen.getByLabelText('Blue color, selected')).toBeTruthy();
    });

    it('has button accessibility role', () => {
      render(<ColorPicker value="grey" onChange={mockOnChange} />);

      const blueOption = screen.getByTestId('color-option-blue');
      expect(blueOption).toHaveProp('accessibilityRole', 'button');
    });
  });

  describe('testID prop', () => {
    it('applies testID to container when provided', () => {
      render(<ColorPicker value="grey" onChange={mockOnChange} testID="custom-color-picker" />);

      expect(screen.getByTestId('custom-color-picker')).toBeTruthy();
    });
  });
});
