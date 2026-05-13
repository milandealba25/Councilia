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
        surface: "var(--surface)",
        "surface-soft": "var(--surface-soft)",
        elevated: "var(--surface-elevated)",
        foreground: "var(--foreground)",
        "foreground-soft": "var(--foreground-soft)",
        border: "var(--border)",
        "border-strong": "var(--border-strong)",
        muted: "var(--text-muted)",
        subtle: "var(--text-subtle)",
        accent: "var(--accent)",
        "accent-strong": "var(--accent-strong)",
        "accent-soft": "var(--accent-soft)",
        "accent-foreground": "var(--accent-foreground)",
        marco: "var(--marco)",
        "marco-soft": "var(--marco-soft)",
        elena: "var(--elena)",
        "elena-soft": "var(--elena-soft)",
        rafael: "var(--rafael)",
        "rafael-soft": "var(--rafael-soft)",
        tension: "var(--tension)",
        error: "var(--error)",
      },
      fontFamily: {
        sans: ["var(--font-geist-sans)", "system-ui", "sans-serif"],
        mono: ["var(--font-geist-mono)", "ui-monospace", "monospace"],
      },
      borderRadius: {
        council: "0.75rem",
        "council-lg": "1.25rem",
        "council-xl": "1.75rem",
      },
      boxShadow: {
        council: "0 1px 0 0 rgb(255 255 255 / 0.5) inset, 0 8px 24px -8px rgb(124 70 45 / 0.18)",
        "council-lg": "0 20px 60px -20px rgb(124 70 45 / 0.30), 0 1px 0 0 rgb(255 255 255 / 0.5) inset",
        soft: "0 1px 2px rgb(124 70 45 / 0.06), 0 4px 14px -6px rgb(124 70 45 / 0.10)",
      },
      backgroundImage: {
        "warm-mesh":
          "radial-gradient(900px 500px at 80% 10%, rgb(226 96 59 / 0.22), transparent 60%), radial-gradient(800px 480px at 10% 30%, rgb(217 154 43 / 0.22), transparent 65%), radial-gradient(700px 460px at 60% 100%, rgb(90 138 111 / 0.18), transparent 70%)",
      },
    },
  },
  plugins: [],
};
export default config;
