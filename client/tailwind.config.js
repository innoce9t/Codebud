const slate = Object.fromEntries(
  [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950].map((n) => [
    n,
    `rgb(var(--slate-${n}) / <alpha-value>)`,
  ]),
);
const brand = Object.fromEntries(
  [50, 100, 400, 500, 600, 700].map((n) => [n, `rgb(var(--brand-${n}) / <alpha-value>)`]),
);

/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      // Neutrals are CSS-variable driven so dark mode flips them without editing
      // components (the slate ramp is inverted in .dark). Other named colors
      // (emerald, red, amber, …) remain available via Tailwind defaults.
      colors: {
        slate,
        brand,
        surface: 'rgb(var(--surface) / <alpha-value>)',
      },
      fontFamily: {
        mono: ['"JetBrains Mono"', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
      },
    },
  },
  plugins: [],
};
