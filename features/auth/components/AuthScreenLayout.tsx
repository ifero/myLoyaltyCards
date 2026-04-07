import React from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleProp,
  Text,
  View,
  ViewStyle
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '@/shared/theme';

import { AppIconHeader } from './AppIconHeader';

type AuthScreenLayoutProps = {
  children: React.ReactNode;
  heading?: string;
  subtitle?: string;
  headingTestID?: string;
  subtitleTestID?: string;
  showAppIcon?: boolean;
  centerContent?: boolean;
  headerContent?: React.ReactNode;
  testID?: string;
  contentStyle?: StyleProp<ViewStyle>;
};

export const AuthScreenLayout = ({
  children,
  heading,
  subtitle,
  headingTestID,
  subtitleTestID,
  showAppIcon = true,
  centerContent = true,
  headerContent,
  testID,
  contentStyle
}: AuthScreenLayoutProps) => {
  const { theme, layout, spacing, typography } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <KeyboardAvoidingView
      testID={testID}
      className="flex-1"
      style={{ backgroundColor: theme.background }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{
          flexGrow: 1,
          paddingBottom: Math.max(insets.bottom, spacing.lg)
        }}
      >
        <View
          style={[
            {
              flexGrow: 1,
              paddingTop: Math.max(insets.top, layout.safeAreaTopInsetMin),
              paddingHorizontal: layout.screenHorizontalMargin,
              justifyContent: centerContent ? 'center' : 'flex-start'
            },
            contentStyle
          ]}
        >
          {headerContent}

          {showAppIcon ? <AppIconHeader /> : null}

          {heading ? (
            <Text
              testID={headingTestID}
              accessibilityRole="header"
              style={{
                color: theme.textPrimary,
                fontSize: typography.title1.fontSize,
                lineHeight: typography.title1.lineHeight,
                fontWeight: typography.title1.fontWeight,
                textAlign: 'center'
              }}
            >
              {heading}
            </Text>
          ) : null}

          {subtitle ? (
            <Text
              testID={subtitleTestID}
              style={{
                color: theme.textSecondary,
                fontSize: typography.subheadline.fontSize,
                lineHeight: typography.subheadline.lineHeight,
                fontWeight: typography.subheadline.fontWeight,
                textAlign: 'center',
                marginTop: spacing.sm,
                marginBottom: spacing.xl
              }}
            >
              {subtitle}
            </Text>
          ) : null}

          {children}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};
