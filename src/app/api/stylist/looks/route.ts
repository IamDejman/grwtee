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
  const { searchParams } = new URL(request.url)
  const q = searchParams.get('q')
  const limit = parseInt(searchParams.get('limit') ?? '50')

  let query = admin
    .from('looks')
    .select('id, title, primary_image_url, occasion, is_published, likes_count, saves_count, views_count')
    .eq('stylist_id', ownerId)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (q) query = query.ilike('title', `%${q}%`)
  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ looks: data })
}

export async function POST(request: NextRequest) {
  const ownerId = await getStylistId(request)
  if (!ownerId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const { items, ...lookData } = body
  const admin = createAdminClient()

  const { data: look, error } = await admin
    .from('looks')
    .insert({ ...lookData, stylist_id: ownerId })
    .select()
    .single()

  if (error || !look) return NextResponse.json({ error: error?.message ?? 'Failed to create look' }, { status: 500 })

  if (items && items.length > 0) {
    await admin.from('look_items').insert(
      items.map((item: Record<string, unknown>, i: number) => ({
        ...item, look_id: look.id, sort_order: i,
        price: item.price ? parseFloat(item.price as string) : null
      }))
    )
  }

  return NextResponse.json({ look }, { status: 201 })
}
