import { useRouter } from 'expo-router';

import { completeFirstLaunch } from '@/core/settings/settings-repository';

export const useOnboardingFlow = () => {
  const router = useRouter();

  const completeAndGoToAddCard = () => {
    completeFirstLaunch();
    router.replace('/add-card');
  };

  return {
    completeAndGoToAddCard
  };
};
