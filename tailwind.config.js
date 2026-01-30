/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        sidebar: {
          bg: "#1F2937",
          active: "#0EA5E9",
          text: "#E5E7EB",
          muted: "#9CA3AF",
          label: "#6B7280"
        },
        page: "#F9FAFB",
        main: "#FFFFFF",
        border: {
          DEFAULT: "#E5E7EB",
          soft: "#EEF2F7"
        },
        accent: {
          primary: "#0EA5E9",
          success: "#22C55E",
          warning: "#F59E0B"
        },
        ink: {
          DEFAULT: "#111827",
          muted: "#6B7280"
        },
        placeholder: "#D1D5DB",
        search: "#F3F4F6"
      },
      boxShadow: {
        soft: "0 10px 40px rgba(15, 23, 42, 0.07)"
      },
      fontFamily: {
        sans: ["Inter", "Segoe UI", "system-ui", "sans-serif"]
      }
    }
  },
  plugins: []
};
