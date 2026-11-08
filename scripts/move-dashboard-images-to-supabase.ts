/**
 * Moves the look and lookbook photos the dashboard uploaded to Cloudinary
 * into the app's Supabase storage, and points the rows at the new copies
 * (ARCH-05). The website's own gallery stays on Cloudinary.
 *
 * Reads: looks.primary_image_url, look_images.image_url, look_items.image_url,
 *        lookbooks.cover_image_url, lookbook_items.image_url
 * Each photo goes to the "looks" or "lookbooks" bucket, in the folder of the
 * look's stylist or the lookbook's owner, the way the app stores them.
 *
 * Shows what it would do unless run with --apply. Safe to run again: rows
 * already pointing at Supabase are skipped. The Cloudinary files are left in
 * place; delete them once the app and website show the new copies.
 *
 * Needs NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY and
 * NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME (only photos from that cloud are moved).
 *
 * Usage: npx tsx scripts/move-dashboard-images-to-supabase.ts [--apply]
 */
import { randomUUID } from "crypto";
import { createAdminClient } from "../src/lib/supabase/admin";

type Row = Record<string, unknown> & { id: string };

type Target = {
  table: string;
  column: string;
  bucket: "looks" | "lookbooks";
  /** The owner's profile id, which names the folder the photo goes in. */
  owner: (row: Row) => Promise<string | null>;
};

const apply = process.argv.includes("--apply");
const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
const supabase = createAdminClient();
const PAGE = 200;

// What the buckets accept (25-security-hardening.sql in the app repo).
const EXTENSIONS: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };

const owners = new Map<string, string | null>();
async function ownerOf(table: "looks" | "lookbooks", column: "stylist_id" | "owner_id", id: unknown) {
  const key = `${table}:${id}`;
  if (!owners.has(key)) {
    const { data } = await supabase.from(table).select(column).eq("id", id).maybeSingle();
    owners.set(key, ((data as Record<string, string> | null)?.[column]) ?? null);
  }
  return owners.get(key) ?? null;
}

const TARGETS: Target[] = [
  { table: "looks", column: "primary_image_url", bucket: "looks", owner: async (row) => (row.stylist_id as string) ?? null },
  { table: "look_images", column: "image_url", bucket: "looks", owner: (row) => ownerOf("looks", "stylist_id", row.look_id) },
  { table: "look_items", column: "image_url", bucket: "looks", owner: (row) => ownerOf("looks", "stylist_id", row.look_id) },
  { table: "lookbooks", column: "cover_image_url", bucket: "lookbooks", owner: async (row) => (row.owner_id as string) ?? null },
  { table: "lookbook_items", column: "image_url", bucket: "lookbooks", owner: (row) => ownerOf("lookbooks", "owner_id", row.lookbook_id) }
];

function isOurCloudinary(url: unknown): url is string {
  if (typeof url !== "string" || !cloudName) return false;
  try {
    const parsed = new URL(url);
    return parsed.hostname === "res.cloudinary.com" && parsed.pathname.startsWith(`/${cloudName}/`);
  } catch {
    return false;
  }
}

// The dashboard also took GIFs, which the buckets don't. Cloudinary sends any
// photo as a JPEG when asked for it with a .jpg ending.
function downloadUrl(url: string): string {
  const parsed = new URL(url);
  if (!/\.(jpe?g|png|webp)$/i.test(parsed.pathname)) {
    parsed.pathname = parsed.pathname.replace(/(\.[a-z0-9]+)?$/i, ".jpg");
  }
  return parsed.toString();
}

async function copyToSupabase(url: string, bucket: string, ownerId: string): Promise<{ path: string; publicUrl: string }> {
  const res = await fetch(downloadUrl(url), { signal: AbortSignal.timeout(30_000) });
  if (!res.ok) throw new Error(`download failed (${res.status})`);
  const contentType = (res.headers.get("content-type") ?? "").split(";")[0].trim();
  const extension = EXTENSIONS[contentType];
  if (!extension) throw new Error(`not a JPEG, PNG or WebP photo (${contentType || "no type"})`);

  const path = `${ownerId}/${randomUUID()}.${extension}`;
  const { error } = await supabase.storage
    .from(bucket)
    .upload(path, Buffer.from(await res.arrayBuffer()), { contentType, upsert: false });
  if (error) throw new Error(`upload failed (${error.message})`);
  return { path, publicUrl: supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl };
}

/** Rows whose column holds one of our Cloudinary links, a page at a time. */
async function* rowsToMove(target: Target): AsyncGenerator<Row> {
  let after = "";
  for (;;) {
    let query = supabase
      .from(target.table)
      .select("*")
      .like(target.column, `https://res.cloudinary.com/${cloudName}/%`)
      .order("id")
      .limit(PAGE);
    if (after) query = query.gt("id", after);
    const { data, error } = await query;
    if (error) throw new Error(`${target.table}: ${error.message}`);
    const rows = (data ?? []) as Row[];
    yield* rows;
    if (rows.length < PAGE) return;
    after = rows[rows.length - 1].id;
  }
}

async function main() {
  if (!cloudName) {
    console.error("Set NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME to the cloud the dashboard uploaded to.");
    process.exit(1);
  }
  console.log(apply ? "Moving photos." : "Dry run: nothing changes. Run with --apply to move the photos.");

  const totals = { found: 0, moved: 0, failed: 0 };
  for (const target of TARGETS) {
    for await (const row of rowsToMove(target)) {
      const url = row[target.column];
      if (!isOurCloudinary(url)) continue;
      totals.found++;
      const ownerId = await target.owner(row);
      if (!ownerId) {
        console.warn(`${target.table} ${row.id}: no owner found, skipped`);
        totals.failed++;
        continue;
      }
      if (!apply) {
        console.log(`${target.table} ${row.id}: would copy ${url} to ${target.bucket}/${ownerId}/`);
        continue;
      }
      try {
        const copy = await copyToSupabase(url, target.bucket, ownerId);
        // Only if nobody changed the photo while it was copying.
        const { data: updated, error } = await supabase
          .from(target.table)
          .update({ [target.column]: copy.publicUrl })
          .eq("id", row.id)
          .eq(target.column, url)
          .select("id");
        if (error || !updated?.length) {
          await supabase.storage.from(target.bucket).remove([copy.path]);
          throw new Error(error ? `update failed (${error.message})` : "photo changed while copying, left as is");
        }
        totals.moved++;
        console.log(`${target.table} ${row.id}: moved`);
      } catch (err) {
        totals.failed++;
        console.error(`${target.table} ${row.id}: ${err instanceof Error ? err.message : String(err)}`);
      }
    }
  }

  console.log(JSON.stringify(totals));
  if (totals.failed) process.exitCode = 2;
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
