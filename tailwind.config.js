// tailwind.config.js
module.exports = {
  darkMode: ["class"],
  content: [
    "./pages/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./app/**/*.{ts,tsx}",
    "./src/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Imua design system colors
        primary: "#e631dc", // Magenta/pink
        accent: "#00e5ff", // Cyan

        // Background colors
        background: {
          DEFAULT: "#000000",
          card: "#15151c",
          modal: "#1a1a24",
          input: "#0f0f14",
          selected: "#292936",
          hover: "rgba(255, 255, 255, 0.05)",
        },

        // Text colors
        text: {
          primary: "#ffffff",
          secondary: "#9999aa",
          accent: "#00e5ff",
          success: "#00dc82",
          error: "#ff3c5c",
        },

        border: "rgba(255, 255, 255, 0.1)",

        // Keep existing shadcn colors for backward compatibility
        foreground: "hsl(var(--foreground))",
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        ring: "hsl(var(--ring))",
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
        xl: "1rem",
      },
    },
  },
  plugins: [],
};
