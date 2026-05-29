import type { Config } from 'tailwindcss';

// Brand design tokens. Colours/type/radius/motion are defined here once;
// components must reference these, never hardcode hex.
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    container: {
      center: true,
      padding: '1rem',
      screens: { DEFAULT: '1280px', wide: '1440px' },
    },
    extend: {
      colors: {
        // Red — primary scale (600 is the brand primary)
        red: {
          50: '#FDF2F2', 100: '#FBE0E0', 200: '#F5B5B5', 300: '#EC8585', 400: '#DF5454',
          500: '#D12D2D', 600: '#B81F1F', 700: '#971717', 800: '#741212', 900: '#541010',
        },
        // Graphite — neutral / ink scale (900 is body ink / hero bg)
        graphite: {
          50: '#F6F7F9', 100: '#EBEDF1', 200: '#D6DAE2', 300: '#B4BBC8', 400: '#8892A3',
          500: '#5F6B80', 600: '#434E63', 700: '#2E3647', 800: '#1C222E', 900: '#0E1219',
        },
        ink: '#0E1219',
        muted: '#5F6B80',
        primary: { DEFAULT: '#B81F1F', fg: '#FFFFFF' },
        ember: '#D9761E',
        leaf: '#3F9460',
        info: '#1B5EA6',
        surface: '#F6F7F9',
        page: '#FFFFFF',
        hairline: '#D6DAE2',
      },
      fontFamily: {
        display: ['Fraunces', 'Georgia', 'serif'],
        sans: ['"Inter Tight"', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
      },
      fontSize: {
        hero: ['64px', { lineHeight: '1.05' }],
        h1: ['40px', { lineHeight: '1.1' }],
        h2: ['30px', { lineHeight: '1.15' }],
        h3: ['20px', { lineHeight: '1.3', fontWeight: '600' }],
        lede: ['17px', { lineHeight: '1.5' }],
        body: ['15px', { lineHeight: '1.55' }],
        eyebrow: ['12px', { lineHeight: '1', letterSpacing: '0.18em', fontWeight: '600' }],
        mono: ['14px', { lineHeight: '1.5' }],
      },
      borderRadius: { none: '0', sm: '2px', DEFAULT: '2px', md: '4px', lg: '8px', xl: '16px', pill: '999px' },
      borderColor: { DEFAULT: '#D6DAE2' },
      transitionDuration: { fast: '120ms', base: '200ms', slow: '360ms' },
      transitionTimingFunction: { brand: 'cubic-bezier(0.2,0.7,0.2,1)' },
      maxWidth: { container: '1280px', wide: '1440px' },
    },
  },
  plugins: [],
} satisfies Config;
