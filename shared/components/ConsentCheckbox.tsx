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

import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Pressable, Text, View } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';

import { useTheme } from '../theme';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ConsentCheckboxProps = {
  /** Current checked state (controlled) */
  checked: boolean;
  /** Called with the new value when the user taps the checkbox area */
  onToggle: (value: boolean) => void;
  /** Optional custom handler for "Privacy Policy" link press. Defaults to navigating to /privacy-policy. */
  onPolicyPress?: () => void;
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

const ConsentCheckbox = ({ checked, onToggle, onPolicyPress }: ConsentCheckboxProps) => {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const router = useRouter();

  const handleToggle = () => {
    onToggle(!checked);
  };

  const handlePolicyPress = () => {
    if (onPolicyPress) {
      onPolicyPress();
    } else {
      router.push('/privacy-policy');
    }
  };

  return (
    <View testID="consent-checkbox" style={styles.row}>
      {/* Checkbox toggle */}
      <Pressable
        testID="consent-checkbox-toggle"
        onPress={handleToggle}
        accessibilityRole="checkbox"
        accessibilityLabel={t('auth.consent.checkboxLabel')}
        accessibilityState={{ checked }}
        accessibilityHint={t('auth.consent.checkboxHint')}
        style={[
          styles.checkbox,
          {
            borderColor: checked ? theme.primary : theme.border,
            backgroundColor: checked ? theme.primary : 'transparent'
          }
        ]}
      >
        {checked && <MaterialIcons name="check" size={16} color="#FFFFFF" />}
      </Pressable>

      {/* Label */}
      <Text style={[styles.label, { color: theme.textPrimary }]}>
        {`${t('auth.consent.labelPrefix')} `}
        <Text
          testID="consent-policy-link"
          onPress={handlePolicyPress}
          accessibilityRole="link"
          accessibilityHint={t('auth.consent.policyHint')}
          style={{ color: theme.primary, textDecorationLine: 'underline' }}
        >
          {t('auth.consent.policy')}
        </Text>
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 24
  },
  checkbox: {
    marginTop: 4,
    height: 48,
    width: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 4,
    borderWidth: 2
  },
  label: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20
  }
});

export default ConsentCheckbox;
