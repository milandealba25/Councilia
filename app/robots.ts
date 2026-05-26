import type { MetadataRoute } from "next";
import { getPublicAppUrl } from "@/lib/appUrl";

export default function robots(): MetadataRoute.Robots {
  const baseUrl = getPublicAppUrl();
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/api/",
          "/account",
          "/auth/",
          "/login",
          "/onboarding",
          "/session",
        ],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
