import type { Metadata, Viewport } from "next";
import "@fontsource-variable/outfit";
import "@fontsource-variable/dm-sans";
import "./globals.css";
import { site } from "@/lib/site";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { Motion } from "@/components/motion";

export const metadata: Metadata = {
  metadataBase: new URL(site.url),
  applicationName: site.name,
  title: { default: site.title, template: "%s | MeritX" },
  description: site.description,
  openGraph: {
    type: "website",
    locale: "en_PK",
    siteName: "MeritX Solutions & Consultants",
    title: site.title,
    description: site.description,
    images: [
      {
        url: "/images/social-preview.png",
        width: 1200,
        height: 630,
        alt: "MeritX — Software, IT Equipment & Infrastructure Solutions",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: site.title,
    description: site.description,
    images: ["/images/social-preview.png"],
  },
  robots: { index: site.indexable, follow: site.indexable },
};
export const viewport: Viewport = { themeColor: "#092c50" };
export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" data-scroll-behavior="smooth">
      <body>
        <a className="skip-link" href="#main">
          Skip to content
        </a>
        <SiteHeader />
        {children}
        <SiteFooter />
        <Motion />
      </body>
    </html>
  );
}
