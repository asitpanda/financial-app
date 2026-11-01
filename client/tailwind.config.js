/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  important: '#root', // To work alongside Material UI
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: 'var(--app-primary)',
          50: 'color-mix(in srgb, var(--app-primary) 8%, var(--app-surface))',
          100: 'color-mix(in srgb, var(--app-primary) 16%, var(--app-surface))',
          200: 'color-mix(in srgb, var(--app-primary) 32%, var(--app-surface))',
          300: 'color-mix(in srgb, var(--app-primary) 50%, var(--app-surface))',
          400: 'color-mix(in srgb, var(--app-primary) 75%, var(--app-surface))',
          500: 'var(--app-primary)',
          600: 'color-mix(in srgb, var(--app-primary) 90%, var(--app-text))',
          700: 'color-mix(in srgb, var(--app-primary) 75%, var(--app-text))',
          800: 'color-mix(in srgb, var(--app-primary) 60%, var(--app-text))',
          900: 'color-mix(in srgb, var(--app-primary) 45%, var(--app-text))',
        },
      },
    },
  },
  plugins: [],
  corePlugins: {
    // Disable preflight to avoid conflicts with Material UI
    preflight: false,
  },
};
