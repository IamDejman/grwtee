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

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ calendarId: string }> }) {
  const ownerId = await getStylistId(request)
  if (!ownerId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { calendarId } = await params
  const body = await request.json()
  const admin = createAdminClient()

  const { data, error } = await admin
    .from('stylist_calendar')
    .update(body)
    .eq('id', calendarId)
    .eq('stylist_id', ownerId)
    .select().single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ calendar: data })
}
