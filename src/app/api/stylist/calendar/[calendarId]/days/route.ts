import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireStylistId, stylistError, stylistUnauthorized } from '@/lib/stylist-auth'

async function assertCalendarOwner(admin: ReturnType<typeof createAdminClient>, calendarId: string, ownerId: string) {
  const { data } = await admin
    .from('stylist_calendar')
    .select('id')
    .eq('id', calendarId)
    .eq('stylist_id', ownerId)
    .single();
  return Boolean(data);
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ calendarId: string }> }) {
  const ownerId = await requireStylistId(request)
  if (!ownerId) return stylistUnauthorized()

  const { calendarId } = await params
  const admin = createAdminClient()
  if (!(await assertCalendarOwner(admin, calendarId, ownerId))) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const body = await request.json()
  const { date, ...rest } = body

  const { data: day, error } = await admin
    .from('stylist_calendar_days')
    .upsert({ ...rest, calendar_id: calendarId, date }, { onConflict: 'calendar_id,date' })
    .select().single()

  if (error) return stylistError(error.message, 500)
  return NextResponse.json({ day })
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ calendarId: string }> }) {
  const ownerId = await requireStylistId(request)
  if (!ownerId) return stylistUnauthorized()

  const { calendarId } = await params
  const { searchParams } = new URL(request.url)
  const date = searchParams.get('date')
  const admin = createAdminClient()

  if (!(await assertCalendarOwner(admin, calendarId, ownerId))) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  await admin.from('stylist_calendar_days').delete().eq('calendar_id', calendarId).eq('date', date)
  return NextResponse.json({ success: true })
}
