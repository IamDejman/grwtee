import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/prisma";

export const getGalleryImages = unstable_cache(
  async () => {
    return await prisma.galleryImage.findMany({
      orderBy: [{ order: "asc" }, { createdAt: "desc" }],
      select: {
        id: true,
        title: true,
        description: true,
        imageUrl: true,
        cloudinaryId: true,
        category: true
      }
    });
  },
  ["grwtee:gallery:all"],
  { revalidate: 60 * 30, tags: ["gallery"] } // 30 mins
);

export const getFeaturedGalleryImages = unstable_cache(
  async (limit: number = 12) => {
    return await prisma.galleryImage.findMany({
      where: { featured: true },
      orderBy: [{ order: "asc" }, { createdAt: "desc" }],
      take: limit,
      select: {
        id: true,
        title: true,
        imageUrl: true,
        cloudinaryId: true
      }
    });
  },
  ["grwtee:gallery:featured"],
  { revalidate: 60 * 30, tags: ["gallery"] }
);

export const getServicesCached = unstable_cache(
  async () => {
    return await prisma.service.findMany({
      where: { active: true },
      orderBy: [{ order: "asc" }, { createdAt: "desc" }]
    });
  },
  ["grwtee:services:active"],
  { revalidate: 60 * 60, tags: ["services"] } // 1 hour
);


