import { NextRequest, NextResponse } from 'next/server'
import { getToken } from 'next-auth/jwt'
import { createAdminClient } from '@/lib/supabase/admin'

async function getStylistId(request: NextRequest) {
  const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET })
  if (!token?.email) return null
  const admin = createAdminClient()
  const { data } = await admin.from('profiles').select('id').eq('email', token.email as string).single()
  return data?.id ?? null
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const ownerId = await getStylistId(request)
  if (!ownerId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const admin = createAdminClient()
  const { data, error } = await admin.from('looks').select('*, look_items(*), look_images(*)').eq('id', id).eq('stylist_id', ownerId).single()
  if (error || !data) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  return NextResponse.json({ look: data })
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const ownerId = await getStylistId(request)
  if (!ownerId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const body = await request.json()
  const { items, ...lookData } = body
  const admin = createAdminClient()

  const { data: look, error } = await admin
    .from('looks')
    .update({ ...lookData, updated_at: new Date().toISOString() })
    .eq('id', id).eq('stylist_id', ownerId).select().single()

  if (error || !look) return NextResponse.json({ error: error?.message ?? 'Update failed' }, { status: 500 })

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
  const ownerId = await getStylistId(request)
  if (!ownerId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const body = await request.json()
  const admin = createAdminClient()

  const { data: look, error } = await admin
    .from('looks')
    .update({ ...body, updated_at: new Date().toISOString() })
    .eq('id', id).eq('stylist_id', ownerId).select().single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ look })
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const ownerId = await getStylistId(request)
  if (!ownerId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const admin = createAdminClient()
  const { error } = await admin.from('looks').delete().eq('id', id).eq('stylist_id', ownerId)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
