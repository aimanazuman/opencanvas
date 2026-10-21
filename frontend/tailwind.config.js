const accent = {
  50: '#EAF3FC', 100: '#D3E6F8', 200: '#A8CDF0', 300: '#74AEE5', 400: '#3F8AD4',
  500: '#1F76CB', 600: '#0A66C2', 700: '#0856A3', 800: '#0A4580', 900: '#0B3866',
};

// Neutral greys (replace the default blue-tinted grey scale).
const gray = {
  50: '#F7F7F7', 100: '#F2F2F2', 200: '#E2E2E2', 300: '#CFCFCF', 400: '#8A8A8A',
  500: '#6B6B6B', 600: '#5C5C5C', 700: '#404040', 800: '#2B2B2B', 900: '#1A1A1A',
};

/** @type {import('tailwindcss').Config} */
module.exports = {
  // Test files are excluded so selector strings in tests never generate unconditional utilities.
  content: ['./src/**/*.{js,jsx,ts,tsx}', '!./src/**/*.test.{js,jsx}', '!./src/testUtils/**', '!./src/setupTests.js'],
  theme: {
    extend: {
      colors: {
        canvas: 'var(--canvas)',
        surface: { DEFAULT: 'var(--surface)', hover: 'var(--surface-hover)' },
        line: 'var(--line)',
        'line-strong': 'var(--line-strong)',
        danger: { DEFAULT: 'var(--danger)', tint: 'var(--danger-tint)' },
        success: { DEFAULT: 'var(--success)', tint: 'var(--success-tint)' },
        warning: { DEFAULT: 'var(--warning)', tint: 'var(--warning-tint)' },
        ink: { DEFAULT: 'var(--ink)', 2: 'var(--ink-2)', 3: 'var(--ink-3)' },
        accent: { ...accent, DEFAULT: 'var(--accent)', hover: 'var(--accent-hover)', tint: 'var(--accent-tint)' },
        gray,
        slate: gray,
        // Classroom palette (public home page only). Flat fills; stays inside the approved hue families.
        wall: '#F6F4EE',
        chalk: { board: '#2F4D3C', deep: '#243D30', ink: '#F5F3EA', dust: '#D3E2D6' },
        wood: { DEFAULT: '#8B5E3C', light: '#B98459', dark: '#4A3120', cream: '#EFE3D0' },
        paper: { DEFAULT: '#FFFCF4', rule: '#BFD6EA', margin: '#D9534F' },
        cork: '#C99A6B',
        note: { azure: '#DCEBFA', amber: '#FFF0B0', green: '#DDF2DF', teal: '#CFEFEC', orange: '#FCE0C8' },
      },
      fontFamily: {
        sans: ['system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'Helvetica Neue', 'Arial', 'sans-serif'],
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'Consolas', 'monospace'],
        // Handwriting for the classroom headline only. System fonts, no download.
        hand: ["'Segoe Print'", "'Bradley Hand'", "'Chalkboard SE'", "'Comic Sans MS'", 'cursive'],
      },
      fontSize: {
        '2xs': ['11px', '16px'], xs: ['12px', '16px'], sm: ['13px', '20px'],
        base: ['14px', '20px'], lg: ['16px', '24px'], xl: ['20px', '28px'], '2xl': ['24px', '32px'],
      },
      borderRadius: { sm: '2px', DEFAULT: '4px', md: '4px', lg: '6px', xl: '8px' },
      boxShadow: {
        float: '0 1px 3px rgba(0,0,0,.12), 0 0 0 1px rgba(0,0,0,.06)',
        pop: '0 4px 12px rgba(0,0,0,.14), 0 0 0 1px rgba(0,0,0,.08)',
        modal: '0 8px 24px rgba(0,0,0,.18), 0 0 0 1px rgba(0,0,0,.08)',
      },
      transitionTimingFunction: { ui: 'cubic-bezier(.2,0,0,1)' },
      // Motion. Only opacity and transform. Use with the `motion-safe:` variant so reduced-motion users get none.
      keyframes: {
        'oc-rise': {
          '0%': { opacity: '0', transform: 'translate3d(0,12px,0)' },
          '100%': { opacity: '1', transform: 'translate3d(0,0,0)' },
        },
        'oc-fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        'oc-draw': {
          '0%': { transform: 'scaleX(0)' },
          '100%': { transform: 'scaleX(1)' },
        },
        // The one ambient loop on the site: a very slight opacity breathing on the chalk underline.
        'oc-breathe': {
          '0%, 100%': { opacity: '0.7' },
          '50%': { opacity: '1' },
        },
      },
      animation: {
        'oc-rise': 'oc-rise 350ms cubic-bezier(.2,0,0,1) both',
        'oc-fade-in': 'oc-fade-in 150ms cubic-bezier(.2,0,0,1) both',
        'oc-draw': 'oc-draw 600ms cubic-bezier(.2,0,0,1) 300ms both',
        'oc-breathe': 'oc-breathe 6s ease-in-out 1s infinite',
      },
    },
  },
  plugins: [],
};
