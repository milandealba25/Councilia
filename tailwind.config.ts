import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        elevated: "var(--surface-elevated)",
        border: "var(--border)",
        muted: "var(--text-muted)",
        accent: "var(--accent)",
        "accent-muted": "var(--accent-muted)",
        tension: "var(--tension)",
        error: "var(--error)",
      },
      fontFamily: {
        sans: ["var(--font-geist-sans)", "system-ui", "sans-serif"],
        mono: ["var(--font-geist-mono)", "ui-monospace", "monospace"],
      },
      borderRadius: {
        council: "0.5rem",
      },
      boxShadow: {
        council: "0 1px 0 0 rgb(255 255 255 / 0.04) inset, 0 12px 40px rgb(0 0 0 / 0.35)",
      },
    },
  },
  plugins: [],
};
export default config;
