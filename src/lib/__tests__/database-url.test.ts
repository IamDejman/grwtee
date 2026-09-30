/**
 * @jest-environment node
 */
import { runtimeDatabaseUrl } from "../database-url";

describe("runtimeDatabaseUrl", () => {
  it("moves the Supabase session pooler to the transaction pooler", () => {
    const url = new URL(runtimeDatabaseUrl("postgresql://user:p%40ss@aws-1-eu-central-1.pooler.supabase.com:5432/postgres")!);
    expect(url.port).toBe("6543");
    expect(url.password).toBe("p%40ss");
    expect(url.searchParams.get("pgbouncer")).toBe("true");
    expect(url.searchParams.get("connection_limit")).toBe("1");
  });

  it("keeps an existing connection limit", () => {
    const out = runtimeDatabaseUrl("postgresql://u:p@x.pooler.supabase.com:5432/postgres?connection_limit=3");
    expect(new URL(out!).searchParams.get("connection_limit")).toBe("3");
  });

  it("leaves other databases alone", () => {
    for (const raw of [
      "postgresql://localhost:5432/grwtee",
      "postgresql://u:p@x.pooler.supabase.com:6543/postgres?pgbouncer=true",
      "postgresql://u:p@db.abc.supabase.co:5432/postgres",
      "not a url",
      undefined
    ]) {
      expect(runtimeDatabaseUrl(raw)).toBe(raw);
    }
  });
});
