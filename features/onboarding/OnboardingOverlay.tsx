import React, { useState } from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet, Linking } from 'react-native';

export type OnboardingOverlayProps = {
  visible: boolean;
  onRequestClose: () => void;
  onScan: () => Promise<void> | void;
  onAddManual: () => void;
  onComplete?: () => void;
};

export const OnboardingOverlay: React.FC<OnboardingOverlayProps> = ({
  visible,
  onRequestClose,
  onScan,
  onAddManual,
  onComplete
}) => {
  const [step, setStep] = useState<'intro' | 'permission-denied' | 'success'>('intro');

  const handleScan = async () => {
    try {
      await onScan();
      setStep('success');
      onComplete?.();
    } catch (err: unknown) {
      // Recognize common permission-denied shapes; allow callers to throw an
      // error with `.name === 'PermissionDenied'` or containing the word
      // "permission" in the message
      const e = err as { name?: string; message?: string };
      const name = e?.name;
      const message = e?.message ?? '';
      if (name === 'PermissionDenied' || /permission/i.test(message)) {
        setStep('permission-denied');
      } else {
        console.error(err);
      }
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      accessibilityViewIsModal
      onRequestClose={onRequestClose}
    >
      <View style={styles.scrim} testID="onboard-overlay">
        <View style={styles.card} accessibilityLabel="Add your first card">
          {step === 'intro' && (
            <>
              <View style={styles.headerRow}>
                <Text style={styles.title}>Add your first card</Text>
              </View>
              <Text style={styles.body}>
                Use your camera to scan a barcode or add details manually.
              </Text>

              <TouchableOpacity
                testID="onboard-scan"
                accessibilityLabel="Onboarding: Scan barcode"
                style={[styles.button, styles.primary]}
                onPress={handleScan}
              >
                <Text style={styles.buttonText}>Scan barcode</Text>
              </TouchableOpacity>

              <TouchableOpacity
                testID="onboard-add-manual"
                accessibilityLabel="Onboarding: Add manually"
                style={[styles.button, styles.secondary]}
                onPress={() => {
                  onAddManual();
                  setStep('success');
                  onComplete?.();
                }}
              >
                <Text style={styles.buttonText}>Add manually</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => {
                  onRequestClose();
                  onComplete?.();
                }}
              >
                <Text style={styles.skip}>Skip</Text>
              </TouchableOpacity>
            </>
          )}

          {step === 'permission-denied' && (
            <>
              <Text style={styles.title}>Camera access required</Text>
              <Text style={styles.body}>
                Camera access is required to scan. Enable camera in Settings.
              </Text>

              <TouchableOpacity
                testID="onboard-open-settings"
                style={[styles.button, styles.primary]}
                onPress={() => Linking.openSettings()}
              >
                <Text style={styles.buttonText}>Open Settings</Text>
              </TouchableOpacity>

              <TouchableOpacity testID="onboard-permission-back" onPress={() => setStep('intro')}>
                <Text style={styles.skip}>Back</Text>
              </TouchableOpacity>
            </>
          )}

          {step === 'success' && (
            <>
              <Text style={styles.title}>Nice! Your card is ready</Text>
              <TouchableOpacity
                testID="onboard-done"
                style={[styles.button, styles.primary]}
                onPress={() => {
                  onRequestClose();
                  onComplete?.();
                }}
              >
                <Text style={styles.buttonText}>Done</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  scrim: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    minWidth: 280,
    maxWidth: 480,
    alignSelf: 'center'
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8
  },
  body: {
    fontSize: 14,
    color: '#333',
    marginBottom: 16
  },
  button: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 12
  },
  primary: {
    backgroundColor: '#007AFF'
  },
  secondary: {
    backgroundColor: '#E5E7EB'
  },
  buttonText: {
    color: '#fff',
    fontWeight: '600'
  },
  skip: {
    color: '#007AFF',
    textAlign: 'center',
    marginTop: 8
  }
});

export default OnboardingOverlay;
