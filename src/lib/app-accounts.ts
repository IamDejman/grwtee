import { createHmac, timingSafeEqual } from "crypto";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Deleting a GRWTEE app account from the website (/delete-account), for
 * people who can't open the app. The app does the same in its own API
 * (grwtee-mobile api/app/api/account/route.ts); keep the two in step.
 *
 * The request only sends a link to the account's email address; the account
 * is deleted when that link is confirmed, so knowing an email isn't enough.
 */

// Buckets the app uploads to, with each person's files under `{userId}/`.
const USER_FOLDER_BUCKETS = ["avatars", "wardrobe", "lookbooks", "looks", "tryon-models"];
const LIST_PAGE = 100;
export const DELETION_LINK_HOURS = 24;

export type AppAccount = { id: string; role: string };

export async function findAppAccountByEmail(email: string): Promise<AppAccount | null> {
  const { data } = await createAdminClient()
    .from("profiles")
    .select("id, role")
    .eq("email", email.trim().toLowerCase())
    .maybeSingle();
  return (data as AppAccount | null) ?? null;
}

export async function findAppAccount(id: string): Promise<AppAccount | null> {
  const { data } = await createAdminClient().from("profiles").select("id, role").eq("id", id).maybeSingle();
  return (data as AppAccount | null) ?? null;
}

/** Stylist and admin accounts own the looks and every client conversation. */
export function isStaffAccount(account: AppAccount): boolean {
  return account.role === "stylist" || account.role === "admin";
}

async function listFolder(admin: ReturnType<typeof createAdminClient>, bucket: string, folder: string): Promise<string[]> {
  const paths: string[] = [];
  for (let offset = 0; ; offset += LIST_PAGE) {
    const { data, error } = await admin.storage.from(bucket).list(folder, { limit: LIST_PAGE, offset });
    if (error) throw new Error(`list ${bucket}/${folder}: ${error.message}`);
    for (const file of data ?? []) paths.push(`${folder}/${file.name}`);
    if (!data || data.length < LIST_PAGE) return paths;
  }
}

async function removeFiles(admin: ReturnType<typeof createAdminClient>, bucket: string, paths: string[]): Promise<void> {
  for (let i = 0; i < paths.length; i += LIST_PAGE) {
    const { error } = await admin.storage.from(bucket).remove(paths.slice(i, i + LIST_PAGE));
    if (error) throw new Error(`remove from ${bucket}: ${error.message}`);
  }
}

/**
 * Removes the person's photos and try-on results, then the auth user.
 * Deleting the auth user deletes their profile and every row that belongs to
 * it. Files go first, so a storage error can be retried without losing
 * anything. Throws on failure.
 */
export async function deleteAppAccount(userId: string): Promise<void> {
  const admin = createAdminClient();
  for (const bucket of USER_FOLDER_BUCKETS) {
    await removeFiles(admin, bucket, await listFolder(admin, bucket, userId));
  }
  await removeFiles(admin, "user-assets", await listFolder(admin, "user-assets", `tryon-results/${userId}`));

  const { error } = await admin.auth.admin.deleteUser(userId);
  if (error) throw new Error(`deleteUser: ${error.message}`);
}

function signingKey(): Buffer {
  const secret = process.env.NEXTAUTH_SECRET;
  if (!secret) throw new Error("NEXTAUTH_SECRET is not set");
  // A key of its own, so these links can't be confused with anything else signed.
  return createHmac("sha256", secret).update("grwtee:app-account-deletion").digest();
}

function sign(payload: string): string {
  return createHmac("sha256", signingKey()).update(payload).digest("base64url");
}

/** A link token for deleting this account, valid for DELETION_LINK_HOURS. */
export function deletionToken(userId: string, now = Date.now()): string {
  const payload = Buffer.from(JSON.stringify({ u: userId, e: now + DELETION_LINK_HOURS * 3_600_000 })).toString("base64url");
  return `${payload}.${sign(payload)}`;
}

/** The account id a token is for, or null when it's damaged, forged or expired. */
export function verifyDeletionToken(token: string, now = Date.now()): string | null {
  const [payload, signature, extra] = token.split(".");
  if (!payload || !signature || extra !== undefined) return null;
  const expected = Buffer.from(sign(payload));
  const given = Buffer.from(signature);
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return null;
  try {
    const { u, e } = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as { u?: unknown; e?: unknown };
    if (typeof u !== "string" || typeof e !== "number" || e < now) return null;
    return u;
  } catch {
    return null;
  }
}
