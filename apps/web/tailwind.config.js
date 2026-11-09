/** @type {import('tailwindcss').Config} */
const v = (name) => `rgb(var(--${name}) / <alpha-value>)`;

export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        paper: v("paper"),
        card: v("card"),
        ink: v("ink"),
        muted: v("muted"),
        line: v("line"),
        brand: v("brand"),
        "brand-soft": v("brand-soft"),
        saffron: v("saffron"),
        "saffron-ink": v("saffron-ink"),
        ok: v("ok"),
        "ok-soft": v("ok-soft"),
        flag: v("flag"),
        "flag-soft": v("flag-soft"),
        warn: v("warn"),
        "warn-soft": v("warn-soft"),
      },
      fontFamily: {
        display: ["Fraunces", "Georgia", "'Noto Serif Devanagari'", "serif"],
        sans: [
          "Figtree",
          "'Noto Sans Devanagari'",
          "'Noto Sans Bengali'",
          "'Noto Sans Tamil'",
          "'Noto Sans Telugu'",
          "'Noto Sans Gujarati'",
          "'Noto Sans Kannada'",
          "'Noto Sans Malayalam'",
          "'Noto Sans Gurmukhi'",
          "'Noto Sans Oriya'",
          "system-ui",
          "sans-serif",
        ],
        mono: ["'JetBrains Mono'", "ui-monospace", "monospace"],
      },
      borderRadius: {
        xl: "14px",
        "2xl": "20px",
      },
      boxShadow: {
        paper: "0 1px 0 rgb(var(--line)), 0 12px 32px -18px rgb(var(--shadow) / 0.35)",
        lift: "0 24px 48px -24px rgb(var(--shadow) / 0.45)",
      },
    },
  },
  plugins: [],
};
