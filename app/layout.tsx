import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { CookieBanner } from "@/components/cookies/CookieBanner";
import { AuroraBackground } from "@/components/ui/AuroraBackground";

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
  description:
    "COUNCILia es una app de inteligencia artificial para pensar decisiones difíciles con tres perspectivas críticas: largo plazo, riesgo y supuestos.",
  applicationName: "COUNCILia",
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
  authors: [{ name: "COUNCILia" }],
  creator: "COUNCILia",
  publisher: "COUNCILia",
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    locale: "es_MX",
    url: "/",
    siteName: "COUNCILia",
    title: "COUNCILia | IA para pensar decisiones difíciles",
    description:
      "Una app de IA que te ayuda a analizar decisiones importantes con tres voces críticas, sin empujarte a una respuesta fácil.",
    images: [
      {
        url: "/brand-mark.png",
        width: 1024,
        height: 1024,
        alt: "COUNCILia",
      },
    ],
  },
  twitter: {
    card: "summary",
    title: "COUNCILia | IA para pensar decisiones difíciles",
    description:
      "Tres perspectivas críticas para ver con más claridad lo que estás eligiendo.",
    images: ["/brand-mark.png"],
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
      </body>
    </html>
  );
}
