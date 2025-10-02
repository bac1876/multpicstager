/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ["class"],
  content: [
    "./index.html",
    "./**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      animation: {
        gradient: "gradient 8s linear infinite",
        "border-beam": "border-beam calc(var(--duration)*1s) infinite linear",
        "shimmer-slide": "shimmer-slide var(--shimmer-duration) ease-in-out infinite alternate",
        "spin-around": "spin-around calc(var(--shimmer-duration)*2) infinite linear",
      },
      keyframes: {
        gradient: {
          to: {
            backgroundPosition: "var(--bg-size) 0",
          },
        },
        "border-beam": {
          "100%": {
            "offset-distance": "100%",
          },
        },
        "shimmer-slide": {
          to: {
            transform: "translate(calc(100cqw - 100%), 0)",
          },
        },
        "spin-around": {
          "0%": {
            transform: "translateZ(0) rotate(0)",
          },
          "15%, 35%": {
            transform: "translateZ(0) rotate(90deg)",
          },
          "65%, 85%": {
            transform: "translateZ(0) rotate(270deg)",
          },
          "100%": {
            transform: "translateZ(0) rotate(360deg)",
          },
        },
      },
    },
  },
  plugins: [],
}
