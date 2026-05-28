import type { Metadata } from "next";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next"
import localFont from "next/font/local";
import "./globals.css";
import { CookieBanner } from "@/components/cookies/CookieBanner";
import { AuroraBackground } from "@/components/ui/AuroraBackground";
import { OG_IMAGE, SITE_DESCRIPTION, SITE_NAME } from "@/lib/seo";

const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});

export const metadata: Metadata = {
  metadataBase: new URL(appUrl),
  title: {
    default: "COUNCILia | IA para pensar decisiones difíciles",
    template: "%s | COUNCILia",
  },
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  keywords: [
    "decisiones difíciles",
    "app para tomar decisiones",
    "inteligencia artificial para decisiones",
    "pensamiento crítico con IA",
    "deliberación asistida",
    "claridad para decidir",
    "herramienta de reflexión personal",
    "IA para analizar opciones",
  ],
  authors: [{ name: SITE_NAME }],
  creator: SITE_NAME,
  publisher: SITE_NAME,
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [
      { url: "/favicon.ico" },
      { url: OG_IMAGE, type: "image/png", sizes: "1024x1024" },
    ],
    apple: [{ url: OG_IMAGE, sizes: "1024x1024" }],
  },
  openGraph: {
    type: "website",
    locale: "es_MX",
    url: "/",
    siteName: SITE_NAME,
    title: "COUNCILia | IA para pensar decisiones difíciles",
    description: SITE_DESCRIPTION,
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
    title: "COUNCILia | IA para pensar decisiones difíciles",
    description: SITE_DESCRIPTION,
    images: [OG_IMAGE],
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body
        className={`${geistSans.variable} ${geistMono.variable} relative min-h-dvh overflow-x-hidden bg-background font-sans`}
      >
        <AuroraBackground />
        <div className="relative z-10">{children}</div>
        <CookieBanner />
        <Analytics />
      </body>
    </html>
  );
}
