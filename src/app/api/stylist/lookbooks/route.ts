import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireStylistId, stylistError, stylistUnauthorized } from '@/lib/stylist-auth'
import { isClientProfile } from '@/lib/stylist-clients'
import { lookbookSchema, parseBody } from '@/lib/stylist-schemas'

export async function GET(request: NextRequest) {
  const ownerId = await requireStylistId(request)
  if (!ownerId) return stylistUnauthorized()

  const admin = createAdminClient()
  const { data } = await admin
    .from('lookbooks')
    .select('*, lookbook_items(*)')
    .eq('owner_id', ownerId)
    .order('created_at', { ascending: false })

  return NextResponse.json({ lookbooks: data })
}

export async function POST(request: NextRequest) {
  const ownerId = await requireStylistId(request)
  if (!ownerId) return stylistUnauthorized()

  const parsed = await parseBody(request, lookbookSchema)
  if ('response' in parsed) return parsed.response
  const { items, ...lookbookData } = parsed.data
  if (lookbookData.assigned_to && !(await isClientProfile(lookbookData.assigned_to))) {
    return NextResponse.json({ error: 'Pick a client from the list.' }, { status: 400 })
  }
  const admin = createAdminClient()

  const { data: lookbook, error } = await admin
    .from('lookbooks')
    .insert({
      ...lookbookData,
      owner_id: ownerId,
      // The app's feed is ordered by this.
      feed_published_at: lookbookData.show_in_feed ? new Date().toISOString() : null
    })
    .select().single()

  if (error || !lookbook) return stylistError(error?.message, 500)

  if (items?.length) {
    const { error: itemsError } = await admin
      .from('lookbook_items')
      .insert(items.map((item, i) => ({ ...item, lookbook_id: lookbook.id, sort_order: i })))
    if (itemsError) {
      // Don't leave half a lookbook behind: saving again would make a second one.
      await admin.from('lookbooks').delete().eq('id', lookbook.id)
      return stylistError(itemsError.message, 500)
    }
  }

  return NextResponse.json({ lookbook }, { status: 201 })
}
