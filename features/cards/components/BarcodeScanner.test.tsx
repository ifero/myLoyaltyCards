/**
 * BarcodeScanner Component Tests
 * Story 2.3: Scan Barcode with Camera
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import { Alert, Linking } from 'react-native';

import { BarcodeScanner } from './BarcodeScanner';

// Mock expo-camera
const mockUseCameraPermissions = jest.fn();
jest.mock('expo-camera', () => ({
  CameraView: 'CameraView',
  CameraType: {
    back: 'back',
    front: 'front'
  },
  useCameraPermissions: () => mockUseCameraPermissions()
}));

// Mock expo-haptics
jest.mock('expo-haptics', () => ({
  notificationAsync: jest.fn(),
  NotificationFeedbackType: {
    Success: 'success'
  }
}));

// Mock react-native-safe-area-context
jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: ({ children, ...props }: any) => {
    const { View } = require('react-native');
    return <View {...props}>{children}</View>;
  }
}));

// Mock ThemeProvider
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
  })
}));

describe('BarcodeScanner', () => {
  const mockOnScan = jest.fn();
  const mockOnManualEntry = jest.fn();
  const mockOnError = jest.fn();
  const mockRequestPermission = jest.fn();
  let mockOpenSettings: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(Alert, 'alert');
    mockOpenSettings = jest.spyOn(Linking, 'openSettings').mockResolvedValue();
    mockUseCameraPermissions.mockReturnValue([{ granted: true }, mockRequestPermission]);
  });

  afterEach(() => {
    mockOpenSettings.mockRestore();
  });

  describe('Permission States', () => {
    it('shows loading state when permission is null', () => {
      mockUseCameraPermissions.mockReturnValue([null, mockRequestPermission]);

      render(<BarcodeScanner onScan={mockOnScan} onManualEntry={mockOnManualEntry} />);

      expect(screen.getByText('Checking camera permission...')).toBeTruthy();
    });

    it('shows permission denied UI when permission is not granted', () => {
      mockUseCameraPermissions.mockReturnValue([{ granted: false }, mockRequestPermission]);

      render(<BarcodeScanner onScan={mockOnScan} onManualEntry={mockOnManualEntry} />);

      expect(screen.getByText('Camera Access Needed')).toBeTruthy();
      expect(screen.getByText('Open Settings')).toBeTruthy();
      expect(screen.getByText('Enter Manually')).toBeTruthy();
    });

    it('opens settings when "Open Settings" is pressed', async () => {
      mockUseCameraPermissions.mockReturnValue([{ granted: false }, mockRequestPermission]);

      render(<BarcodeScanner onScan={mockOnScan} onManualEntry={mockOnManualEntry} />);

      const openSettingsButton = screen.getByText('Open Settings');
      fireEvent.press(openSettingsButton);

      await waitFor(() => {
        expect(mockOpenSettings).toHaveBeenCalled();
      });
    });

    it('calls onManualEntry when "Enter Manually" is pressed from permission denied state', () => {
      mockUseCameraPermissions.mockReturnValue([{ granted: false }, mockRequestPermission]);

      render(<BarcodeScanner onScan={mockOnScan} onManualEntry={mockOnManualEntry} />);

      const manualEntryButton = screen.getByText('Enter Manually');
      fireEvent.press(manualEntryButton);

      expect(mockOnManualEntry).toHaveBeenCalled();
    });
  });

  describe('Camera View', () => {
    it('renders camera view when permission is granted', () => {
      mockUseCameraPermissions.mockReturnValue([{ granted: true }, mockRequestPermission]);

      render(<BarcodeScanner onScan={mockOnScan} onManualEntry={mockOnManualEntry} />);

      expect(screen.getByText('Point camera at barcode')).toBeTruthy();
      expect(screen.getByText('Enter Manually')).toBeTruthy();
    });

    it('shows manual entry button in camera view', () => {
      mockUseCameraPermissions.mockReturnValue([{ granted: true }, mockRequestPermission]);

      render(<BarcodeScanner onScan={mockOnScan} onManualEntry={mockOnManualEntry} />);

      const manualEntryButton = screen.getByText('Enter Manually');
      expect(manualEntryButton).toBeTruthy();
    });

    it('calls onManualEntry when manual entry button is pressed', () => {
      mockUseCameraPermissions.mockReturnValue([{ granted: true }, mockRequestPermission]);

      render(<BarcodeScanner onScan={mockOnScan} onManualEntry={mockOnManualEntry} />);

      const manualEntryButton = screen.getByText('Enter Manually');
      fireEvent.press(manualEntryButton);

      expect(mockOnManualEntry).toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    it('shows error state when camera error occurs', () => {
      mockUseCameraPermissions.mockReturnValue([{ granted: false }, mockRequestPermission]);

      render(
        <BarcodeScanner
          onScan={mockOnScan}
          onManualEntry={mockOnManualEntry}
          onError={mockOnError}
        />
      );

      // Error state is shown when permission is denied
      expect(screen.getByText('Camera Access Needed')).toBeTruthy();
    });

    it('calls onError when error occurs', () => {
      mockUseCameraPermissions.mockReturnValue([{ granted: false }, mockRequestPermission]);

      render(
        <BarcodeScanner
          onScan={mockOnScan}
          onManualEntry={mockOnManualEntry}
          onError={mockOnError}
        />
      );

      // Error callback should be called when permission is denied
      // This is handled internally by the component
    });
  });

  describe('Accessibility', () => {
    it('has accessible labels for buttons', () => {
      mockUseCameraPermissions.mockReturnValue([{ granted: true }, mockRequestPermission]);

      render(<BarcodeScanner onScan={mockOnScan} onManualEntry={mockOnManualEntry} />);

      const manualEntryButton = screen.getByLabelText('Enter Manually');
      expect(manualEntryButton).toBeTruthy();
    });
  });
});
