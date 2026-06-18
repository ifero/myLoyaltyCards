/**
 * PrivacyPolicyScreen
 * Story 6-4: Privacy Policy & Consent Flow
 *
 * Renders the bundled privacy policy as styled text.
 * Works fully offline — all content is imported from
 * `assets/legal/privacy-policy.ts`.
 */

import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, Text, View } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';

import { useTheme } from '@/shared/theme';

import {
  PRIVACY_POLICY_CONTENT,
  PRIVACY_POLICY_LAST_UPDATED,
  PRIVACY_POLICY_VERSION
} from '@/assets/legal/privacy-policy';
import {
  PRIVACY_POLICY_CONTENT_IT,
  PRIVACY_POLICY_LAST_UPDATED_LABEL_IT,
  PRIVACY_POLICY_TITLE_IT
} from '@/assets/legal/privacy-policy.it';

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
    if (idx === 0 || idx === 1) return null;
    if (trimmed === '') return <View key={`sp-${idx}`} style={styles.spacer} />;

    // Section headers → bold
    if (SECTION_HEADER_RE.test(trimmed)) {
      return (
        <Text key={`h-${idx}`} style={[styles.sectionHeader, { color: headingColor }]}>
          {trimmed}
        </Text>
      );
    }

    // Bullet points → slightly indented
    if (trimmed.startsWith('•')) {
      return (
        <Text key={`b-${idx}`} style={[styles.bullet, { color: textColor }]}>
          {trimmed}
        </Text>
      );
    }

    // Normal body text
    return (
      <Text key={`t-${idx}`} style={[styles.body, { color: textColor }]}>
        {trimmed}
      </Text>
    );
  });
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

const PrivacyPolicyScreen = () => {
  const { t, i18n } = useTranslation();
  const { theme } = useTheme();
  const isItalian = i18n.language.toLowerCase().startsWith('it');
  const policyTitle = isItalian ? PRIVACY_POLICY_TITLE_IT : t('privacy.title');
  const policyLastUpdatedLabel = isItalian
    ? PRIVACY_POLICY_LAST_UPDATED_LABEL_IT
    : t('privacy.lastUpdated');
  const policyContent = isItalian ? PRIVACY_POLICY_CONTENT_IT : PRIVACY_POLICY_CONTENT;

  const policyBody = useMemo(
    () => renderPolicyContent(policyContent, theme.textPrimary, theme.textPrimary),
    [policyContent, theme.textPrimary]
  );

  return (
    <ScrollView
      testID="privacy-policy-screen"
      style={[styles.scroll, { backgroundColor: theme.background }]}
      contentContainerStyle={{ paddingBottom: 40 }}
      accessibilityLabel={policyTitle}
    >
      {/* Title */}
      <Text accessibilityRole="header" style={[styles.title, { color: theme.textPrimary }]}>
        {policyTitle}
      </Text>

      {/* Meta */}
      <Text style={[styles.meta, { color: theme.textSecondary }]}>
        {t('privacy.version', { version: PRIVACY_POLICY_VERSION })} · {policyLastUpdatedLabel}:{' '}
        {PRIVACY_POLICY_LAST_UPDATED}
      </Text>

      {/* Policy body */}
      {policyBody}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  spacer: {
    height: 24
  },
  sectionHeader: {
    marginBottom: 8,
    marginTop: 32,
    fontSize: 16,
    lineHeight: 24,
    fontWeight: '700'
  },
  bullet: {
    marginBottom: 8,
    paddingLeft: 32,
    fontSize: 14,
    lineHeight: 20
  },
  body: {
    marginBottom: 8,
    fontSize: 14,
    lineHeight: 20
  },
  scroll: {
    flex: 1,
    paddingHorizontal: 48,
    paddingBottom: 64,
    paddingTop: 48
  },
  title: {
    marginBottom: 8,
    fontSize: 24,
    lineHeight: 32,
    fontWeight: '700'
  },
  meta: {
    marginBottom: 48,
    fontSize: 12,
    lineHeight: 16
  }
});

export default PrivacyPolicyScreen;
