import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  View,
  Text,
  ScrollView,
  TextInput
} from 'react-native';

import { catalogueRepository } from '@/core/catalogue/catalogue-repository';
import { clearLastSyncAt } from '@/core/sync/sync-timestamp';

import { deleteAccount, signOut } from '@/shared/supabase/auth';
import { useAuthState } from '@/shared/supabase/useAuthState';
import { useTheme } from '@/shared/theme';

/**
 * Settings Screen
 *
 * Story 1.5: Placeholder screen for app settings.
 * Story 6.5: Guest mode — shows guest mode badge and upgrade path to account creation.
 * Story 6.9: Logout — conditional rendering based on auth state, confirmation dialog.
 * Story 6-11: Privacy & Consent — Data & Privacy section shown only to authenticated users.
 * Story 6.10: Delete Account — multi-step confirmation, GDPR erasure.
 */
const SettingsScreen = () => {
  const { theme } = useTheme();
  const router = useRouter();
  const catalogueVersion = catalogueRepository.getVersion();
  const { isAuthenticated, authState } = useAuthState();

  const [signOutError, setSignOutError] = useState<string | null>(null);

  // Delete Account state (Story 6.10)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deleteSuccess, setDeleteSuccess] = useState(false);
  const deleteSuccessTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearLastSyncAtSafely = async (): Promise<void> => {
    try {
      await clearLastSyncAt();
    } catch (error) {
      console.error('[SettingsScreen] Failed to clear lastSyncAt', error);
    }
  };

  useEffect(() => {
    return () => {
      if (deleteSuccessTimeoutRef.current) {
        clearTimeout(deleteSuccessTimeoutRef.current);
      }
    };
  }, []);

  const confirmSignOut = async () => {
    setSignOutError(null);
    const result = await signOut();
    if (!result.success) {
      setSignOutError(result.error.message);
      return;
    }
    // Clear sync timestamp so next sign-in triggers a full sync (Story 7.4)
    await clearLastSyncAtSafely();
    // Return to home screen in guest mode — local cards remain accessible
    router.replace('/');
  };

  const handleSignOutPress = () => {
    Alert.alert(
      'Sign Out?',
      'You will return to guest mode. Your cards will remain on this device.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Sign Out', style: 'destructive', onPress: confirmSignOut }
      ]
    );
  };

  // ── Delete Account handlers (Story 6.10) ──

  const handleDeleteAccountPress = () => {
    Alert.alert(
      'Delete Account?',
      'This will permanently delete your cloud account and all synced data. Your local cards will remain on this device. This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Continue', style: 'destructive', onPress: () => setShowDeleteConfirm(true) }
      ]
    );
  };

  const handleDeleteConfirm = async () => {
    setIsDeleting(true);
    setDeleteError(null);

    const result = await deleteAccount();

    setIsDeleting(false);

    if (!result.success) {
      setDeleteError(result.error.message);
      return;
    }

    // Clear sync timestamp so next sign-in triggers a full sync (Story 7.4)
    await clearLastSyncAtSafely();

    // Close modal, show success, navigate
    setShowDeleteConfirm(false);
    setDeleteConfirmText('');
    setDeleteSuccess(true);

    // Brief delay so user sees the success banner before navigating
    if (deleteSuccessTimeoutRef.current) {
      clearTimeout(deleteSuccessTimeoutRef.current);
    }

    deleteSuccessTimeoutRef.current = setTimeout(() => {
      setDeleteSuccess(false);
      router.replace('/');
    }, 2000);
  };

  const handleDeleteCancel = () => {
    setShowDeleteConfirm(false);
    setDeleteConfirmText('');
    setDeleteError(null);
  };

  return (
    <ScrollView
      contentContainerStyle={{ flexGrow: 1, padding: 16, backgroundColor: theme.background }}
      style={{ backgroundColor: theme.background }}
    >
      {/* Guest mode sections — visible only when NOT authenticated */}
      {!isAuthenticated && authState !== 'loading' && (
        <>
          {/* Guest mode badge */}
          <View
            testID="settings-guest-badge"
            className="mb-6 w-full rounded-xl p-4"
            style={{ backgroundColor: theme.surface }}
          >
            <View className="mb-2 flex-row items-center">
              <Text className="mr-2 text-base">👤</Text>
              <Text className="text-base font-semibold" style={{ color: theme.textPrimary }}>
                Guest Mode
              </Text>
            </View>
            <Text className="text-sm leading-5" style={{ color: theme.textSecondary }}>
              {"You're using the app as a guest. Your cards are stored only on this device."}
            </Text>
          </View>

          {/* Create Account section */}
          <View
            testID="settings-create-account-section"
            className="mb-6 w-full rounded-xl p-4"
            style={{ backgroundColor: theme.surface }}
          >
            <Text className="mb-2 text-base font-semibold" style={{ color: theme.textPrimary }}>
              Create an Account
            </Text>
            <Text className="mb-4 text-sm leading-5" style={{ color: theme.textSecondary }}>
              Upgrade to back up and sync your cards across devices. Your existing cards will be
              preserved.
            </Text>
            <Pressable
              testID="settings-create-account-button"
              onPress={() => router.push('/create-account')}
              accessibilityRole="button"
              accessibilityLabel="Create Account"
              accessibilityHint="Create an account to back up and sync your cards"
              className="w-full items-center justify-center rounded-xl"
              style={({ pressed }) => ({
                backgroundColor: pressed ? theme.primaryDark : theme.primary,
                height: 48,
                transform: [{ scale: pressed ? 0.98 : 1 }]
              })}
            >
              <Text className="text-sm font-semibold text-white">Create Account</Text>
            </Pressable>
          </View>

          {/* Sign In section */}
          <View
            testID="settings-sign-in-section"
            className="mb-6 w-full rounded-xl p-4"
            style={{ backgroundColor: theme.surface }}
          >
            <Text className="mb-2 text-base font-semibold" style={{ color: theme.textPrimary }}>
              Already have an account?
            </Text>
            <Text className="mb-4 text-sm leading-5" style={{ color: theme.textSecondary }}>
              Sign in to restore your backed-up cards and sync across devices.
            </Text>
            <Pressable
              testID="settings-sign-in-button"
              onPress={() => router.push('/sign-in')}
              accessibilityRole="button"
              accessibilityLabel="Sign In"
              accessibilityHint="Sign in to your account"
              className="w-full items-center justify-center rounded-xl"
              style={({ pressed }) => ({
                backgroundColor: pressed ? theme.primaryDark : theme.primary,
                height: 48,
                transform: [{ scale: pressed ? 0.98 : 1 }]
              })}
            >
              <Text className="text-sm font-semibold text-white">Sign In</Text>
            </Pressable>
          </View>
        </>
      )}

      {/* Sign Out section — visible only when authenticated */}
      {isAuthenticated && (
        <View
          testID="settings-sign-out-section"
          className="mb-6 w-full rounded-xl p-4"
          style={{ backgroundColor: theme.surface }}
        >
          <Pressable
            testID="settings-sign-out-button"
            onPress={handleSignOutPress}
            accessibilityRole="button"
            accessibilityLabel="Sign Out"
            accessibilityHint="Sign out of your account"
            className="w-full items-center justify-center rounded-xl"
            style={({ pressed }) => ({
              backgroundColor: pressed ? '#dc2626' : '#ef4444',
              height: 48,
              transform: [{ scale: pressed ? 0.98 : 1 }]
            })}
          >
            <Text className="text-sm font-semibold text-white">Sign Out</Text>
          </Pressable>
          {signOutError && (
            <Text
              testID="sign-out-error"
              className="mt-2 text-xs"
              style={{ color: '#EF4444' }}
              accessibilityRole="alert"
            >
              {signOutError}
            </Text>
          )}
        </View>
      )}

      {/* Data & Privacy section — visible only when authenticated */}
      {isAuthenticated && (
        <View
          testID="settings-data-privacy-section"
          className="mb-6 w-full rounded-xl p-4"
          style={{ backgroundColor: theme.surface }}
        >
          <Text className="mb-3 text-base font-semibold" style={{ color: theme.textPrimary }}>
            Data & Privacy
          </Text>
          <Pressable
            testID="settings-data-summary"
            onPress={() => router.push('/data-summary')}
            accessibilityRole="button"
            accessibilityLabel="What We Collect"
            accessibilityHint="View a summary of collected data"
            className="mb-2 rounded-lg px-3 py-3"
            style={({ pressed }) => ({
              backgroundColor: pressed ? theme.border : 'transparent'
            })}
          >
            <Text className="text-sm font-medium" style={{ color: theme.textPrimary }}>
              What We Collect
            </Text>
            <Text className="mt-0.5 text-xs" style={{ color: theme.textSecondary }}>
              View a summary of the data we collect
            </Text>
          </Pressable>
        </View>
      )}

      {/* Delete Account section — visible only when authenticated (Story 6.10) */}
      {isAuthenticated && (
        <View
          testID="settings-delete-account-section"
          className="mb-6 w-full rounded-xl p-4"
          style={{ backgroundColor: theme.surface }}
        >
          <Pressable
            testID="settings-delete-account-button"
            onPress={handleDeleteAccountPress}
            accessibilityRole="button"
            accessibilityLabel="Delete Account"
            accessibilityHint="Permanently delete your cloud account and all associated data"
            className="w-full items-center justify-center rounded-xl"
            style={({ pressed }) => ({
              backgroundColor: pressed ? '#991b1b' : '#b91c1c',
              height: 48,
              transform: [{ scale: pressed ? 0.98 : 1 }]
            })}
          >
            <Text className="text-sm font-semibold text-white">Delete Account</Text>
          </Pressable>
        </View>
      )}

      {/* Success banner (Story 6.10 AC#7) */}
      {deleteSuccess && (
        <View
          testID="delete-account-success"
          className="mb-6 w-full rounded-xl p-4"
          style={{ backgroundColor: '#065f46' }}
          accessibilityRole="alert"
        >
          <Text className="text-center text-sm font-semibold text-white">
            Account deleted. You are now in guest mode.
          </Text>
        </View>
      )}

      {/* Catalogue version */}
      <View className="mb-6 items-center">
        <Text className="text-sm font-semibold" style={{ color: theme.textPrimary }}>
          Catalogue Version
        </Text>
        <Text className="text-sm" style={{ color: theme.textSecondary }}>
          {catalogueVersion}
        </Text>
      </View>

      <Pressable
        testID="settings-help-faq"
        onPress={() => router.push('/help')}
        accessibilityRole="button"
        accessibilityLabel="Help & FAQ"
        accessibilityHint="Opens help and frequently asked questions"
        className="mb-4 items-center"
      >
        <Text className="text-sm font-semibold" style={{ color: theme.primary }}>
          {'Help & FAQ'}
        </Text>
      </Pressable>

      <Pressable
        testID="settings-privacy-policy"
        onPress={() => router.push('/privacy-policy')}
        accessibilityRole="button"
        accessibilityLabel="Privacy Policy"
        accessibilityHint="Opens the privacy policy"
        className="items-center"
      >
        <Text className="text-sm font-semibold" style={{ color: theme.primary }}>
          Privacy Policy
        </Text>
      </Pressable>

      {/* Delete Account Confirmation Modal (Story 6.10 — Step 2) */}
      <Modal
        visible={showDeleteConfirm}
        transparent
        animationType="fade"
        onRequestClose={handleDeleteCancel}
        testID="delete-account-modal"
      >
        <View
          className="flex-1 items-center justify-center"
          style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
        >
          <View
            className="mx-6 w-full max-w-sm rounded-2xl p-6"
            style={{ backgroundColor: theme.surface }}
          >
            <Text className="mb-2 text-lg font-bold" style={{ color: theme.textPrimary }}>
              Confirm Account Deletion
            </Text>
            <Text className="mb-4 text-sm leading-5" style={{ color: theme.textSecondary }}>
              {
                'Type "DELETE" below to permanently delete your account and all cloud data. This cannot be undone.'
              }
            </Text>

            <TextInput
              testID="delete-confirm-input"
              value={deleteConfirmText}
              onChangeText={setDeleteConfirmText}
              placeholder='Type "DELETE" to confirm'
              autoCapitalize="characters"
              editable={!isDeleting}
              className="mb-4 rounded-lg border px-4 py-3"
              style={{
                borderColor: theme.border,
                color: theme.textPrimary,
                backgroundColor: theme.background
              }}
            />

            {deleteError && (
              <Text
                testID="delete-account-error"
                className="mb-3 text-xs"
                style={{ color: '#EF4444' }}
                accessibilityRole="alert"
              >
                {deleteError}
              </Text>
            )}

            <View className="flex-row justify-end gap-3">
              <Pressable
                testID="delete-cancel-button"
                onPress={handleDeleteCancel}
                disabled={isDeleting}
                accessibilityRole="button"
                accessibilityLabel="Cancel"
                className="rounded-xl px-5 py-3"
                style={{ backgroundColor: theme.border }}
              >
                <Text className="text-sm font-medium" style={{ color: theme.textPrimary }}>
                  Cancel
                </Text>
              </Pressable>

              <Pressable
                testID="delete-confirm-button"
                onPress={handleDeleteConfirm}
                disabled={deleteConfirmText !== 'DELETE' || isDeleting}
                accessibilityRole="button"
                accessibilityLabel="Permanently Delete My Account"
                className="rounded-xl px-5 py-3"
                style={{
                  backgroundColor:
                    deleteConfirmText === 'DELETE' && !isDeleting ? '#b91c1c' : '#d1d5db',
                  opacity: deleteConfirmText === 'DELETE' && !isDeleting ? 1 : 0.5
                }}
              >
                {isDeleting ? (
                  <ActivityIndicator testID="delete-loading-indicator" size="small" color="#fff" />
                ) : (
                  <Text className="text-sm font-semibold text-white">Delete</Text>
                )}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
};

export default SettingsScreen;
