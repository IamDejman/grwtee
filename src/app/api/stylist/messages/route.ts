import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireStylistId, stylistError, stylistUnauthorized } from '@/lib/stylist-auth'

export async function POST(request: NextRequest) {
  const ownerId = await requireStylistId(request)
  if (!ownerId) return stylistUnauthorized()

  const body = await request.json()
  const { conversation_id, content, message_type, media_url } = body

  if (!conversation_id || !content?.trim()) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }

  const admin = createAdminClient()
  const { data: conv } = await admin
    .from('conversations')
    .select('id, client_id')
    .eq('id', conversation_id)
    .eq('stylist_id', ownerId)
    .single()

  if (!conv) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const { data: message, error } = await admin
    .from('messages')
    .insert({
      conversation_id,
      sender_id: ownerId,
      content: content.trim(),
      message_type: message_type ?? 'text',
      media_url: media_url ?? null
    })
    .select().single()

  if (error) return stylistError(error.message, 500)

  await admin.from('conversations').update({ last_message_at: new Date().toISOString() }).eq('id', conversation_id)

  return NextResponse.json({ message }, { status: 201 })
}
