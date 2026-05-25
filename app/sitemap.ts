import type { MetadataRoute } from "next";
import { getPublicAppUrl } from "@/lib/appUrl";

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = getPublicAppUrl();
  const updated = new Date().toISOString();
  const routes = ["", "/about", "/support", "/terms", "/privacy", "/cookies"];
  return routes.map((path) => ({
    url: `${baseUrl}${path}`,
    lastModified: updated,
    changeFrequency: "monthly",
    priority: path === "" ? 1 : 0.6,
  }));
}
