import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireStylistId, stylistError, stylistUnauthorized } from '@/lib/stylist-auth'
import { calendarDaySchema, isoDate, parseBody } from '@/lib/stylist-schemas'

/** The stylist's own calendar, or null. */
async function ownCalendar(admin: ReturnType<typeof createAdminClient>, calendarId: string, ownerId: string) {
  const { data } = await admin
    .from('stylist_calendars')
    .select('id, month, year')
    .eq('id', calendarId)
    .eq('stylist_id', ownerId)
    .maybeSingle()
  return data as { id: string; month: number; year: number } | null
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ calendarId: string }> }) {
  const ownerId = await requireStylistId(request)
  if (!ownerId) return stylistUnauthorized()

  const { calendarId } = await params
  const parsed = await parseBody(request, calendarDaySchema)
  if ('response' in parsed) return parsed.response
  const admin = createAdminClient()
  const calendar = await ownCalendar(admin, calendarId, ownerId)
  if (!calendar) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  // A month's calendar only plans days in that month.
  const month = `${calendar.year}-${String(calendar.month).padStart(2, '0')}-`
  if (!parsed.data.date.startsWith(month)) {
    return NextResponse.json({ error: 'That day isn’t in this month.' }, { status: 400 })
  }

  const { data: day, error } = await admin
    .from('stylist_calendar_days')
    .upsert({ ...parsed.data, calendar_id: calendarId }, { onConflict: 'calendar_id,date' })
    .select().single()

  if (error) return stylistError(error.message, 500)
  return NextResponse.json({ day })
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ calendarId: string }> }) {
  const ownerId = await requireStylistId(request)
  if (!ownerId) return stylistUnauthorized()

  const { calendarId } = await params
  const { searchParams } = new URL(request.url)
  const date = isoDate.safeParse(searchParams.get('date'))
  if (!date.success) return NextResponse.json({ error: 'Invalid date' }, { status: 400 })
  const admin = createAdminClient()

  if (!(await ownCalendar(admin, calendarId, ownerId))) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const { error } = await admin.from('stylist_calendar_days').delete().eq('calendar_id', calendarId).eq('date', date.data)
  if (error) return stylistError(error.message, 500)
  return NextResponse.json({ success: true })
}
