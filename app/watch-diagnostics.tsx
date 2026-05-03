import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  forceResyncWatch,
  getWatchDiagnostics,
  type WatchDiagnostics
} from '@/core/watch-connectivity';

import { useTheme } from '@/shared/theme';

const formatBool = (v: boolean | null): string => {
  if (v === null) return 'unknown';
  return v ? 'true' : 'false';
};

const formatTimestamp = (ms: number | null): string => {
  if (ms === null) return 'never';
  const ago = Math.max(0, Math.round((Date.now() - ms) / 1000));
  if (ago < 60) return `${ago}s ago`;
  if (ago < 3600) return `${Math.round(ago / 60)}m ago`;
  return new Date(ms).toLocaleTimeString();
};

const WatchDiagnosticsScreen = () => {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const [diag, setDiag] = useState<WatchDiagnostics | null>(null);
  const [busy, setBusy] = useState(false);
  const [resyncResult, setResyncResult] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const next = await getWatchDiagnostics();
    setDiag(next);
  }, []);

  useFocusEffect(
    useCallback(() => {
      void refresh();
    }, [refresh])
  );

  // Auto-refresh every 2s while the screen is mounted so the user can watch
  // state transitions without tapping refresh.
  useEffect(() => {
    const id = setInterval(() => {
      void refresh();
    }, 2000);
    return () => clearInterval(id);
  }, [refresh]);

  const onForceResync = async () => {
    setBusy(true);
    setResyncResult(null);
    try {
      const ok = await forceResyncWatch();
      setResyncResult(ok ? 'Push issued ✓' : 'Push failed (see lastErrorMessage)');
      await refresh();
    } finally {
      setBusy(false);
    }
  };

  return (
    <ScrollView
      testID="watch-diagnostics-scroll"
      style={{ backgroundColor: theme.background }}
      contentContainerStyle={{
        paddingHorizontal: 24,
        paddingTop: 16,
        paddingBottom: Math.max(insets.bottom + 16, 32),
        gap: 16
      }}
    >
      <Text style={{ color: theme.textPrimary, fontSize: 14 }}>
        Live state of the iPhone-side WatchConnectivity wrapper. Use this to see why a card push
        might not be reaching the watch — gated calls, dropped pushes, and library errors are
        recorded here.
      </Text>

      <Section title="Connection" theme={theme}>
        <Row label="Module loaded" value={formatBool(diag?.available ?? null)} theme={theme} />
        <Row label="Watch paired" value={formatBool(diag?.paired ?? null)} theme={theme} />
        <Row
          label="Watch app installed"
          value={formatBool(diag?.installed ?? null)}
          theme={theme}
        />
        <Row label="Reachable" value={formatBool(diag?.reachable ?? null)} theme={theme} />
      </Section>

      <Section title="Last push" theme={theme}>
        <Row
          label="Snapshot size"
          value={diag ? `${diag.snapshotSize} card(s)` : '—'}
          theme={theme}
        />
        <Row label="Last push at" value={formatTimestamp(diag?.lastPushAt ?? null)} theme={theme} />
        <Row
          label="Last error"
          value={diag?.lastErrorMessage ?? '—'}
          theme={theme}
          tone={diag?.lastErrorMessage ? 'error' : 'normal'}
        />
      </Section>

      <Pressable
        testID="watch-diagnostics-resync"
        accessibilityRole="button"
        disabled={busy}
        onPress={onForceResync}
        style={{
          backgroundColor: theme.primary,
          paddingVertical: 12,
          paddingHorizontal: 16,
          borderRadius: 8,
          alignItems: 'center',
          opacity: busy ? 0.6 : 1
        }}
      >
        <Text style={{ color: '#FFFFFF', fontWeight: '600' }}>
          {busy ? 'Pushing…' : 'Force re-push snapshot'}
        </Text>
      </Pressable>
      {resyncResult ? (
        <Text style={{ color: theme.textSecondary, fontSize: 12, textAlign: 'center' }}>
          {resyncResult}
        </Text>
      ) : null}
    </ScrollView>
  );
};

const Section = ({
  title,
  children,
  theme
}: {
  title: string;
  children: React.ReactNode;
  theme: ReturnType<typeof useTheme>['theme'];
}) => (
  <View style={{ gap: 8 }}>
    <Text
      style={{
        color: theme.textSecondary,
        fontSize: 12,
        fontWeight: '600',
        textTransform: 'uppercase',
        letterSpacing: 0.5
      }}
    >
      {title}
    </Text>
    <View
      style={{
        backgroundColor: theme.surface,
        borderRadius: 12,
        paddingHorizontal: 16,
        paddingVertical: 8
      }}
    >
      {children}
    </View>
  </View>
);

const Row = ({
  label,
  value,
  theme,
  tone = 'normal'
}: {
  label: string;
  value: string;
  theme: ReturnType<typeof useTheme>['theme'];
  tone?: 'normal' | 'error';
}) => (
  <View
    style={{
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      paddingVertical: 8,
      gap: 12
    }}
  >
    <Text style={{ color: theme.textPrimary, fontSize: 14, flexShrink: 0 }}>{label}</Text>
    <Text
      style={{
        color: tone === 'error' ? '#E5484D' : theme.textSecondary,
        fontSize: 14,
        flexShrink: 1,
        textAlign: 'right'
      }}
      numberOfLines={3}
    >
      {value}
    </Text>
  </View>
);

export default WatchDiagnosticsScreen;
