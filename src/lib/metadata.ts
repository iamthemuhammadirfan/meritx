import type { Metadata } from "next";
import { site } from "./site";

export function pageMetadata(
  title: string,
  description: string,
  path: string,
): Metadata {
  const fullTitle = path === "/" ? site.title : `${title} | MeritX`;
  return {
    title: path === "/" ? { absolute: site.title } : title,
    description,
    alternates: { canonical: path },
    openGraph: {
      type: "website",
      locale: "en_PK",
      siteName: "MeritX Solutions & Consultants",
      title: fullTitle,
      description,
      url: path,
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
      title: fullTitle,
      description,
      images: ["/images/social-preview.png"],
    },
  };
}
