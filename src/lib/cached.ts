import { unstable_cache, unstable_noStore } from "next/cache";
import { prisma } from "@/lib/prisma";
import { serviceJson } from "@/lib/services";

// The queries throw inside the cache and the errors are caught outside it,
// so a database blip shows an empty list for that one request instead of
// caching the empty list for half an hour (WEB-12). The page that got the
// empty list isn't kept either: during a background refresh the last good
// page stays up, and a build without the database renders it on demand.
function uncachedFallback<T>(what: string, fallback: T) {
  return (error: unknown): T => {
    console.warn(`Couldn't load ${what}; showing nothing until the database answers.`, {
      code: (error as { code?: string })?.code,
    });
    unstable_noStore();
    return fallback;
  };
}

const galleryImages = unstable_cache(
  () =>
    prisma.galleryImage.findMany({
      orderBy: [{ order: "asc" }, { createdAt: "desc" }],
      select: {
        id: true,
        title: true,
        description: true,
        imageUrl: true,
        cloudinaryId: true,
        category: true
      }
    }),
  ["grwtee:gallery:all"],
  { revalidate: 60 * 30, tags: ["gallery"] } // 30 mins
);

export function getGalleryImages() {
  return galleryImages().catch(uncachedFallback("the gallery", []));
}

const featuredGalleryImages = unstable_cache(
  (limit: number) =>
    prisma.galleryImage.findMany({
      where: { featured: true },
      orderBy: [{ order: "asc" }, { createdAt: "desc" }],
      take: limit,
      select: {
        id: true,
        title: true,
        imageUrl: true,
        cloudinaryId: true
      }
    }),
  ["grwtee:gallery:featured"],
  { revalidate: 60 * 30, tags: ["gallery"] }
);

export function getFeaturedGalleryImages(limit: number = 12) {
  return featuredGalleryImages(limit).catch(uncachedFallback("featured gallery images", []));
}

const activeServices = unstable_cache(
  async () =>
    (
      await prisma.service.findMany({
        where: { active: true },
        orderBy: [{ order: "asc" }, { createdAt: "desc" }]
      })
    ).map(serviceJson),
  ["grwtee:services:active"],
  { revalidate: 60 * 60, tags: ["services"] } // 1 hour
);

export function getServicesCached() {
  return activeServices().catch(uncachedFallback("services", []));
}
