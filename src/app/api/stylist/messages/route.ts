import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireStylistId, stylistError, stylistUnauthorized } from '@/lib/stylist-auth'

/**
 * Messages in one of the stylist's conversations created at or after `after` (an ISO time,
 * normally the newest message the open thread already shows). The thread polls this for new
 * client messages, so the browser never reads Supabase itself.
 */
export async function GET(request: NextRequest) {
  const ownerId = await requireStylistId(request)
  if (!ownerId) return stylistUnauthorized()

  const conversationId = request.nextUrl.searchParams.get('conversation_id')
  const after = request.nextUrl.searchParams.get('after')
  if (!conversationId || !after || Number.isNaN(Date.parse(after))) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }

  const admin = createAdminClient()
  const { data: conv } = await admin
    .from('conversations')
    .select('id')
    .eq('id', conversationId)
    .eq('stylist_id', ownerId)
    .maybeSingle()
  if (!conv) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  // At or after: two messages can share a timestamp, and the thread drops ones it already has.
  const { data: messages, error } = await admin
    .from('messages')
    .select('id, sender_id, content, created_at, image_url')
    .eq('conversation_id', conversationId)
    .gte('created_at', after)
    .order('created_at', { ascending: true })
    .limit(100)
  if (error) return stylistError(error.message, 500)

  return NextResponse.json({ messages: messages ?? [] }, { headers: { 'Cache-Control': 'no-store' } })
}

export async function POST(request: NextRequest) {
  const ownerId = await requireStylistId(request)
  if (!ownerId) return stylistUnauthorized()

  const body = await request.json()
  const { conversation_id, content } = body

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
      content: content.trim()
    })
    .select().single()

  if (error) return stylistError(error.message, 500)

  await admin.from('conversations').update({ last_message_at: new Date().toISOString() }).eq('id', conversation_id)

  return NextResponse.json({ message }, { status: 201 })
}
