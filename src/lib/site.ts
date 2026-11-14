import "server-only";

const configuredUrl =
  process.env.NEXT_PUBLIC_SITE_URL || "https://meritxsc.com";
const url = new URL(configuredUrl);

if (
  !["https:", "http:"].includes(url.protocol) ||
  url.pathname !== "/" ||
  url.search ||
  url.hash ||
  url.username ||
  url.password
) {
  throw new Error(
    "NEXT_PUBLIC_SITE_URL must be a website origin, e.g. https://meritxsc.com",
  );
}

export const site = {
  name: "MeritX",
  url: url.origin,
  title: "MeritX | Tender Support, Solutions & Consultancy",
  description:
    "MeritX provides tender support, bid documentation guidance, business solutions and consultancy to help you approach opportunities with clarity.",
  indexable: process.env.SITE_INDEXABLE === "true",
} as const;
