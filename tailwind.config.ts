import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        display: ["'Fraunces'", "Georgia", "serif"],
        body: ["'Manrope'", "system-ui", "sans-serif"],
        mono: ["'JetBrains Mono'", "monospace"],
      },
      colors: {
        cream: {
          50:  "#fefcf8",
          100: "#fdf9ed",
          200: "#faf0d4",
          300: "#f5e4b1",
          400: "#efd482",
          500: "#e8c155",
        },
        clay: {
          50:  "#faf6f3",
          100: "#f2ebe3",
          200: "#e4d5c5",
          300: "#d2b89e",
          400: "#bd9573",
          500: "#a87851",
          600: "#8c5e3d",
          700: "#6f4930",
          800: "#543725",
          900: "#3d281a",
        },
        ink: {
          50:  "#f5f3f0",
          100: "#e8e4de",
          200: "#cac3b9",
          300: "#a39991",
          400: "#7a706b",
          500: "#5a5350",
          600: "#3f3a38",
          700: "#2b2826",
          800: "#1a1817",
          900: "#0f0e0d",
        },
        sage: {
          50:  "#f2f6ee",
          100: "#e2ecd9",
          200: "#c7d8b3",
          300: "#9eba7d",
          400: "#799b54",
          500: "#5c7e3d",
          600: "#48652f",
          700: "#3a5027",
          800: "#304121",
          900: "#28371d",
        },
        paper: "#fbf8f2",
      },
      backgroundImage: {
        "warm-mesh": "radial-gradient(at 20% 30%, rgba(232,193,85,0.08) 0px, transparent 50%), radial-gradient(at 80% 70%, rgba(168,120,81,0.06) 0px, transparent 50%)",
        "paper-grain": "radial-gradient(circle at 25% 25%, rgba(168,120,81,0.03) 0%, transparent 50%), radial-gradient(circle at 75% 75%, rgba(232,193,85,0.03) 0%, transparent 50%)",
      },
      animation: {
        "fade-up": "fadeUp 0.7s cubic-bezier(0.22,1,0.36,1) forwards",
        "fade-in": "fadeIn 0.5s ease-out forwards",
        "float": "float 6s ease-in-out infinite",
        "scribble": "scribble 2s ease-in-out infinite",
      },
      keyframes: {
        fadeUp: { "0%": { opacity: "0", transform: "translateY(24px)" }, "100%": { opacity: "1", transform: "translateY(0)" } },
        fadeIn: { "0%": { opacity: "0" }, "100%": { opacity: "1" } },
        float: { "0%, 100%": { transform: "translateY(0px) rotate(-1deg)" }, "50%": { transform: "translateY(-8px) rotate(1deg)" } },
        scribble: { "0%, 100%": { strokeDashoffset: "0" }, "50%": { strokeDashoffset: "20" } },
      },
      boxShadow: {
        "soft": "0 2px 8px rgba(61,40,26,0.06), 0 1px 2px rgba(61,40,26,0.04)",
        "warm": "0 4px 20px rgba(168,120,81,0.12), 0 2px 6px rgba(61,40,26,0.06)",
        "clay": "0 8px 30px rgba(168,120,81,0.18)",
      },
    },
  },
  plugins: [],
};

export default config;
