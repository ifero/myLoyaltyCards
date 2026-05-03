/**
 * Debug Screen for Image Scan Diagnostics
 * Story 2.9: Help diagnose barcode detection failures
 */

import { MaterialIcons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, Pressable, Share, Alert } from 'react-native';

import { useTheme } from '@/shared/theme';
import { SPACING } from '@/shared/theme/spacing';

import {
  getDebugHistory,
  clearDebugHistory,
  exportDebugData,
  analyzeFailurePattern
} from '../hooks/useImageScan.debug';

export const ImageScanDebugScreen: React.FC = () => {
  const { theme } = useTheme();
  const [refreshKey, setRefreshKey] = useState(0);

  const history = getDebugHistory();
  const failureAnalysis = analyzeFailurePattern();

  const handleRefresh = () => {
    setRefreshKey((prev) => prev + 1);
  };

  const handleExport = async () => {
    try {
      const json = exportDebugData();
      await Share.share({
        message: json,
        title: 'Image Scan Debug Data'
      });
    } catch (error) {
      Alert.alert('Export failed', error instanceof Error ? error.message : 'Unknown error');
    }
  };

  const handleClear = () => {
    clearDebugHistory();
    setRefreshKey((prev) => prev + 1);
  };

  return (
    <ScrollView key={refreshKey} style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={styles.header}>
        <MaterialIcons name="bug-report" size={32} color={theme.primary} />
        <Text style={[styles.title, { color: theme.textPrimary }]}>Image Scan Debug</Text>
      </View>

      {/* Analysis */}
      <View style={styles.card}>
        <Text style={[styles.cardTitle, { color: theme.textPrimary }]}>Failure Analysis</Text>
        <Text style={[styles.analysisText, { color: theme.textSecondary }]}>{failureAnalysis}</Text>
      </View>

      {/* History */}
      <View style={styles.card}>
        <Text style={[styles.cardTitle, { color: theme.textPrimary }]}>
          Scan History ({history.length})
        </Text>
        {history.length === 0 ? (
          <Text style={[styles.emptyText, { color: theme.textTertiary }]}>No scans recorded</Text>
        ) : (
          history.map((result, idx) => (
            <View key={idx} style={[styles.historyItem, { borderBottomColor: theme.textTertiary }]}>
              <View style={styles.itemHeader}>
                <Text style={[styles.itemTime, { color: theme.textSecondary }]}>
                  {new Date(result.timestamp).toLocaleTimeString()}
                </Text>
                <View
                  style={[
                    styles.itemBadge,
                    {
                      backgroundColor: result.error
                        ? theme.error
                        : result.scannedCount > 0
                          ? '#4CAF50'
                          : theme.textTertiary
                    }
                  ]}
                >
                  <Text style={styles.itemBadgeText}>
                    {result.error ? 'ERR' : `${result.scannedCount} found`}
                  </Text>
                </View>
              </View>
              <Text style={[styles.itemUri, { color: theme.textTertiary }]} numberOfLines={1}>
                {result.uri}
              </Text>
              {result.scannedDetails.length > 0 && (
                <Text style={[styles.itemData, { color: theme.textSecondary }]}>
                  {result.scannedDetails.map((d) => `${d.data} (${d.type})`).join(', ')}
                </Text>
              )}
              {result.error && (
                <Text style={[styles.itemError, { color: theme.error }]}>{result.error}</Text>
              )}
              <Text style={[styles.itemMeta, { color: theme.textTertiary }]}>
                {result.environment} • {result.durationMs}ms
              </Text>
            </View>
          ))
        )}
      </View>

      {/* Actions */}
      <View style={styles.actions}>
        <Pressable
          style={[styles.button, { backgroundColor: theme.primary }]}
          onPress={handleRefresh}
          accessibilityRole="button"
        >
          <MaterialIcons name="refresh" size={18} color="#FFF" />
          <Text style={styles.buttonText}>Refresh</Text>
        </Pressable>

        <Pressable
          style={[styles.button, { backgroundColor: theme.primary }]}
          onPress={handleExport}
          accessibilityRole="button"
        >
          <MaterialIcons name="share" size={18} color="#FFF" />
          <Text style={styles.buttonText}>Export</Text>
        </Pressable>

        <Pressable
          style={[styles.button, { backgroundColor: theme.error }]}
          onPress={handleClear}
          accessibilityRole="button"
        >
          <MaterialIcons name="delete" size={18} color="#FFF" />
          <Text style={styles.buttonText}>Clear</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: SPACING.md
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginBottom: SPACING.lg
  },
  title: {
    fontSize: 24,
    fontWeight: '600'
  },
  card: {
    marginBottom: SPACING.md,
    padding: SPACING.md,
    borderRadius: 8,
    backgroundColor: 'rgba(0,0,0,0.05)'
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: SPACING.sm
  },
  analysisText: {
    fontSize: 13,
    lineHeight: 18
  },
  emptyText: {
    fontSize: 13,
    fontStyle: 'italic'
  },
  historyItem: {
    paddingVertical: SPACING.sm,
    borderBottomWidth: 1
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.xs
  },
  itemTime: {
    fontSize: 12,
    fontWeight: '500'
  },
  itemBadge: {
    paddingHorizontal: SPACING.xs,
    paddingVertical: 2,
    borderRadius: 4
  },
  itemBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#FFF'
  },
  itemUri: {
    fontSize: 11,
    marginBottom: SPACING.xs
  },
  itemData: {
    fontSize: 12,
    marginBottom: SPACING.xs
  },
  itemError: {
    fontSize: 12,
    fontWeight: '500',
    marginBottom: SPACING.xs
  },
  itemMeta: {
    fontSize: 10
  },
  actions: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginVertical: SPACING.lg
  },
  button: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.xs,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    borderRadius: 6
  },
  buttonText: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: '600'
  }
});
