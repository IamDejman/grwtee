import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        green: {
          dark: "#0D674E",
          medium: "#0F7A5C",
          light: "#129468"
        },
        purple: {
          dark: "#422D64",
          medium: "#5B3D8A"
        },
        cream: {
          DEFAULT: "#F5F3E7",
          light: "#FAF8F3"
        },
        gold: {
          DEFAULT: "#CF9D4E",
          light: "#DBA95E"
        },
        gray: {
          light: "#F8F9FA",
          medium: "#E0E0E0",
          dark: "#2C3E50"
        }
      },
      fontFamily: {
        heading: ["var(--font-playfair)", "Playfair Display", "serif"],
        body: ["var(--font-inter)", "Inter", "sans-serif"],
        accent: ["var(--font-poppins)", "Poppins", "sans-serif"]
      },
      boxShadow: {
        sm: "0 1px 2px 0 rgba(0, 0, 0, 0.05)",
        md: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
        lg: "0 10px 15px -3px rgba(0, 0, 0, 0.1)",
        xl: "0 20px 25px -5px rgba(0, 0, 0, 0.1)"
      },
      borderRadius: {
        sm: "4px",
        md: "8px",
        lg: "12px",
        xl: "16px"
      },
      keyframes: {
        fadeInUp: {
          "0%": { opacity: "0", transform: "translateY(16px)" },
          "100%": { opacity: "1", transform: "translateY(0)" }
        }
      },
      animation: {
        "fade-in-up": "fadeInUp 0.6s ease-out both"
      }
    }
  },
  plugins: []
};

export default config;


