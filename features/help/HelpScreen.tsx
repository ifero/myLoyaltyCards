import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, Linking, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';

import { useTheme } from '@/shared/theme';

import docHelpItemsIt from './help-data.it.json';
import docHelpItemsEn from './help-data.json';
import { fallbackHelpItemsEn, fallbackHelpItemsIt, type HelpItem } from './help-fallback';

type HelpLanguageCode = 'en' | 'it';

const resolveHelpLanguage = (language: string): HelpLanguageCode =>
  language.toLowerCase().startsWith('it') ? 'it' : 'en';

const sourceHelpItemsByLanguage: Record<HelpLanguageCode, HelpItem[]> = {
  en:
    Array.isArray(docHelpItemsEn) && docHelpItemsEn.length > 0
      ? docHelpItemsEn
      : fallbackHelpItemsEn,
  it:
    Array.isArray(docHelpItemsIt) && docHelpItemsIt.length > 0
      ? docHelpItemsIt
      : fallbackHelpItemsIt
};

const fallbackHelpItemsByLanguage: Record<HelpLanguageCode, HelpItem[]> = {
  en: fallbackHelpItemsEn,
  it: fallbackHelpItemsIt
};

type HelpScreenProps = {
  itemsOverride?: HelpItem[];
};

const HelpScreen = ({ itemsOverride }: HelpScreenProps) => {
  const { t, i18n } = useTranslation();
  const { theme } = useTheme();
  const language = resolveHelpLanguage(i18n.language);
  const sourceHelpItems = sourceHelpItemsByLanguage[language];
  const fallbackHelpItems = fallbackHelpItemsByLanguage[language];
  const resolvedItems = itemsOverride ?? sourceHelpItems;
  const displayItems = resolvedItems.length > 0 ? resolvedItems : fallbackHelpItems;
  const [query, setQuery] = useState('');
  const [expandedIds, setExpandedIds] = useState<Record<string, boolean>>({});

  const filteredItems = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return displayItems;

    return displayItems.filter((item) => {
      const haystack = [item.question, item.answer, ...item.tags].join(' ').toLowerCase();
      return haystack.includes(normalized);
    });
  }, [displayItems, query]);

  const toggleExpanded = (id: string) => {
    setExpandedIds((prev) => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  const openExternal = async (url: string, fallbackMessage: string) => {
    try {
      const supported = await Linking.canOpenURL(url);
      if (!supported) {
        Alert.alert(t('help.openFailedTitle'), fallbackMessage);
        return;
      }
      await Linking.openURL(url);
    } catch {
      Alert.alert(t('help.openFailedTitle'), fallbackMessage);
    }
  };

  return (
    <ScrollView
      testID="help-screen"
      style={[styles.scroll, { backgroundColor: theme.background }]}
      contentContainerStyle={{ paddingBottom: 24 }}
    >
      <Text
        testID="help-title"
        style={[styles.title, { color: theme.textPrimary }]}
        accessibilityRole="header"
      >
        {t('help.title')}
      </Text>

      <Text style={[styles.subtitle, { color: theme.textSecondary }]}>{t('help.subtitle')}</Text>

      <TextInput
        testID="help-search"
        value={query}
        onChangeText={setQuery}
        placeholder={t('help.searchPlaceholder')}
        placeholderTextColor={theme.textSecondary}
        style={[
          styles.search,
          {
            backgroundColor: theme.surface,
            color: theme.textPrimary,
            borderColor: theme.border,
            borderWidth: 1
          }
        ]}
      />

      {filteredItems.map((item) => (
        <View
          key={item.id}
          style={[
            styles.card,
            { backgroundColor: theme.surface, borderColor: theme.border, borderWidth: 1 }
          ]}
        >
          <Pressable
            onPress={() => toggleExpanded(item.id)}
            accessibilityRole="button"
            accessibilityLabel={item.question}
          >
            <Text style={[styles.question, { color: theme.textPrimary }]}>{item.question}</Text>
          </Pressable>
          {expandedIds[item.id] && (
            <View style={styles.answerWrap}>
              <Text style={[styles.answer, { color: theme.textSecondary }]}>{item.answer}</Text>
              {item.steps && item.steps.length > 0 && (
                <View style={styles.answerWrap}>
                  {item.steps.map((step, index) => (
                    <Text
                      key={`${item.id}-step-${index}`}
                      style={[styles.answer, { color: theme.textSecondary }]}
                    >
                      {`• ${step}`}
                    </Text>
                  ))}
                </View>
              )}
            </View>
          )}
        </View>
      ))}

      <View style={styles.actions}>
        <Pressable
          testID="help-contact-support"
          accessibilityRole="button"
          accessibilityLabel={t('help.contactSupportA11y')}
          onPress={() =>
            openExternal('mailto:support@myloyaltycards.app', t('help.contactSupportUnavailable'))
          }
          style={[styles.actionButton, { backgroundColor: theme.primary }]}
        >
          <Text style={styles.actionLabelWhite}>{t('help.contactSupport')}</Text>
        </Pressable>

        <Pressable
          testID="help-submit-feedback"
          accessibilityRole="button"
          accessibilityLabel={t('help.submitFeedbackA11y')}
          onPress={() =>
            openExternal('https://myloyaltycards.app/feedback', t('help.submitFeedbackUnavailable'))
          }
          style={[
            styles.actionButton,
            { backgroundColor: theme.surface, borderColor: theme.border, borderWidth: 1 }
          ]}
        >
          <Text style={[styles.actionLabel, { color: theme.textPrimary }]}>
            {t('help.submitFeedback')}
          </Text>
        </Pressable>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
    paddingHorizontal: 48,
    paddingBottom: 64,
    paddingTop: 80
  },
  title: {
    marginBottom: 32,
    fontSize: 24,
    lineHeight: 32,
    fontWeight: '700'
  },
  subtitle: {
    marginBottom: 48,
    fontSize: 16,
    lineHeight: 24
  },
  search: {
    marginBottom: 48,
    borderRadius: 12,
    paddingHorizontal: 32,
    paddingVertical: 24,
    fontSize: 16,
    lineHeight: 24
  },
  card: {
    marginBottom: 32,
    borderRadius: 12,
    padding: 32
  },
  question: {
    fontSize: 16,
    lineHeight: 24,
    fontWeight: '600'
  },
  answerWrap: {
    marginTop: 16
  },
  answer: {
    fontSize: 14,
    lineHeight: 20
  },
  actions: {
    marginTop: 32,
    gap: 24
  },
  actionButton: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    paddingHorizontal: 32,
    paddingVertical: 24
  },
  actionLabelWhite: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '600',
    color: '#FFFFFF'
  },
  actionLabel: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '600'
  }
});

export default HelpScreen;
