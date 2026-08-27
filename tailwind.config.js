/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ["class"],
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      fontFamily: {
        sans: [
          "Inter",
          "ui-sans-serif",
          "system-ui",
          "-apple-system",
          "BlinkMacSystemFont",
          "Segoe UI",
          "sans-serif",
        ],
      },
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        brand: {
          orange: "#FF8811",
          cream: "#FFF8F0",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
        "sds-sm": "var(--sds-radius-sm)",
        "sds-md": "var(--sds-radius-md)",
        "sds-lg": "var(--sds-radius-lg)",
      },
      boxShadow: {
        "sds-viewer": "var(--sds-viewer-shadow)",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        "hero-fade-in-left": {
          from: { opacity: "0", transform: "translateX(-40px)" },
          to: { opacity: "1", transform: "translateX(0)" },
        },
        "hero-fade-in-right": {
          from: { opacity: "0", transform: "translateX(40px)" },
          to: { opacity: "1", transform: "translateX(0)" },
        },
        "hero-float": {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-14px)" },
        },
        "fadeSlideUp": {
          from: { opacity: "0", transform: "translateY(16px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        // Ambient blooms behind the Gallery hero — slow drift so the shading
        // reads as light moving across the band, not as an animated element.
        "gallery-bloom": {
          "0%, 100%": { transform: "translate3d(0, 0, 0) scale(1)", opacity: "0.55" },
          "50%": { transform: "translate3d(0, -18px, 0) scale(1.08)", opacity: "0.8" },
        },
        "gallery-bloom-slow": {
          "0%, 100%": { transform: "translate3d(0, 0, 0) scale(1.05)", opacity: "0.45" },
          "50%": { transform: "translate3d(14px, 12px, 0) scale(1)", opacity: "0.7" },
        },
        // Sweeps a soft highlight along the card accent bar.
        "gallery-sheen": {
          "0%": { backgroundPosition: "0% 50%" },
          "100%": { backgroundPosition: "200% 50%" },
        },
        // Twinkling stars for CompliAI nav icon
        "twinkle": {
          "0%, 100%": { opacity: "1", transform: "scale(1)" },
          "50%": { opacity: "0.3", transform: "scale(0.6)" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "hero-fade-in-left": "hero-fade-in-left 0.8s ease-out both",
        "hero-fade-in-right": "hero-fade-in-right 0.9s ease-out both",
        "hero-float": "hero-float 4s ease-in-out infinite",
        "fadeSlideUp": "fadeSlideUp 0.45s ease forwards",
        "gallery-bloom": "gallery-bloom 14s ease-in-out infinite",
        "gallery-bloom-slow": "gallery-bloom-slow 19s ease-in-out infinite",
        "gallery-sheen": "gallery-sheen 6s linear infinite",
        "twinkle": "twinkle 1.5s ease-in-out infinite",
      },
    },
  },
  plugins: [
    require('tailwindcss-scrollbar'),
  ],
}

