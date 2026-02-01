/**
 * CardForm Component Tests
 * Story 2.2: Add Card Manually - AC2, AC3, AC4, AC5, AC6
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';

import { CardForm } from './CardForm';

// Mock ThemeProvider and CARD_COLORS
jest.mock('@/shared/theme', () => ({
  useTheme: () => ({
    theme: {
      background: '#FAFAFA',
      surface: '#FFFFFF',
      textPrimary: '#1F2937',
      textSecondary: '#6B7280',
      primary: '#73A973',
      border: '#E5E7EB'
    },
    isDark: false
  }),
  CARD_COLORS: {
    blue: '#3B82F6',
    red: '#EF4444',
    green: '#22C55E',
    orange: '#F97316',
    grey: '#6B7280'
  }
}));

describe('CardForm', () => {
  const mockOnSubmit = jest.fn();
  const mockOnDirtyChange = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering - AC2', () => {
    it('renders all form fields', () => {
      render(<CardForm onSubmit={mockOnSubmit} submitLabel="Add Card" testID="card-form" />);

      expect(screen.getByTestId('card-name-input')).toBeTruthy();
      expect(screen.getByTestId('barcode-input')).toBeTruthy();
      expect(screen.getByTestId('format-display')).toBeTruthy(); // Format auto-detected, not picked
      expect(screen.getByTestId('color-picker-container')).toBeTruthy();
    });

    it('renders the submit button with correct label', () => {
      render(<CardForm onSubmit={mockOnSubmit} submitLabel="Add Card" />);

      expect(screen.getByText('Add Card')).toBeTruthy();
    });

    it('renders "Save" label when provided', () => {
      render(<CardForm onSubmit={mockOnSubmit} submitLabel="Save" />);

      expect(screen.getByText('Save')).toBeTruthy();
    });
  });

  describe('Card Name Validation - AC3', () => {
    it('shows character counter', () => {
      render(<CardForm onSubmit={mockOnSubmit} submitLabel="Add Card" />);

      expect(screen.getByText('0/50')).toBeTruthy();
    });

    it('updates character counter as user types', async () => {
      render(<CardForm onSubmit={mockOnSubmit} submitLabel="Add Card" />);

      const nameInput = screen.getByTestId('card-name-input');
      fireEvent.changeText(nameInput, 'Test Card');

      await waitFor(() => {
        expect(screen.getByText('9/50')).toBeTruthy();
      });
    });

    it('shows error when name is empty on blur', async () => {
      render(<CardForm onSubmit={mockOnSubmit} submitLabel="Add Card" />);

      const nameInput = screen.getByTestId('card-name-input');
      fireEvent.changeText(nameInput, '');
      fireEvent(nameInput, 'blur');

      await waitFor(() => {
        expect(screen.getByTestId('name-error')).toBeTruthy();
      });
    });

    it('limits name to 50 characters', () => {
      render(<CardForm onSubmit={mockOnSubmit} submitLabel="Add Card" />);

      const nameInput = screen.getByTestId('card-name-input');
      expect(nameInput.props.maxLength).toBe(50);
    });
  });

  describe('Barcode Input - AC4', () => {
    it('shows numeric keypad type', () => {
      render(<CardForm onSubmit={mockOnSubmit} submitLabel="Add Card" />);

      const barcodeInput = screen.getByTestId('barcode-input');
      expect(barcodeInput.props.keyboardType).toBe('number-pad');
    });

    it('shows error when barcode is empty', async () => {
      render(<CardForm onSubmit={mockOnSubmit} submitLabel="Add Card" />);

      const barcodeInput = screen.getByTestId('barcode-input');
      fireEvent.changeText(barcodeInput, '');
      fireEvent(barcodeInput, 'blur');

      await waitFor(() => {
        expect(screen.getByTestId('barcode-error')).toBeTruthy();
      });
    });
  });

  describe('Default Values', () => {
    it('uses CODE128 as default barcode format when empty', () => {
      render(<CardForm onSubmit={mockOnSubmit} submitLabel="Add Card" />);

      // Format is auto-detected - shows "Code 128 (Universal)" description when empty
      expect(screen.getByTestId('format-display')).toBeTruthy();
      expect(screen.getByText('Code 128 (Universal)')).toBeTruthy();
    });

    it('uses grey as default color', () => {
      render(<CardForm onSubmit={mockOnSubmit} submitLabel="Add Card" />);

      // Grey should be selected (has checkmark)
      const greyOption = screen.getByTestId('color-option-grey');
      expect(greyOption).toHaveTextContent('✓');
    });

    it('accepts custom default values', () => {
      render(
        <CardForm
          onSubmit={mockOnSubmit}
          submitLabel="Save"
          defaultValues={{
            name: 'Existing Card',
            barcode: '123456',
            barcodeFormat: 'EAN13',
            color: 'blue'
          }}
        />
      );

      expect(screen.getByDisplayValue('Existing Card')).toBeTruthy();
      expect(screen.getByDisplayValue('123456')).toBeTruthy();
    });
  });

  describe('Form Submission', () => {
    it('disables submit button when form is invalid', () => {
      render(<CardForm onSubmit={mockOnSubmit} submitLabel="Add Card" />);

      const submitButton = screen.getByTestId('save-button');
      expect(submitButton.props.accessibilityState.disabled).toBe(true);
    });

    it('enables submit button when form is valid', async () => {
      render(<CardForm onSubmit={mockOnSubmit} submitLabel="Add Card" />);

      const nameInput = screen.getByTestId('card-name-input');
      const barcodeInput = screen.getByTestId('barcode-input');

      fireEvent.changeText(nameInput, 'Test Card');
      fireEvent.changeText(barcodeInput, '1234567890');

      await waitFor(() => {
        const submitButton = screen.getByTestId('save-button');
        expect(submitButton.props.accessibilityState.disabled).toBe(false);
      });
    });

    it('calls onSubmit with form data when submitted', async () => {
      render(<CardForm onSubmit={mockOnSubmit} submitLabel="Add Card" />);

      const nameInput = screen.getByTestId('card-name-input');
      const barcodeInput = screen.getByTestId('barcode-input');

      fireEvent.changeText(nameInput, 'Test Card');
      fireEvent.changeText(barcodeInput, '1234567890');

      await waitFor(() => {
        const submitButton = screen.getByTestId('save-button');
        expect(submitButton.props.accessibilityState.disabled).toBe(false);
      });

      fireEvent.press(screen.getByTestId('save-button'));

      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalledWith({
          name: 'Test Card',
          barcode: '1234567890',
          barcodeFormat: 'CODE128', // Auto-detected: 10 digits -> CODE128
          color: 'grey'
        });
      });
    });

    it('shows loading state when isLoading is true', () => {
      render(<CardForm onSubmit={mockOnSubmit} submitLabel="Add Card" isLoading={true} />);

      expect(screen.getByText('Saving...')).toBeTruthy();
    });
  });

  describe('Dirty State Tracking - AC8', () => {
    it('calls onDirtyChange when form becomes dirty', async () => {
      render(
        <CardForm
          onSubmit={mockOnSubmit}
          submitLabel="Add Card"
          onDirtyChange={mockOnDirtyChange}
        />
      );

      const nameInput = screen.getByTestId('card-name-input');
      fireEvent.changeText(nameInput, 'Test');

      await waitFor(() => {
        expect(mockOnDirtyChange).toHaveBeenCalledWith(true);
      });
    });
  });

  describe('Accessibility', () => {
    it('has accessible labels for form fields', () => {
      render(<CardForm onSubmit={mockOnSubmit} submitLabel="Add Card" />);

      expect(screen.getByLabelText('Card name')).toBeTruthy();
      expect(screen.getByLabelText('Barcode number')).toBeTruthy();
    });

    it('has accessible submit button', () => {
      render(<CardForm onSubmit={mockOnSubmit} submitLabel="Add Card" />);

      const submitButton = screen.getByTestId('save-button');
      expect(submitButton.props.accessibilityRole).toBe('button');
      expect(submitButton.props.accessibilityLabel).toBe('Add Card');
    });
  });
});
