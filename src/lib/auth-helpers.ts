import { getServerSession } from "next-auth";
import { getAuthOptions } from "./auth";

/**
 * Helper to get server session with DB-backed auth options
 * Use this instead of getServerSession(authOptions) when you need DB-backed config
 */
export async function getServerSessionWithDB() {
  const authOptions = await getAuthOptions();
  return getServerSession(authOptions);
}

