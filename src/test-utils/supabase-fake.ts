/**
 * A stand-in for the Supabase admin client in route tests. Every query
 * builder method is recorded; awaiting a query returns the next result
 * queued for its table (or `{ data: null, error: null }`).
 */

type Result = { data?: unknown; error?: { message: string } | null };
type Call = { table: string; ops: [method: string, args: unknown[]][] };

export function fakeSupabase() {
  const calls: Call[] = [];
  const queued = new Map<string, Result[]>();
  const removed: string[][] = [];
  const files = new Map<string, string[]>();
  const deletedUsers: string[] = [];

  function from(table: string) {
    const call: Call = { table, ops: [] };
    calls.push(call);
    const builder: object = new Proxy(
      {},
      {
        get(_target, prop) {
          if (prop === "then") {
            const result = queued.get(table)?.shift() ?? {};
            return (resolve: (v: unknown) => unknown, reject: (e: unknown) => unknown) =>
              Promise.resolve({ data: null, error: null, ...result }).then(resolve, reject);
          }
          return (...args: unknown[]) => {
            call.ops.push([String(prop), args]);
            return builder;
          };
        }
      }
    );
    return builder;
  }

  const client = {
    from,
    storage: {
      from: (bucket: string) => ({
        list: async (folder: string, { limit = 100, offset = 0 }: { limit?: number; offset?: number } = {}) => ({
          data: (files.get(`${bucket}/${folder}`) ?? []).slice(offset, offset + limit).map((name) => ({ name })),
          error: null
        }),
        remove: async (paths: string[]) => {
          removed.push(paths.map((p) => `${bucket}:${p}`));
          return { data: null, error: null };
        }
      })
    },
    auth: {
      admin: {
        deleteUser: async (id: string) => {
          deletedUsers.push(id);
          return { data: null, error: null };
        }
      }
    }
  };

  return {
    client,
    /** Results for the next queries on `table`, in order. */
    queue(table: string, ...results: Result[]) {
      queued.set(table, [...(queued.get(table) ?? []), ...results]);
    },
    /** The queries made on `table`, oldest first. */
    on(table: string) {
      return calls.filter((c) => c.table === table);
    },
    /** The arguments of `method` in a query, e.g. arg(q, "update"). */
    arg(call: Call, method: string): unknown {
      return call.ops.find(([m]) => m === method)?.[1][0];
    },
    /** Every `.eq(column, value)` in a query, as an object. */
    filters(call: Call): Record<string, unknown> {
      return Object.fromEntries(call.ops.filter(([m]) => m === "eq").map(([, args]) => [args[0], args[1]]));
    },
    /** Files a bucket folder lists, e.g. files.set("avatars/user-1", ["a.jpg"]). */
    files,
    /** Storage removals as `bucket:path`. */
    removed,
    deletedUsers
  };
}

export type FakeSupabase = ReturnType<typeof fakeSupabase>;
