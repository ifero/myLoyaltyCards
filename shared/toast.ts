import * as Burnt from 'burnt';

import { logger } from '@/core/utils/logger';

type ToastOptions = Parameters<typeof Burnt.toast>[0];

export const showToast = async (options: ToastOptions) => {
  try {
    if (typeof Burnt.toast !== 'function') {
      logger.warn('[toast] Burnt toast is unavailable');
      return;
    }

    await Burnt.toast(options);
  } catch (error) {
    logger.warn('[toast] Failed to show toast', error);
  }
};
