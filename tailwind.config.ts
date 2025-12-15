import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      // PackTrack Design System - Color System
      colors: {
        // Primary Brand
        primary: {
          50: "#e6f4eb",
          100: "#b3dfc4",
          200: "#80ca9d",
          300: "#4db576",
          400: "#26a45a",
          500: "#01722f",
          600: "#016628",
          700: "#015521",
          800: "#01441a",
          900: "#003310",
          950: "#002209",
          DEFAULT: "#01722f",
          foreground: "#ffffff",
        },
        // Secondary - Rum Swizzle (Cream)
        secondary: {
          50: "#fef9f0",
          100: "#fdf5e9",
          200: "#fbedd4",
          300: "#f8e2ba",
          400: "#f5d7a0",
          500: "#faf5e9",
          600: "#e8dcc7",
          700: "#c9bda6",
          800: "#aa9e85",
          900: "#8b7f64",
          950: "#6c6043",
          DEFAULT: "#faf5e9",
          foreground: "#003400",
        },
        // Accent - Cinnabar Red
        accent: {
          DEFAULT: "#e13c30",
          light: "#f5706a",
          dark: "#b82d23",
          foreground: "#ffffff",
        },
        // CTA - Bright Yellow (Primary Buttons)
        cta: {
          DEFAULT: "#ffcc00",
          light: "#ffe066",
          dark: "#cc9900",
          hover: "#e6b800",
          active: "#b38600",
          foreground: "#003400",
        },
        // Foreground/Text colors
        foreground: {
          DEFAULT: "#003400",
          secondary: "#1a4d1a",
          muted: "#4d6b4d",
          placeholder: "#7a9a7a",
          disabled: "#a8c4a8",
        },
        // Background colors
        background: {
          DEFAULT: "#ffffff",
          secondary: "#faf5e9",
          tertiary: "#f5f0e3",
          sunken: "#f0ebe0",
          elevated: "#ffffff",
        },
        // Border colors
        border: {
          DEFAULT: "#d4d9c8",
          secondary: "#e8ede0",
          strong: "#003400",
          focus: "#01722f",
        },
        // Neutral scale
        neutral: {
          0: "#ffffff",
          50: "#fafafa",
          100: "#f5f5f5",
          200: "#eeeeee",
          300: "#e0e0e0",
          400: "#bdbdbd",
          500: "#9e9e9e",
          600: "#757575",
          700: "#616161",
          800: "#424242",
          900: "#212121",
          950: "#121212",
          1000: "#000000",
        },
        // Semantic colors
        success: {
          light: "#d4edda",
          DEFAULT: "#28a745",
          dark: "#155724",
          foreground: "#ffffff",
        },
        warning: {
          light: "#fff3cd",
          DEFAULT: "#ffc107",
          dark: "#856404",
          foreground: "#003400",
        },
        error: {
          light: "#f8d7da",
          DEFAULT: "#dc3545",
          dark: "#721c24",
          foreground: "#ffffff",
        },
        info: {
          light: "#d1ecf1",
          DEFAULT: "#17a2b8",
          dark: "#0c5460",
          foreground: "#ffffff",
        },
        // Park-specific colors
        parks: {
          zoo: {
            primary: "#01722f",
            accent: "#ff8c00",
          },
          nightsafari: {
            primary: "#1a1a3e",
            accent: "#c9a227",
          },
          riverwonders: {
            primary: "#0077b6",
            accent: "#90e0ef",
          },
          birdparadise: {
            primary: "#e63946",
            accent: "#06d6a0",
          },
          rainforest: {
            primary: "#2d6a4f",
            accent: "#d4a373",
          },
        },
      },
      // Typography
      fontFamily: {
        heading: [
          "'Mandai Value Serif'",
          "Halant",
          "Vollkorn",
          "Georgia",
          "serif",
        ],
        body: ["'Poppins'", "system-ui", "-apple-system", "sans-serif"],
        display: ["'Karrik'", "serif"],
        mono: ["'JetBrains Mono'", "ui-monospace", "monospace"],
      },
      fontSize: {
        display: ["4.5rem", { lineHeight: "1.1", letterSpacing: "-0.02em" }],
        h1: ["3rem", { lineHeight: "1.2", letterSpacing: "-0.015em" }],
        h2: ["2.25rem", { lineHeight: "1.25", letterSpacing: "-0.01em" }],
        h3: ["1.75rem", { lineHeight: "1.3", letterSpacing: "-0.005em" }],
        h4: ["1.375rem", { lineHeight: "1.35" }],
        h5: ["1.125rem", { lineHeight: "1.4" }],
        h6: ["1rem", { lineHeight: "1.4" }],
      },
      // Border radius
      borderRadius: {
        button: "22.5px",
        card: "12px",
        input: "8px",
        modal: "16px",
      },
      // Shadows - using forest green tint instead of black
      boxShadow: {
        xs: "0 1px 2px 0 rgba(0, 52, 0, 0.05)",
        sm: "0 1px 3px 0 rgba(0, 52, 0, 0.1), 0 1px 2px -1px rgba(0, 52, 0, 0.1)",
        md: "0 4px 6px -1px rgba(0, 52, 0, 0.1), 0 2px 4px -2px rgba(0, 52, 0, 0.1)",
        lg: "0 10px 15px -3px rgba(0, 52, 0, 0.1), 0 4px 6px -4px rgba(0, 52, 0, 0.1)",
        xl: "0 20px 25px -5px rgba(0, 52, 0, 0.1), 0 8px 10px -6px rgba(0, 52, 0, 0.1)",
        "2xl": "0 25px 50px -12px rgba(0, 52, 0, 0.25)",
        inner: "inset 0 2px 4px 0 rgba(0, 52, 0, 0.05)",
        focus: "0 0 0 3px rgba(1, 114, 47, 0.3)",
        "focus-cta": "0 0 0 2px rgba(255, 204, 0, 0.5)",
        "glow-primary": "0 0 20px rgba(1, 114, 47, 0.3)",
        "glow-cta": "0 0 20px rgba(255, 204, 0, 0.4)",
        "glow-nature": "0 0 30px rgba(45, 106, 79, 0.25)",
      },
      // Z-index scale
      zIndex: {
        hide: "-1",
        base: "0",
        raised: "1",
        dropdown: "10",
        sticky: "20",
        fixed: "30",
        modalBackdrop: "40",
        modal: "50",
        popover: "60",
        tooltip: "70",
        toast: "80",
        maximum: "9999",
      },
      // Animation
      animation: {
        "fade-in": "fadeIn 200ms ease-out",
        "fade-out": "fadeOut 200ms ease-in",
        "slide-in-up": "slideInUp 200ms ease-out",
        "slide-in-down": "slideInDown 200ms ease-out",
        "slide-in-left": "slideInLeft 200ms ease-out",
        "slide-in-right": "slideInRight 200ms ease-out",
        "scale-in": "scaleIn 200ms ease-out",
        spin: "spin 1s linear infinite",
        pulse: "pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        "leaf-sway": "leafSway 3s ease-in-out infinite",
        shimmer: "shimmer 2s infinite",
        "bounce-soft": "bounceSoft 0.5s ease-out",
      },
      keyframes: {
        fadeIn: {
          from: { opacity: "0" },
          to: { opacity: "1" },
        },
        fadeOut: {
          from: { opacity: "1" },
          to: { opacity: "0" },
        },
        slideInUp: {
          from: { transform: "translateY(10px)", opacity: "0" },
          to: { transform: "translateY(0)", opacity: "1" },
        },
        slideInDown: {
          from: { transform: "translateY(-10px)", opacity: "0" },
          to: { transform: "translateY(0)", opacity: "1" },
        },
        slideInLeft: {
          from: { transform: "translateX(-10px)", opacity: "0" },
          to: { transform: "translateX(0)", opacity: "1" },
        },
        slideInRight: {
          from: { transform: "translateX(10px)", opacity: "0" },
          to: { transform: "translateX(0)", opacity: "1" },
        },
        scaleIn: {
          from: { transform: "scale(0.95)", opacity: "0" },
          to: { transform: "scale(1)", opacity: "1" },
        },
        leafSway: {
          "0%, 100%": { transform: "rotate(-2deg)" },
          "50%": { transform: "rotate(2deg)" },
        },
        shimmer: {
          "0%": { transform: "translateX(-100%)" },
          "100%": { transform: "translateX(100%)" },
        },
        bounceSoft: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-5px)" },
        },
      },
      // Transition timing functions
      transitionTimingFunction: {
        nature: "cubic-bezier(0.25, 0.1, 0.25, 1)",
        bounce: "cubic-bezier(0.175, 0.885, 0.32, 1.275)",
        spring: "cubic-bezier(0.5, 1.5, 0.75, 1.25)",
      },
      // Container
      maxWidth: {
        "container-sm": "480px",
        "container-md": "640px",
        "container-lg": "768px",
        "container-xl": "1024px",
        "container-2xl": "1280px",
        "container-3xl": "1400px",
      },
      // Spacing
      spacing: {
        "0.5": "2px",
        "1.5": "6px",
        "2.5": "10px",
        "3.5": "14px",
        "4.5": "18px",
        "18": "72px",
        "22": "88px",
      },
      // Aspect ratios
      aspectRatio: {
        spotlight: "3 / 2",
        landscape: "4 / 3",
        ultrawide: "21 / 9",
        portrait: "3 / 4",
        golden: "1.618 / 1",
      },
      // Blur
      blur: {
        xs: "2px",
      },
    },
  },
  plugins: [],
};

export default config;
