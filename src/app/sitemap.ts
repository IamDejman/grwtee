import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const site = process.env.NEXT_PUBLIC_SITE_URL || "https://grwtee.com";
  const routes = [
    "",
    "/about",
    "/services",
    "/pricing",
    "/gallery",
    "/faq",
    "/payment",
    "/contact",
    "/terms"
  ];

  return routes.map((path) => ({
    url: `${site}${path}`,
    lastModified: new Date(),
    changeFrequency: "weekly",
    priority: path === "" ? 1 : 0.7
  }));
}


