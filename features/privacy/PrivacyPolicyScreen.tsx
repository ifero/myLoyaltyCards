/**
 * PrivacyPolicyScreen
 * Story 6-4: Privacy Policy & Consent Flow
 *
 * Renders the bundled privacy policy as styled text.
 * Works fully offline — all content is imported from
 * `assets/legal/privacy-policy.ts`.
 */

import { useMemo } from 'react';
import { ScrollView, Text, View } from 'react-native';

import { useTheme } from '@/shared/theme';

import {
  PRIVACY_POLICY_CONTENT,
  PRIVACY_POLICY_LAST_UPDATED,
  PRIVACY_POLICY_VERSION
} from '@/assets/legal/privacy-policy';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Regex to detect numbered section headers (e.g. "1. Introduction") */
const SECTION_HEADER_RE = /^\d+\.\s+.+$/;

/**
 * Splits the policy content into styled <Text> elements.
 * Section headers are rendered bold; body text is normal.
 */
const renderPolicyContent = (content: string, textColor: string, headingColor: string) => {
  const lines = content.split('\n');

  return lines.map((line, idx) => {
    const trimmed = line.trim();

    // Skip the title line (rendered separately) and blank lines
    if (idx === 0 && trimmed === 'Privacy Policy') return null;
    if (idx === 1 && trimmed.startsWith('Last updated:')) return null;
    if (trimmed === '') return <View key={`sp-${idx}`} className="h-3" />;

    // Section headers → bold
    if (SECTION_HEADER_RE.test(trimmed)) {
      return (
        <Text
          key={`h-${idx}`}
          className="mb-1 mt-4 text-base font-bold"
          style={{ color: headingColor }}
        >
          {trimmed}
        </Text>
      );
    }

    // Bullet points → slightly indented
    if (trimmed.startsWith('•')) {
      return (
        <Text key={`b-${idx}`} className="mb-1 pl-4 text-sm leading-5" style={{ color: textColor }}>
          {trimmed}
        </Text>
      );
    }

    // Normal body text
    return (
      <Text key={`t-${idx}`} className="mb-1 text-sm leading-5" style={{ color: textColor }}>
        {trimmed}
      </Text>
    );
  });
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

const PrivacyPolicyScreen = () => {
  const { theme } = useTheme();

  const policyBody = useMemo(
    () => renderPolicyContent(PRIVACY_POLICY_CONTENT, theme.textPrimary, theme.textPrimary),
    [theme.textPrimary]
  );

  return (
    <ScrollView
      testID="privacy-policy-screen"
      className="flex-1 px-6 pb-8 pt-6"
      style={{ backgroundColor: theme.background }}
      contentContainerStyle={{ paddingBottom: 40 }}
      accessibilityLabel="Privacy Policy"
    >
      {/* Title */}
      <Text
        accessibilityRole="header"
        className="mb-1 text-2xl font-bold"
        style={{ color: theme.textPrimary }}
      >
        Privacy Policy
      </Text>

      {/* Meta */}
      <Text className="mb-6 text-xs" style={{ color: theme.textSecondary }}>
        Version {PRIVACY_POLICY_VERSION} · Last updated: {PRIVACY_POLICY_LAST_UPDATED}
      </Text>

      {/* Policy body */}
      {policyBody}
    </ScrollView>
  );
};

export default PrivacyPolicyScreen;
