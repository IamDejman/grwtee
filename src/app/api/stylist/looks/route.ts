import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireStylistId, stylistError, stylistUnauthorized } from '@/lib/stylist-auth'
import { sanitizeSearchTerm } from '@/lib/security/search-sanitize'

export async function GET(request: NextRequest) {
  const ownerId = await requireStylistId(request)
  if (!ownerId) return stylistUnauthorized()

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

  if (q) query = query.ilike('title', `%${sanitizeSearchTerm(q)}%`)
  const { data, error } = await query
  if (error) return stylistError(error.message, 500)

  return NextResponse.json({ looks: data })
}

export async function POST(request: NextRequest) {
  const ownerId = await requireStylistId(request)
  if (!ownerId) return stylistUnauthorized()

  const body = await request.json()
  const { items, stylist_id: _ignored, ...lookData } = body
  const admin = createAdminClient()

  const { data: look, error } = await admin
    .from('looks')
    .insert({ ...lookData, stylist_id: ownerId })
    .select()
    .single()

  if (error || !look) return stylistError(error?.message, 500)

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
