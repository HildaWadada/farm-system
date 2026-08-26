import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{js,ts,jsx,tsx,mdx}", "./components/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        cream: "#FBF8F2",
        forest: "#2F5233",
        forestDark: "#274429",
      },
    },
  },
  plugins: [],
};

export default config;
