import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireStylistId, stylistError, stylistUnauthorized } from '@/lib/stylist-auth'
import { lookPatchSchema, lookSchema, parseBody } from '@/lib/stylist-schemas'
import { replaceItems } from '@/lib/stylist-items'

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const ownerId = await requireStylistId(request)
  if (!ownerId) return stylistUnauthorized()

  const { id } = await params
  const admin = createAdminClient()
  const { data, error } = await admin.from('looks').select('*, look_items(*), look_images(*)').eq('id', id).eq('stylist_id', ownerId).single()
  if (error || !data) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  return NextResponse.json({ look: data })
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const ownerId = await requireStylistId(request)
  if (!ownerId) return stylistUnauthorized()

  const { id } = await params
  const parsed = await parseBody(request, lookSchema)
  if ('response' in parsed) return parsed.response
  const { items, ...lookData } = parsed.data
  const admin = createAdminClient()

  const { data: look, error } = await admin
    .from('looks')
    .update({ ...lookData, updated_at: new Date().toISOString() })
    .eq('id', id).eq('stylist_id', ownerId).select().single()

  if (error || !look) return stylistError(error?.message, 500)

  if (items !== undefined) {
    const itemsError = await replaceItems(admin, 'look_items', 'look_id', id, items)
    if (itemsError) return stylistError(itemsError, 500)
  }

  return NextResponse.json({ look })
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const ownerId = await requireStylistId(request)
  if (!ownerId) return stylistUnauthorized()

  const { id } = await params
  const parsed = await parseBody(request, lookPatchSchema)
  if ('response' in parsed) return parsed.response
  const admin = createAdminClient()

  const { data: look, error } = await admin
    .from('looks')
    .update({ ...parsed.data, updated_at: new Date().toISOString() })
    .eq('id', id).eq('stylist_id', ownerId).select().single()

  if (error) return stylistError(error.message, 500)
  return NextResponse.json({ look })
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const ownerId = await requireStylistId(request)
  if (!ownerId) return stylistUnauthorized()

  const { id } = await params
  const admin = createAdminClient()
  const { error } = await admin.from('looks').delete().eq('id', id).eq('stylist_id', ownerId)
  if (error) return stylistError(error.message, 500)
  return NextResponse.json({ success: true })
}
