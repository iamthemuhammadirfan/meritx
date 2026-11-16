import type { MetadataRoute } from "next";
import { site } from "@/lib/site";
import { services } from "@/lib/services";
export const dynamic = "force-static";
export default function sitemap(): MetadataRoute.Sitemap {
  if (!site.indexable) return [];
  return [
    "/",
    "/services/",
    "/about/",
    "/contact/",
    "/privacy/",
    "/it-equipment/business-laptops/",
    "/guides/business-laptop-buying-guide/",
    ...services.map((s) => `/services/${s.slug}/`),
  ].map((path) => ({ url: `${site.url}${path}` }));
}
