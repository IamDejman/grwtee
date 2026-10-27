import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireStylistId, stylistError, stylistUnauthorized } from '@/lib/stylist-auth'
import { calendarCreateSchema, parseBody } from '@/lib/stylist-schemas'

export async function GET(request: NextRequest) {
  const ownerId = await requireStylistId(request)
  if (!ownerId) return stylistUnauthorized()

  const { searchParams } = new URL(request.url)
  const admin = createAdminClient()
  const { data } = await admin
    .from('stylist_calendars')
    .select('*')
    .eq('stylist_id', ownerId)
    .eq('month', searchParams.get('month'))
    .eq('year', searchParams.get('year'))
    .maybeSingle()

  return NextResponse.json({ calendar: data })
}

export async function POST(request: NextRequest) {
  const ownerId = await requireStylistId(request)
  if (!ownerId) return stylistUnauthorized()

  const parsed = await parseBody(request, calendarCreateSchema)
  if ('response' in parsed) return parsed.response
  const admin = createAdminClient()
  const { data: calendar, error } = await admin
    .from('stylist_calendars')
    .insert({ ...parsed.data, stylist_id: ownerId })
    .select().single()

  if (error) return stylistError(error.message, 500)
  return NextResponse.json({ calendar }, { status: 201 })
}
