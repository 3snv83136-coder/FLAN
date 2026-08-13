import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        bleu: {
          DEFAULT: "#1A4B8C",
          fonce: "#0F2F5C",
          clair: "#3D7DD6",
        },
        container: {
          jaune: "#F5C542",
          vert: "#2FBF8A",
          violet: "#7C6CF0",
          rose: "#F071A0",
          orange: "#F08A4B",
          cyan: "#3DBDD6",
        },
        caramel: "#C46A2F",
        ambre: "#E9A94E",
        creme: "#FBF3E4",
        brun: "#1A2A44",
        ok: "#2E9E5B",
        alerte: "#D64545",
        gris: "#B8C7DC",
      },
      fontFamily: {
        display: ["var(--font-display)", "Georgia", "serif"],
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
      },
      borderRadius: {
        xl: "12px",
      },
    },
  },
  plugins: [],
};
export default config;
