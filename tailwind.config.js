const {
  PRIMARY_COLORS,
  CARD_COLORS,
  NEUTRAL_COLORS,
  TAILWIND_BORDER_COLORS,
  TAILWIND_BACKGROUND_COLORS,
  TAILWIND_SURFACE_COLORS,
  TAILWIND_TEXT_COLORS
} = require('./shared/theme/colors');
const { TAILWIND_SPACING, TAILWIND_TOUCH_TARGET } = require('./shared/theme/spacing');
const { TAILWIND_FONT_SIZE } = require('./shared/theme/typography');

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,jsx,ts,tsx}',
    './features/**/*.{js,jsx,ts,tsx}',
    './shared/**/*.{js,jsx,ts,tsx}',
    './core/**/*.{js,jsx,ts,tsx}'
  ],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      // 8px base grid spacing - imported from spacing.ts
      spacing: TAILWIND_SPACING,
      // Accessible color palette - imported from colors.ts
      colors: {
        primary: PRIMARY_COLORS,
        neutral: NEUTRAL_COLORS,
        card: CARD_COLORS,
        background: TAILWIND_BACKGROUND_COLORS,
        surface: TAILWIND_SURFACE_COLORS,
        text: TAILWIND_TEXT_COLORS,
        border: TAILWIND_BORDER_COLORS
      },
      fontSize: TAILWIND_FONT_SIZE,
      // Minimum touch target sizes - imported from spacing.ts
      minWidth: TAILWIND_TOUCH_TARGET,
      minHeight: TAILWIND_TOUCH_TARGET
    }
  },
  plugins: []
};
