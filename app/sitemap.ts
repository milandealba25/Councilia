import type { MetadataRoute } from "next";
import { getPublicAppUrl } from "@/lib/appUrl";

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = getPublicAppUrl();
  const updated = new Date("2026-05-26T00:00:00.000Z");
  const routes = ["", "/about", "/support", "/terms", "/privacy", "/cookies"];
  return routes.map((path) => ({
    url: `${baseUrl}${path}`,
    lastModified: updated,
    changeFrequency: "monthly",
    priority: path === "" ? 1 : 0.6,
  }));
}
