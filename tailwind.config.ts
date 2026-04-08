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
        ink: "#18222d",
        paper: "#f6f1e8",
        coral: "#ff8d6c",
        gold: "#f4c95d",
        moss: "#5e7a64",
        blush: "#f9ddd2"
      },
      boxShadow: {
        card: "0 18px 50px rgba(24, 34, 45, 0.12)"
      },
      fontFamily: {
        sans: ["var(--font-sans)", "sans-serif"]
      }
    }
  },
  plugins: []
};

export default config;
