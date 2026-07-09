import type { Preview } from '@storybook/react-native-web-vite';

// Side-effect: runs `StyleSheet.configure()` so the Unistyles engine has a theme
// registry BEFORE any story mounts `ThemeProvider` (which calls
// `UnistylesRuntime.setTheme`). Mirrors `app/_layout.tsx`. Without this, every
// story crashes on web with "no theme has been selected yet".
import '@/shared/theme/unistyles';

import { StoryDecorator } from './StoryDecorator';

const preview: Preview = {
  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i
      }
    },
    layout: 'fullscreen'
  },
  // Globals can only be declared in preview (Storybook constraint).
  initialGlobals: { theme: 'light' },
  globalTypes: {
    theme: {
      description: 'Color scheme applied via the app ThemeProvider',
      toolbar: {
        title: 'Theme',
        icon: 'contrast',
        items: [
          { value: 'light', title: 'Light', icon: 'sun' },
          { value: 'dark', title: 'Dark', icon: 'moon' }
        ],
        dynamicTitle: true
      }
    }
  },
  decorators: [
    (Story, context) => {
      const theme = context.globals.theme === 'dark' ? 'dark' : 'light';
      return (
        <StoryDecorator theme={theme}>
          <Story />
        </StoryDecorator>
      );
    }
  ]
};

export default preview;
