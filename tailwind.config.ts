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
        },
        // Obsidian Atelier — stylist dashboard design system
        atelier: {
          void: "#0D0A14",
          surface: "#13101E",
          rail: "#261B38",
          active: "#1E1530",
          canvas: "#F8F5EE",
          card: "#FFFFFF",
          border: "#EAE4D8",
          ink: "#1A1428",
          muted: "#5A4D6A",
          faint: "#9A8DAA",
          lavender: "#F2EDF8",
          "nav-text": "#B0A0C4",
          "nav-active": "#CF9D4E"
        }
      },
      fontFamily: {
        heading: ["var(--font-playfair)", "Playfair Display", "serif"],
        body: ["var(--font-inter)", "Inter", "sans-serif"],
        accent: ["var(--font-poppins)", "Poppins", "sans-serif"],
        cormorant: ["var(--font-cormorant)", "Cormorant Garamond", "serif"],
        "dm-sans": ["var(--font-dm-sans)", "DM Sans", "sans-serif"]
      },
      boxShadow: {
        sm: "0 1px 2px 0 rgba(0, 0, 0, 0.05)",
        md: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
        lg: "0 10px 15px -3px rgba(0, 0, 0, 0.1)",
        xl: "0 20px 25px -5px rgba(0, 0, 0, 0.1)",
        gold: "0 0 0 2px rgba(207,157,78,0.35)"
      },
      borderRadius: {
        sm: "4px",
        md: "8px",
        lg: "12px",
        xl: "16px",
        "2xl": "20px"
      },
      keyframes: {
        fadeInUp: {
          "0%": { opacity: "0", transform: "translateY(16px)" },
          "100%": { opacity: "1", transform: "translateY(0)" }
        },
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" }
        },
        scaleIn: {
          "0%": { opacity: "0", transform: "scale(0.96)" },
          "100%": { opacity: "1", transform: "scale(1)" }
        },
        slideInRight: {
          "0%": { opacity: "0", transform: "translateX(20px)" },
          "100%": { opacity: "1", transform: "translateX(0)" }
        },
        slideInLeft: {
          "0%": { opacity: "0", transform: "translateX(-20px)" },
          "100%": { opacity: "1", transform: "translateX(0)" }
        }
      },
      animation: {
        "fade-in-up": "fadeInUp 0.6s ease-out both",
        "fade-in": "fadeIn 0.3s ease-out both",
        "scale-in": "scaleIn 0.25s ease-out both",
        "slide-in-right": "slideInRight 0.3s ease-out both",
        "slide-in-left": "slideInLeft 0.3s ease-out both"
      }
    }
  },
  plugins: []
};

export default config;
