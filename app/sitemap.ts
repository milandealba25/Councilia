import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl =
    process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const updated = new Date().toISOString();
  const routes = ["", "/about", "/support", "/terms", "/privacy", "/cookies"];
  return routes.map((path) => ({
    url: `${baseUrl}${path}`,
    lastModified: updated,
    changeFrequency: "monthly",
    priority: path === "" ? 1 : 0.6,
  }));
}
