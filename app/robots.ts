import type { MetadataRoute } from "next";
import { getPublicAppUrl } from "@/lib/appUrl";

export default function robots(): MetadataRoute.Robots {
  const baseUrl = getPublicAppUrl();
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/about", "/support", "/terms", "/privacy", "/cookies"],
        disallow: ["/api/", "/session", "/onboarding"],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
