/**
 * The app runs as many short-lived serverless instances. Supabase's session
 * pooler (port 5432) gives each one a dedicated slot and only has 15, so busy
 * moments lock everyone out. Its transaction pooler (port 6543) shares
 * connections between requests. Migrations keep using DIRECT_URL.
 */
export function runtimeDatabaseUrl(raw: string | undefined): string | undefined {
  if (!raw) return raw;
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return raw;
  }
  if (!url.hostname.endsWith(".pooler.supabase.com") || url.port !== "5432") return raw;
  url.port = "6543";
  url.searchParams.set("pgbouncer", "true");
  if (!url.searchParams.has("connection_limit")) url.searchParams.set("connection_limit", "1");
  return url.toString();
}
