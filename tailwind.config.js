/** @type {import('tailwindcss').Config} */
// Moved from the inline `tailwind.config` in index.html (Tailwind's Play CDN, which
// compiled CSS in the browser on every page load and isn't meant for production).
export default {
  content: [
    "./index.html",
    "./App.tsx",
    "./index.tsx",
    "./pages/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./context/**/*.{ts,tsx}",
    "./hooks/**/*.{ts,tsx}",
    "./constants/**/*.{ts,tsx}",
    "./util/**/*.{ts,tsx}",
    "./services/**/*.{ts,tsx}",
  ],
  // ThemeContext puts `dark` on <html> (from the Light/Dark/System setting). The CDN
  // default was "media", so choosing Dark or Light in Settings had no visible effect.
  darkMode: "class",
  theme: {
    extend: {
      fontFamily: {
        sans: ["Plus Jakarta Sans", "sans-serif"],
        display: ["Bricolage Grotesque", "Plus Jakarta Sans", "sans-serif"],
      },
      // Orbyt design tokens (shared with the native app):
      //  - primary = Orbyt blue, the brand colour for actions and selection
      //  - rose/red stay reserved for social moments (likes, waves, matches)
      //  - slate is retuned to the night-navy surfaces, so every bg-slate-* /
      //    border-slate-* in the app picks up the new look automatically
      colors: {
        primary: {
          50: "#EEF3FF",
          100: "#DCE6FF",
          200: "#B9CCFF",
          300: "#8FAEFF",
          400: "#6B91FF",
          500: "#4F7CFF",
          600: "#3563F0",
          700: "#2A4FCC",
          800: "#233F9F",
          900: "#1E347D",
        },
        slate: {
          50: "#F6F8FD",
          100: "#ECF0FA",
          200: "#DCE3F5",
          300: "#C2CBE6",
          400: "#98A3C7",
          500: "#6B76A0",
          600: "#45507A",
          700: "#2A3560",
          800: "#1A2347",
          900: "#0D1430",
          950: "#070B1A",
        },
      },
    },
  },
  plugins: [],
};
