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

export async function GET(request: NextRequest) {
  const ownerId = await getStylistId(request)
  if (!ownerId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = createAdminClient()
  const { data } = await admin
    .from('lookbooks')
    .select('*, lookbook_items(*)')
    .eq('owner_id', ownerId)
    .order('created_at', { ascending: false })

  return NextResponse.json({ lookbooks: data })
}

export async function POST(request: NextRequest) {
  const ownerId = await getStylistId(request)
  if (!ownerId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const { items, ...lookbookData } = body
  const admin = createAdminClient()

  const { data: lookbook, error } = await admin
    .from('lookbooks')
    .insert({ ...lookbookData, owner_id: ownerId })
    .select().single()

  if (error || !lookbook) return NextResponse.json({ error: error?.message }, { status: 500 })

  if (items && items.length > 0) {
    await admin.from('lookbook_items').insert(
      items.map((item: Record<string, unknown>, i: number) => ({
        ...item, lookbook_id: lookbook.id, sort_order: i,
        price: item.price ? parseFloat(item.price as string) : null
      }))
    )
  }

  return NextResponse.json({ lookbook }, { status: 201 })
}
