import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireStylistId, stylistError, stylistUnauthorized } from '@/lib/stylist-auth'

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ calendarId: string }> }) {
  const ownerId = await requireStylistId(request)
  if (!ownerId) return stylistUnauthorized()

  const { calendarId } = await params
  const body = await request.json()
  const { stylist_id: _ignored, ...patchData } = body
  const admin = createAdminClient()

  const { data, error } = await admin
    .from('stylist_calendar')
    .update(patchData)
    .eq('id', calendarId)
    .eq('stylist_id', ownerId)
    .select().single()

  if (error) return stylistError(error.message, 500)
  return NextResponse.json({ calendar: data })
}
