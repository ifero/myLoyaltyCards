import { useRouter } from 'expo-router';

export const useModeSelection = () => {
  const router = useRouter();

  const selectLocalMode = () => {
    router.push('/onboarding/highlights');
  };

  const selectCloudMode = () => {
    router.push('/create-account');
  };

  return {
    selectLocalMode,
    selectCloudMode
  };
};
