const {
  SAGE_COLORS,
  CARD_COLORS,
  OLED_COLORS,
  OFFWHITE_COLORS,
  TAILWIND_BACKGROUND_COLORS,
  TAILWIND_SURFACE_COLORS,
  TAILWIND_TEXT_COLORS,
} = require('./shared/theme/colors');
const {
  TAILWIND_SPACING,
  TAILWIND_TOUCH_TARGET,
} = require('./shared/theme/spacing');

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,jsx,ts,tsx}',
    './features/**/*.{js,jsx,ts,tsx}',
    './shared/**/*.{js,jsx,ts,tsx}',
    './core/**/*.{js,jsx,ts,tsx}',
  ],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      // 8px base grid spacing - imported from spacing.ts
      spacing: TAILWIND_SPACING,
      // Accessible color palette - imported from colors.ts
      colors: {
        sage: SAGE_COLORS,
        oled: OLED_COLORS,
        offwhite: OFFWHITE_COLORS,
        card: CARD_COLORS,
        background: TAILWIND_BACKGROUND_COLORS,
        surface: TAILWIND_SURFACE_COLORS,
        text: TAILWIND_TEXT_COLORS,
      },
      // Minimum touch target sizes - imported from spacing.ts
      minWidth: TAILWIND_TOUCH_TARGET,
      minHeight: TAILWIND_TOUCH_TARGET,
    },
  },
  plugins: [],
};
