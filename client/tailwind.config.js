import defaultTheme from 'tailwindcss/defaultTheme';

export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        background: '#FAFAF8',
        foreground: '#1A1A1A',
        muted: '#F5F3F0',
        mutedFg: '#6B6B6B',
        accent: '#B8860B',
        accentFg: '#FFFFFF',
        secondary: '#E9DED0',
        tertiary: '#D4A84B',
        quaternary: '#7AA36A',
        card: '#FFFFFF',
        border: '#E8E4DF',
        ring: '#B8860B',
        editorialBg: '#FAFAF8',
        editorialFg: '#1A1A1A',
        editorialMuted: '#F5F3F0',
        editorialMutedFg: '#6B6B6B',
        editorialAccent: '#B8860B',
        editorialAccentSecondary: '#D4A84B',
        editorialCard: '#FFFFFF',
        editorialBorder: '#E8E4DF',
        editorialRing: '#B8860B',
      },
      fontFamily: {
        heading: ['"Playfair Display"', 'Georgia', 'serif'],
        body: ['"Source Sans 3"', ...defaultTheme.fontFamily.sans],
        editorial: ['"Playfair Display"', 'Georgia', 'serif'],
        editorialBody: ['"Source Sans 3"', ...defaultTheme.fontFamily.sans],
        editorialMono: ['"IBM Plex Mono"', ...defaultTheme.fontFamily.mono],
      },
      borderRadius: {
        sm: '0.75rem',
        md: '1.25rem',
        lg: '1.75rem',
        full: '9999px',
      },
      boxShadow: {
        pop: '0 4px 12px rgba(26, 26, 26, 0.06)',
        'pop-hover': '0 8px 24px rgba(26, 26, 26, 0.08)',
        'pop-press': '0 2px 8px rgba(26, 26, 26, 0.08)',
        'pop-pink': '0 8px 24px rgba(184, 134, 11, 0.16)',
        'pop-soft': '0 8px 24px rgba(26, 26, 26, 0.08)',
        editorialSm: '0 1px 2px rgba(26, 26, 26, 0.04)',
        editorialMd: '0 4px 12px rgba(26, 26, 26, 0.06)',
        editorialLg: '0 8px 24px rgba(26, 26, 26, 0.08)',
      },
      transitionTimingFunction: {
        bounce: 'cubic-bezier(0.16, 1, 0.3, 1)',
      },
      keyframes: {
        wiggle: {
          '0%, 100%': { transform: 'rotate(-3deg)' },
          '50%': { transform: 'rotate(3deg)' },
        },
        shake: {
          '0%': { transform: 'translateX(0)' },
          '20%': { transform: 'translateX(-8px)' },
          '40%': { transform: 'translateX(8px)' },
          '60%': { transform: 'translateX(-4px)' },
          '80%': { transform: 'translateX(4px)' },
          '100%': { transform: 'translateX(0)' },
        },
        'pop-in': {
          '0%': { opacity: '0', transform: 'scale(0.9) translateY(10px)' },
          '100%': { opacity: '1', transform: 'scale(1) translateY(0)' },
        },
      },
      animation: {
        wiggle: 'wiggle 0.8s ease-in-out infinite',
        shake: 'shake 0.45s ease-in-out',
        'pop-in': 'pop-in 0.35s cubic-bezier(0.34, 1.56, 0.64, 1)',
      },
    },
  },
  plugins: [],
};
