import type { Config } from "tailwindcss";

export default {
  content: ["./app/**/*.{js,ts,jsx,tsx,mdx}", "./components/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        ink: "#172234",
        muted: "#607086",
        canvas: "#f3f7f6",
        teal: { 50: "#edfdf8", 100: "#d3f8eb", 500: "#20a982", 600: "#158568", 700: "#126b57" },
        coral: "#f47c63"
      },
      boxShadow: { soft: "0 18px 50px rgba(30, 61, 70, 0.08)" }
    }
  },
  plugins: []
} satisfies Config;
