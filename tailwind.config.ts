import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
      },
      fontFamily: {
        sans: [
          "var(--font-wanted)",
          "Wanted Sans Variable",
          "Wanted Sans",
          "ui-sans-serif",
          "system-ui",
          "sans-serif",
        ],
        mono: [
          "var(--font-jetbrains-mono)",
          "var(--font-geist-mono)",
          "ui-monospace",
          "SFMono-Regular",
          "Menlo",
          "monospace",
        ],
        en: ["var(--font-inter)", "var(--font-wanted)", "ui-sans-serif", "system-ui", "sans-serif"],
        parchment: [
          "var(--font-merriweather)",
          "var(--font-wanted)",
          "Georgia",
          "serif",
        ],
      },
    },
  },
  plugins: [],
};
export default config;
