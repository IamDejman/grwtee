import type { createAdminClient } from '@/lib/supabase/admin'

type AdminClient = ReturnType<typeof createAdminClient>

/**
 * Swaps a look's or lookbook's items for a new list, in the order given.
 * The new items go in before the old ones come out, so a save that fails
 * keeps what was there. Returns the error message, if any.
 */
export async function replaceItems(
  admin: AdminClient,
  table: 'look_items' | 'lookbook_items',
  parentColumn: 'look_id' | 'lookbook_id',
  parentId: string,
  items: Record<string, unknown>[]
): Promise<string | null> {
  const { data: old, error: readError } = await admin.from(table).select('id').eq(parentColumn, parentId)
  if (readError) return readError.message

  if (items.length) {
    const { error } = await admin
      .from(table)
      .insert(items.map((item, i) => ({ ...item, [parentColumn]: parentId, sort_order: i })))
    if (error) return error.message
  }

  const oldIds = (old ?? []).map((row) => row.id as string)
  if (oldIds.length) {
    const { error } = await admin.from(table).delete().in('id', oldIds)
    if (error) return error.message
  }
  return null
}
