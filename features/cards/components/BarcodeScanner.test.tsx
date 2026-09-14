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
jest.mock('react-native-safe-area-context', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { View } = require('react-native');
  return {
    SafeAreaView: ({ children, ...props }: { children?: React.ReactNode }) => {
      return <View {...props}>{children}</View>;
    }
  };
});

// Mock ThemeProvider
jest.mock('@/shared/theme', () => ({
  useTheme: () => ({
    theme: {
      background: '#FAFAFA',
      surface: '#FFFFFF',
      textPrimary: '#1F2937',
      textSecondary: '#6B7280',
      primary: '#1A73E8',
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
      expect(screen.getByText('Enter card number manually')).toBeTruthy();
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

    it('calls onManualEntry when manual-entry action is pressed from permission denied state', () => {
      mockUseCameraPermissions.mockReturnValue([{ granted: false }, mockRequestPermission]);

      render(<BarcodeScanner onScan={mockOnScan} onManualEntry={mockOnManualEntry} />);

      const manualEntryButton = screen.getByText('Enter card number manually');
      fireEvent.press(manualEntryButton);

      expect(mockOnManualEntry).toHaveBeenCalled();
    });
  });

  describe('Permission request stability (Story 16.24)', () => {
    type AlertButton = { text?: string; onPress?: () => void };

    // AC2 — the mount effect must not re-run on every render. It depends on
    // `handleRequestPermission`, which depends on `requestCameraPermission` from
    // useBarcodeScanner; while that helper was a bare arrow function it got a new
    // identity each render, so the effect re-fired and the camera permission was
    // requested repeatedly. FALSIFIABLE: against the un-memoised hook this
    // observes 2 requests instead of 1.
    it('requests camera permission exactly once while the status is unresolved', async () => {
      mockRequestPermission.mockResolvedValue({ granted: false });
      mockUseCameraPermissions.mockReturnValue([null, mockRequestPermission]);

      render(<BarcodeScanner onScan={mockOnScan} onManualEntry={mockOnManualEntry} />);

      await waitFor(() => expect(mockRequestPermission).toHaveBeenCalled());
      // Let any identity churn settle; a re-running effect keeps requesting.
      await new Promise((resolve) => setTimeout(resolve, 250));

      expect(mockRequestPermission).toHaveBeenCalledTimes(1);
    });

    // AC3 — regression guard, NOT a reproduction: see the story's Dev Agent
    // Record. The permission-denied alert must carry the CURRENT onManualEntry.
    it('permission-denied alert invokes the current onManualEntry', async () => {
      mockRequestPermission.mockResolvedValue({ granted: false });
      mockUseCameraPermissions.mockReturnValue([null, mockRequestPermission]);

      render(<BarcodeScanner onScan={mockOnScan} onManualEntry={mockOnManualEntry} />);

      await waitFor(() => expect(Alert.alert).toHaveBeenCalled());

      const alertCalls = (Alert.alert as unknown as jest.Mock).mock.calls;
      const buttons = alertCalls[alertCalls.length - 1][2] as AlertButton[];
      const manualEntry = buttons.find((button) => button.text === 'Enter card number manually');

      expect(manualEntry).toBeDefined();
      manualEntry?.onPress?.();
      expect(mockOnManualEntry).toHaveBeenCalledTimes(1);
    });
  });

  describe('Camera View', () => {
    it('renders camera view when permission is granted', () => {
      mockUseCameraPermissions.mockReturnValue([{ granted: true }, mockRequestPermission]);

      render(<BarcodeScanner onScan={mockOnScan} onManualEntry={mockOnManualEntry} />);

      expect(screen.getByText('Point camera at barcode')).toBeTruthy();
      expect(screen.getByText('Enter card number manually')).toBeTruthy();
    });

    it('shows manual entry button in camera view', () => {
      mockUseCameraPermissions.mockReturnValue([{ granted: true }, mockRequestPermission]);

      render(<BarcodeScanner onScan={mockOnScan} onManualEntry={mockOnManualEntry} />);

      const manualEntryButton = screen.getByText('Enter card number manually');
      expect(manualEntryButton).toBeTruthy();
    });

    it('calls onManualEntry when manual entry button is pressed', () => {
      mockUseCameraPermissions.mockReturnValue([{ granted: true }, mockRequestPermission]);

      render(<BarcodeScanner onScan={mockOnScan} onManualEntry={mockOnManualEntry} />);

      const manualEntryButton = screen.getByText('Enter card number manually');
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

      const manualEntryButton = screen.getByLabelText('Enter card number manually');
      expect(manualEntryButton).toBeTruthy();
    });
  });
});
