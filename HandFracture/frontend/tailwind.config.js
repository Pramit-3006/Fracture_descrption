/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        clinical: {
          bg: "#0b0f19",       // Deep Slate Space Black
          panel: "#161f30",    // Soft Glassmorphism Navy
          panelLight: "#1e293b", // Slate 800
          border: "#334155",   // Slate 700
          text: "#f8fafc",     // Slate 50
          muted: "#94a3b8",    // Slate 400
          accent: "#0ea5e9",   // Clinical Medical Cyan (Sky 500)
          emerald: "#10b981",  // Normal / Intact (Emerald 500)
          amber: "#f59e0b",    // Warning / High Urgency (Amber 500)
          crimson: "#ef4444"   // Critical / Emergency (Crimson 500)
        }
      },
      fontFamily: {
        sans: ["var(--font-sans)", "Inter", "sans-serif"],
      },
      backgroundImage: {
        "gradient-radial": "radial-gradient(var(--tw-gradient-stops))",
      },
      boxShadow: {
        "clinical-glow": "0 0 20px rgba(14, 165, 233, 0.15)",
        "red-glow": "0 0 20px rgba(239, 68, 68, 0.25)",
      }
    },
  },
  plugins: [],
}
