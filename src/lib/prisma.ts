import { PrismaClient } from "@prisma/client";
import { runtimeDatabaseUrl } from "./database-url";

declare global {
  var prisma: PrismaClient | undefined;
}

const datasourceUrl = runtimeDatabaseUrl(process.env.DATABASE_URL);

export const prisma =
  global.prisma ||
  new PrismaClient({
    ...(datasourceUrl ? { datasourceUrl } : {}),
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"]
  });

if (process.env.NODE_ENV !== "production") {
  global.prisma = prisma;
}


