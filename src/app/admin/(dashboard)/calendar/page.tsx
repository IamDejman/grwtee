import { redirect } from 'next/navigation'
import { getStylistId } from '@/lib/stylist-auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { CalendarView } from '@/components/stylist/CalendarView'

export const metadata = { title: 'Calendar' }

interface CalendarDay {
  id: string
  date: string
  occasion: string | null
  notes: string | null
  primary_look_id: string | null
  alternate_look_id: string | null
  lookbook_id: string | null
}

export default async function CalendarPage({
  searchParams
}: {
  searchParams: Promise<{ month?: string; year?: string }>
}) {
  const ownerId = await getStylistId()
  if (!ownerId) redirect('/admin/login')

  const params = await searchParams
  const now = new Date()
  const month = parseInt(params.month ?? String(now.getMonth() + 1))
  const year = parseInt(params.year ?? String(now.getFullYear()))

  const admin = createAdminClient()

  const [calendarRes, looksRes] = await Promise.all([
    admin
      .from('stylist_calendar')
      .select('id, title, is_published, month, year')
      .eq('stylist_id', ownerId)
      .eq('month', month)
      .eq('year', year)
      .maybeSingle(),
    admin
      .from('looks')
      .select('id, title, primary_image_url, occasion')
      .eq('stylist_id', ownerId)
      .eq('is_published', true)
      .order('title')
  ])

  const calendar = calendarRes.data
  let days: CalendarDay[] = []

  if (calendar) {
    const daysRes = await admin
      .from('stylist_calendar_days')
      .select('id, date, occasion, notes, primary_look_id, alternate_look_id, lookbook_id')
      .eq('calendar_id', calendar.id)
    days = daysRes.data ?? []
  }

  return (
    <CalendarView
      stylistId={ownerId}
      month={month}
      year={year}
      calendar={calendar ?? null}
      days={days}
      looks={looksRes.data ?? []}
    />
  )
}
