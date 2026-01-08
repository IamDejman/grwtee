import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/prisma";

// Cache config for 5 minutes - short enough to pick up changes, long enough to avoid DB hits
const CONFIG_CACHE_TTL = 60 * 5;

async function getConfigMap(): Promise<Record<string, string>> {
  try {
    const rows = await prisma.siteSettings.findMany({
      where: {
        key: {
          startsWith: "env_"
        }
      }
    });
    const map: Record<string, string> = {};
    for (const r of rows) {
      // Remove "env_" prefix when storing in map
      const envKey = r.key.replace(/^env_/, "");
      map[envKey] = r.value;
    }
    return map;
  } catch (error: any) {
    // If DB is not available (e.g., during build or tables don't exist), return empty map
    // Only log if it's not a table missing error (P2021)
    if (error?.code !== "P2021") {
      console.warn("Failed to load config from database:", error);
    }
    return {};
  }
}

const getCachedConfigMap = unstable_cache(
  getConfigMap,
  ["grwtee:config:env"],
  { revalidate: CONFIG_CACHE_TTL, tags: ["config"] }
);

/**
 * Get a configuration value from the database, falling back to environment variable
 * Only DATABASE_URL should remain as a required env var
 */
export async function getConfig(key: string, fallback?: string): Promise<string | undefined> {
  const configMap = await getCachedConfigMap();
  return configMap[key] || process.env[key] || fallback;
}

/**
 * Get a configuration value synchronously (for client-side or build-time)
 * Falls back to environment variable
 */
export function getConfigSync(key: string, fallback?: string): string | undefined {
  return process.env[key] || fallback;
}

/**
 * Get all config values (for server-side use)
 */
export async function getAllConfig(): Promise<Record<string, string>> {
  const dbConfig = await getCachedConfigMap();
  // Merge with env vars, DB takes precedence
  // Filter out undefined values from process.env
  const envVars: Record<string, string> = {};
  for (const [key, value] of Object.entries(process.env)) {
    if (value !== undefined) {
      envVars[key] = value;
    }
  }
  return { ...envVars, ...dbConfig };
}

/**
 * Set a configuration value in the database
 */
export async function setConfig(key: string, value: string): Promise<void> {
  await prisma.siteSettings.upsert({
    where: { key: `env_${key}` },
    update: { value },
    create: { key: `env_${key}`, value }
  });
}

