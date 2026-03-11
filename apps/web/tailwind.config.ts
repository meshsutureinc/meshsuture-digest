import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        msi: {
          navy: "#00416b",
          cyan: "#0097bc",
          "pale-cyan": "#E8F6F9",
          "light-blue": "#DEE7EC",
          dark: "#373737",
          gray: "#898989",
          "off-white": "#F2F2F2",
        },
      },
      fontFamily: {
        sohne: ["Sohne", "Helvetica Neue", "Arial", "sans-serif"],
      },
      borderRadius: {
        brand: "20px",
      },
      keyframes: {
        "slide-up": {
          "0%": { transform: "translateY(100%)", opacity: "0" },
          "100%": { transform: "translateY(0)", opacity: "1" },
        },
      },
      animation: {
        "slide-up": "slide-up 0.3s ease-out",
      },
    },
  },
  plugins: [],
};

export default config;
