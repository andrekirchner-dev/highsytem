export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: "#0E120E", surface: "#161D16", "surface-2": "#1E281E",
        border: "#2A352A", text: "#ECEFE6", "text-muted": "#93A092",
        primary: "#8BE04E", "primary-glow": "#9DFF6B",
        amber: "#FF7A1A", violet: "#7C5CFF",
        danger: "#FF4D4D", success: "#8BE04E", warning: "#FFC53D",
      },
      fontFamily: {
        display: ["'Clash Display'", "sans-serif"],
        body: ["'Satoshi'", "sans-serif"],
        mono: ["'JetBrains Mono'", "monospace"],
      },
    },
  },
  plugins: [],
};
