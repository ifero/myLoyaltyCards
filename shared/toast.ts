import * as Burnt from 'burnt';

type ToastOptions = Parameters<typeof Burnt.toast>[0];

export const showToast = async (options: ToastOptions) => {
  try {
    if (typeof Burnt.toast !== 'function') {
      console.warn('[toast] Burnt toast is unavailable');
      return;
    }

    await Burnt.toast(options);
  } catch (error) {
    console.warn('[toast] Failed to show toast', error);
  }
};
