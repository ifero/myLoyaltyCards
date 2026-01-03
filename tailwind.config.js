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
      // 8px base grid spacing
      spacing: {
        '0.5': '4px',
        '1': '8px',
        '1.5': '12px',
        '2': '16px',
        '2.5': '20px',
        '3': '24px',
        '3.5': '28px',
        '4': '32px',
        '4.5': '36px',
        '5': '40px',
        '5.5': '44px', // Minimum touch target
        '6': '48px',
        '7': '56px',
        '8': '64px',
        '9': '72px',
        '10': '80px',
      },
      // Accessible color palette from design spec
      colors: {
        // Primary Sage Green palette
        sage: {
          50: '#f4f9f4',
          100: '#e8f3e8',
          200: '#c5dfc5',
          300: '#a2cba2',
          400: '#8cbf8c',
          500: '#73A973', // Primary Sage Green
          600: '#5c9a5c',
          700: '#4a7d4a',
          800: '#3a623a',
          900: '#2d4d2d',
        },
        // OLED Black for dark mode backgrounds
        oled: {
          black: '#000000',
        },
        // Off-white for light mode backgrounds
        offwhite: {
          DEFAULT: '#FAFAFA',
          50: '#FFFFFF',
          100: '#FAFAFA',
          200: '#F5F5F5',
        },
        // 5-color card palette
        card: {
          blue: '#3B82F6',
          red: '#EF4444',
          green: '#22C55E',
          orange: '#F97316',
          grey: '#6B7280',
        },
        // Semantic colors for light/dark mode
        background: {
          light: '#FAFAFA', // Off-white
          dark: '#000000', // OLED black
        },
        surface: {
          light: '#FFFFFF',
          dark: '#1A1A1A',
        },
        text: {
          primary: {
            light: '#1F2937',
            dark: '#FFFFFF',
          },
          secondary: {
            light: '#6B7280',
            dark: '#9CA3AF',
          },
        },
      },
      // Minimum touch target sizes (44x44px)
      minWidth: {
        'touch': '44px',
      },
      minHeight: {
        'touch': '44px',
      },
    },
  },
  plugins: [],
};
