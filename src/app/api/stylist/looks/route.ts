import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireStylistId, stylistError, stylistUnauthorized } from '@/lib/stylist-auth'
import { sanitizeSearchTerm } from '@/lib/security/search-sanitize'
import { lookSchema, parseBody } from '@/lib/stylist-schemas'
import { clampLimit } from '@/lib/utils'

export async function GET(request: NextRequest) {
  const ownerId = await requireStylistId(request)
  if (!ownerId) return stylistUnauthorized()

  const admin = createAdminClient()
  const { searchParams } = new URL(request.url)
  const q = searchParams.get('q')
  const limit = clampLimit(searchParams.get('limit'), 50, 200)

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

  const parsed = await parseBody(request, lookSchema)
  if ('response' in parsed) return parsed.response
  const { items, ...lookData } = parsed.data
  const admin = createAdminClient()

  const { data: look, error } = await admin
    .from('looks')
    .insert({ ...lookData, stylist_id: ownerId })
    .select()
    .single()

  if (error || !look) return stylistError(error?.message, 500)

  if (items?.length) {
    const { error: itemsError } = await admin
      .from('look_items')
      .insert(items.map((item, i) => ({ ...item, look_id: look.id, sort_order: i })))
    if (itemsError) {
      // Don't leave half a look behind: saving again would make a second one.
      await admin.from('looks').delete().eq('id', look.id)
      return stylistError(itemsError.message, 500)
    }
  }

  return NextResponse.json({ look }, { status: 201 })
}
