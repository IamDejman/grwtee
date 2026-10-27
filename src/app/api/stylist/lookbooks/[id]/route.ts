import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireStylistId, stylistError, stylistUnauthorized } from '@/lib/stylist-auth'
import { isClientProfile } from '@/lib/stylist-clients'
import { replaceItems } from '@/lib/stylist-items'
import { lookbookSchema, parseBody } from '@/lib/stylist-schemas'

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const ownerId = await requireStylistId(request)
  if (!ownerId) return stylistUnauthorized()

  const { id } = await params
  const parsed = await parseBody(request, lookbookSchema)
  if ('response' in parsed) return parsed.response
  const { items, ...lookbookData } = parsed.data
  if (lookbookData.assigned_to && !(await isClientProfile(lookbookData.assigned_to))) {
    return NextResponse.json({ error: 'Pick a client from the list.' }, { status: 400 })
  }
  const admin = createAdminClient()

  const { data: current } = await admin
    .from('lookbooks')
    .select('show_in_feed')
    .eq('id', id).eq('owner_id', ownerId).maybeSingle()
  if (!current) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const now = new Date().toISOString()
  const update: Record<string, unknown> = { ...lookbookData, updated_at: now }
  // The app's feed is ordered by when a lookbook joined it, so set that
  // once when it goes in, not on every save.
  if (lookbookData.show_in_feed === true && !current.show_in_feed) update.feed_published_at = now
  if (lookbookData.show_in_feed === false) update.feed_published_at = null

  const { data: lookbook, error } = await admin
    .from('lookbooks')
    .update(update)
    .eq('id', id).eq('owner_id', ownerId).select().single()

  if (error) return stylistError(error.message, 500)

  if (items !== undefined) {
    const itemsError = await replaceItems(admin, 'lookbook_items', 'lookbook_id', id, items)
    if (itemsError) return stylistError(itemsError, 500)
  }

  return NextResponse.json({ lookbook })
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const ownerId = await requireStylistId(request)
  if (!ownerId) return stylistUnauthorized()

  const { id } = await params
  const admin = createAdminClient()
  const { error } = await admin.from('lookbooks').delete().eq('id', id).eq('owner_id', ownerId)
  if (error) return stylistError(error.message, 500)
  return NextResponse.json({ success: true })
}
