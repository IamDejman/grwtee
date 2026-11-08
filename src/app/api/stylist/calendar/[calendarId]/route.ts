import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireStylistId, stylistError, stylistUnauthorized } from '@/lib/stylist-auth'
import { calendarPatchSchema, parseBody } from '@/lib/stylist-schemas'

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ calendarId: string }> }) {
  const ownerId = await requireStylistId(request)
  if (!ownerId) return stylistUnauthorized()

  const { calendarId } = await params
  const parsed = await parseBody(request, calendarPatchSchema)
  if ('response' in parsed) return parsed.response
  const admin = createAdminClient()

  const { data, error } = await admin
    .from('stylist_calendars')
    .update({ ...parsed.data, updated_at: new Date().toISOString() })
    .eq('id', calendarId)
    .eq('stylist_id', ownerId)
    .select().single()

  if (error) return stylistError(error.message, 500)
  return NextResponse.json({ calendar: data })
}
