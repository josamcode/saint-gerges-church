/** @type {import('tailwindcss').Config} */
const cssVarColor = (name) => `rgb(var(${name}) / <alpha-value>)`;

module.exports = {
  content: ['./src/**/*.{js,jsx}', './public/index.html'],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        cairo: ['Cairo', 'sans-serif'],
      },
      colors: {
        primary: {
          DEFAULT: cssVarColor('--color-primary-rgb'),
          light: cssVarColor('--color-primary-light-rgb'),
          dark: cssVarColor('--color-primary-dark-rgb'),
        },
        secondary: {
          DEFAULT: cssVarColor('--color-secondary-rgb'),
        },
        accent: {
          DEFAULT: cssVarColor('--color-accent-rgb'),
        },
        surface: {
          DEFAULT: cssVarColor('--color-surface-rgb'),
          alt: cssVarColor('--color-surface-alt-rgb'),
        },
        border: {
          DEFAULT: cssVarColor('--color-border-rgb'),
        },
        muted: {
          DEFAULT: cssVarColor('--color-muted-rgb'),
        },
        danger: {
          DEFAULT: cssVarColor('--color-danger-rgb'),
          light: cssVarColor('--color-danger-light-rgb'),
        },
        success: {
          DEFAULT: cssVarColor('--color-success-rgb'),
          light: cssVarColor('--color-success-light-rgb'),
        },
        warning: {
          DEFAULT: cssVarColor('--color-warning-rgb'),
          light: cssVarColor('--color-warning-light-rgb'),
        },
        info: {
          DEFAULT: cssVarColor('--color-info-rgb'),
        },
      },
      backgroundColor: {
        page: cssVarColor('--color-bg-rgb'),
      },
      textColor: {
        base: cssVarColor('--color-text-rgb'),
        heading: cssVarColor('--color-text-heading-rgb'),
      },
      borderRadius: {
        sm: '0.375rem',
        md: '0.5rem',
        lg: '0.75rem',
        xl: '1rem',
      },
      boxShadow: {
        card: '0 1px 3px 0 rgba(0, 0, 0, 0.06), 0 1px 2px 0 rgba(0, 0, 0, 0.04)',
        dropdown: '0 4px 6px -1px rgba(0, 0, 0, 0.08), 0 2px 4px -1px rgba(0, 0, 0, 0.04)',
        modal: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
      },
    },
  },
  plugins: [],
};
