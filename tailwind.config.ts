import type { Config } from "tailwindcss";

export default {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: "#F97316",
          hover: "#EA580C",
          light: "#FB923C",
        },
        secondary: "#9CA3AF",
        bg: {
          DEFAULT: "#0F0F0F",
          light: "#1A1A1A",
        },
        surface: "#262626",
        border: "#404040",
        text: {
          DEFAULT: "#F5F5F5",
          muted: "#9CA3AF",
        },
      },
      fontFamily: {
        sans: ["system-ui", "-apple-system", "sans-serif"],
      },
      animation: {
        "pulse-glow": "pulse-glow 2s ease-in-out infinite",
        float: "float 3s ease-in-out infinite",
      },
      keyframes: {
        "pulse-glow": {
          "0%, 100%": { boxShadow: "0 0 20px rgba(249, 115, 22, 0.3)" },
          "50%": { boxShadow: "0 0 40px rgba(249, 115, 22, 0.6)" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-10px)" },
        },
      },
    },
  },
  plugins: [],
} satisfies Config;
