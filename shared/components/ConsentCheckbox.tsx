/**
 * ConsentCheckbox
 * Story 6-4: Privacy Policy & Consent Flow
 *
 * Reusable controlled checkbox for privacy consent.
 * Renders "I agree to the Privacy Policy" with a tappable link
 * that navigates to `/privacy-policy`.
 *
 * Placed in `shared/components/` so that `features/auth/` (Story 6-6)
 * can use it during account creation without violating layer boundaries.
 */

import { useRouter } from 'expo-router';
import { Pressable, Text, View } from 'react-native';

import { useTheme } from '../theme';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ConsentCheckboxProps = {
  /** Current checked state (controlled) */
  checked: boolean;
  /** Called with the new value when the user taps the checkbox area */
  onToggle: (value: boolean) => void;
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

const ConsentCheckbox = ({ checked, onToggle }: ConsentCheckboxProps) => {
  const { theme } = useTheme();
  const router = useRouter();

  const handleToggle = () => {
    onToggle(!checked);
  };

  const handlePolicyPress = () => {
    router.push('/privacy-policy');
  };

  return (
    <View testID="consent-checkbox" className="flex-row items-start gap-3">
      {/* Checkbox toggle */}
      <Pressable
        testID="consent-checkbox-toggle"
        onPress={handleToggle}
        accessibilityRole="checkbox"
        accessibilityLabel="I agree to the Privacy Policy"
        accessibilityState={{ checked }}
        accessibilityHint="Toggles privacy consent"
        className="mt-0.5 h-6 w-6 items-center justify-center rounded border-2"
        style={{
          borderColor: checked ? theme.primary : theme.border,
          backgroundColor: checked ? theme.primary : 'transparent'
        }}
      >
        {checked && <Text className="text-sm font-bold text-white">✓</Text>}
      </Pressable>

      {/* Label */}
      <Text className="flex-1 text-sm leading-5" style={{ color: theme.textPrimary }}>
        I agree to the{' '}
        <Text
          testID="consent-policy-link"
          onPress={handlePolicyPress}
          accessibilityRole="link"
          accessibilityHint="Opens the Privacy Policy"
          style={{ color: theme.primary, textDecorationLine: 'underline' }}
        >
          Privacy Policy
        </Text>
      </Text>
    </View>
  );
};

export default ConsentCheckbox;
