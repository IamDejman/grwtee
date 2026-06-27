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

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const ownerId = await getStylistId(request)
  if (!ownerId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const body = await request.json()
  const { items, ...lookbookData } = body
  const admin = createAdminClient()

  const { data: lookbook, error } = await admin
    .from('lookbooks')
    .update({ ...lookbookData, updated_at: new Date().toISOString() })
    .eq('id', id).eq('owner_id', ownerId).select().single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  if (items !== undefined) {
    await admin.from('lookbook_items').delete().eq('lookbook_id', id)
    if (items.length > 0) {
      await admin.from('lookbook_items').insert(
        items.map((item: Record<string, unknown>, i: number) => ({
          ...item, lookbook_id: id, sort_order: i,
          price: item.price ? parseFloat(item.price as string) : null
        }))
      )
    }
  }

  return NextResponse.json({ lookbook })
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const ownerId = await getStylistId(request)
  if (!ownerId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const admin = createAdminClient()
  const { error } = await admin.from('lookbooks').delete().eq('id', id).eq('owner_id', ownerId)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
