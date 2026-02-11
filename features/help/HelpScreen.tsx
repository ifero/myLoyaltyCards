import { useMemo, useState } from 'react';
import { Alert, Linking, Pressable, ScrollView, Text, TextInput, View } from 'react-native';

import { useTheme } from '@/shared/theme';

import docHelpItems from './help-data.json';
import { fallbackHelpItems, type HelpItem } from './help-fallback';

const sourceHelpItems =
  Array.isArray(docHelpItems) && docHelpItems.length > 0 ? docHelpItems : fallbackHelpItems;

type HelpScreenProps = {
  itemsOverride?: HelpItem[];
};

const HelpScreen = ({ itemsOverride }: HelpScreenProps) => {
  const { theme } = useTheme();
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
        Alert.alert('Unable to open', fallbackMessage);
        return;
      }
      await Linking.openURL(url);
    } catch {
      Alert.alert('Unable to open', fallbackMessage);
    }
  };

  return (
    <ScrollView
      testID="help-screen"
      className="flex-1 px-6 pb-8 pt-10"
      style={{ backgroundColor: theme.background }}
      contentContainerStyle={{ paddingBottom: 24 }}
    >
      <Text
        testID="help-title"
        className="mb-4 text-2xl font-bold"
        style={{ color: theme.textPrimary }}
        accessibilityRole="header"
      >
        Help & FAQ
      </Text>

      <Text className="mb-6 text-base" style={{ color: theme.textSecondary }}>
        Find quick answers and troubleshooting steps.
      </Text>

      <TextInput
        testID="help-search"
        value={query}
        onChangeText={setQuery}
        placeholder="Search help"
        placeholderTextColor={theme.textSecondary}
        className="mb-6 rounded-xl px-4 py-3 text-base"
        style={{
          backgroundColor: theme.surface,
          color: theme.textPrimary,
          borderColor: theme.border,
          borderWidth: 1
        }}
      />

      {filteredItems.map((item) => (
        <View
          key={item.id}
          className="mb-4 rounded-xl p-4"
          style={{ backgroundColor: theme.surface, borderColor: theme.border, borderWidth: 1 }}
        >
          <Pressable
            onPress={() => toggleExpanded(item.id)}
            accessibilityRole="button"
            accessibilityLabel={item.question}
          >
            <Text className="text-base font-semibold" style={{ color: theme.textPrimary }}>
              {item.question}
            </Text>
          </Pressable>
          {expandedIds[item.id] && (
            <View className="mt-2">
              <Text className="text-sm" style={{ color: theme.textSecondary }}>
                {item.answer}
              </Text>
              {item.steps && item.steps.length > 0 && (
                <View className="mt-2">
                  {item.steps.map((step, index) => (
                    <Text
                      key={`${item.id}-step-${index}`}
                      className="text-sm"
                      style={{ color: theme.textSecondary }}
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

      <View className="mt-4 gap-3">
        <Pressable
          testID="help-contact-support"
          accessibilityRole="button"
          accessibilityLabel="Contact support"
          onPress={() =>
            openExternal(
              'mailto:support@myloyaltycards.app',
              'No email app available. Please try again later.'
            )
          }
          className="items-center justify-center rounded-xl px-4 py-3"
          style={{
            backgroundColor: theme.primary
          }}
        >
          <Text className="text-sm font-semibold text-white">Contact Support</Text>
        </Pressable>

        <Pressable
          testID="help-submit-feedback"
          accessibilityRole="button"
          accessibilityLabel="Submit feedback"
          onPress={() =>
            openExternal(
              'https://myloyaltycards.app/feedback',
              'Feedback page unavailable. Please try again later.'
            )
          }
          className="items-center justify-center rounded-xl px-4 py-3"
          style={{
            backgroundColor: theme.surface,
            borderColor: theme.border,
            borderWidth: 1
          }}
        >
          <Text className="text-sm font-semibold" style={{ color: theme.textPrimary }}>
            Submit Feedback
          </Text>
        </Pressable>
      </View>
    </ScrollView>
  );
};

export default HelpScreen;
