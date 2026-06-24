import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}"
  ],
  theme: {
    extend: {
      colors: {
        ink: "#111111",
        paper: "#f5f5f5",
        coral: "#111111",
        gold: "#d4d4d4",
        moss: "#111111",
        blush: "#ededed"
      },
      boxShadow: {
        card: "0 12px 30px rgba(0, 0, 0, 0.06)"
      },
      fontFamily: {
        sans: ["var(--font-sans)", "sans-serif"]
      }
    }
  },
  plugins: []
};

export default config;
