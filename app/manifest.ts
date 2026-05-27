import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "COUNCILia",
    short_name: "COUNCILia",
    description:
      "IA deliberativa para pensar decisiones dificiles con tres perspectivas criticas.",
    start_url: "/",
    display: "standalone",
    background_color: "#fbf6ed",
    theme_color: "#e2603b",
    lang: "es-MX",
    icons: [
      {
        src: "/brand-mark.png",
        sizes: "1024x1024",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
