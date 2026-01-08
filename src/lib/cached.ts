import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/prisma";

// Helper to safely execute Prisma queries with error handling
async function safePrismaQuery<T>(
  query: () => Promise<T>,
  fallback: T
): Promise<T> {
  try {
    return await query();
  } catch (error: any) {
    // Only log connection errors in development
    if (process.env.NODE_ENV === "development") {
      const isConnectionError =
        error?.code === "P1001" ||
        error?.message?.includes("Can't reach database server") ||
        error?.message?.includes("connection");
      
      if (isConnectionError) {
        console.warn(
          "⚠️  Database connection issue (database may be paused or unavailable). Using fallback data."
        );
      }
    }
    return fallback;
  }
}

export const getGalleryImages = unstable_cache(
  async () => {
    return await safePrismaQuery(
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
      []
    );
  },
  ["grwtee:gallery:all"],
  { revalidate: 60 * 30, tags: ["gallery"] } // 30 mins
);

export const getFeaturedGalleryImages = unstable_cache(
  async (limit: number = 12) => {
    return await safePrismaQuery(
      () =>
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
      []
    );
  },
  ["grwtee:gallery:featured"],
  { revalidate: 60 * 30, tags: ["gallery"] }
);

export const getServicesCached = unstable_cache(
  async () => {
    return await safePrismaQuery(
      () =>
        prisma.service.findMany({
          where: { active: true },
          orderBy: [{ order: "asc" }, { createdAt: "desc" }]
        }),
      []
    );
  },
  ["grwtee:services:active"],
  { revalidate: 60 * 60, tags: ["services"] } // 1 hour
);


