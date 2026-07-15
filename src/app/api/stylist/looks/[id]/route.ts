import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireStylistId, stylistError, stylistUnauthorized } from '@/lib/stylist-auth'

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
  const body = await request.json()
  const { items, stylist_id: _ignored, ...lookData } = body
  const admin = createAdminClient()

  const { data: look, error } = await admin
    .from('looks')
    .update({ ...lookData, updated_at: new Date().toISOString() })
    .eq('id', id).eq('stylist_id', ownerId).select().single()

  if (error || !look) return stylistError(error?.message, 500)

  if (items !== undefined) {
    await admin.from('look_items').delete().eq('look_id', id)
    if (items.length > 0) {
      await admin.from('look_items').insert(
        items.map((item: Record<string, unknown>, i: number) => ({
          ...item, look_id: id, sort_order: i,
          price: item.price ? parseFloat(item.price as string) : null
        }))
      )
    }
  }

  return NextResponse.json({ look })
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const ownerId = await requireStylistId(request)
  if (!ownerId) return stylistUnauthorized()

  const { id } = await params
  const body = await request.json()
  const { stylist_id: _ignored, ...patchData } = body
  const admin = createAdminClient()

  const { data: look, error } = await admin
    .from('looks')
    .update({ ...patchData, updated_at: new Date().toISOString() })
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
