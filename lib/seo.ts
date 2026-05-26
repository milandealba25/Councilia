import type { Metadata } from "next";

export const SITE_NAME = "COUNCILia";
export const SITE_DESCRIPTION =
  "COUNCILia es una app de inteligencia artificial para pensar decisiones dificiles con tres perspectivas criticas: largo plazo, riesgo y supuestos.";
export const OG_IMAGE = "/brand-mark.png";

interface PageMetadataOptions {
  title: string;
  description: string;
  path: string;
  index?: boolean;
}

export function pageMetadata({
  title,
  description,
  path,
  index = true,
}: PageMetadataOptions): Metadata {
  return {
    title,
    description,
    alternates: {
      canonical: path,
    },
    openGraph: {
      type: "website",
      locale: "es_MX",
      url: path,
      siteName: SITE_NAME,
      title: `${title} | ${SITE_NAME}`,
      description,
      images: [
        {
          url: OG_IMAGE,
          width: 1024,
          height: 1024,
          alt: SITE_NAME,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: `${title} | ${SITE_NAME}`,
      description,
      images: [OG_IMAGE],
    },
    robots: {
      index,
      follow: index,
    },
  };
}
