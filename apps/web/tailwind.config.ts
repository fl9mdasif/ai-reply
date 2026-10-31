import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/components/**/*.{ts,tsx}", "./src/app/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        // Latin glyphs from Plus Jakarta, Bengali glyphs fall through to Hind Siliguri.
        sans: ["var(--font-latin)", "var(--font-bangla)", "system-ui", "sans-serif"],
      },
      colors: {
        background: "var(--background)",
        surface: "var(--surface)",
        foreground: "var(--foreground)",
        muted: { foreground: "var(--muted-foreground)" },
        border: "var(--border)",
        ring: "var(--ring)",
        primary: {
          DEFAULT: "var(--primary)",
          hover: "var(--primary-hover)",
          soft: "var(--primary-soft)",
          deep: "var(--primary-deep)",
          foreground: "var(--primary-foreground)",
        },
        success: { DEFAULT: "var(--success)", soft: "var(--success-soft)", strong: "var(--success-strong)" },
        warning: { DEFAULT: "var(--warning)", soft: "var(--warning-soft)", strong: "var(--warning-strong)" },
        danger: { DEFAULT: "var(--danger)", soft: "var(--danger-soft)", strong: "var(--danger-strong)" },
        messenger: { from: "var(--messenger-from)", to: "var(--messenger-to)", bubble: "var(--bubble)" },
      },
      borderRadius: {
        xl: "calc(var(--radius) - 4px)",
        "2xl": "var(--radius)",
        "3xl": "calc(var(--radius) + 8px)",
      },
      boxShadow: {
        card: "0 1px 2px rgb(15 23 42 / 0.04), 0 4px 16px rgb(15 23 42 / 0.05)",
        float: "0 12px 40px rgb(30 42 110 / 0.14)",
      },
      maxWidth: {
        prose: "65ch",
      },
    },
  },
  plugins: [],
};

export default config;
