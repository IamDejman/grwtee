import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireStylistId, stylistError, stylistUnauthorized } from '@/lib/stylist-auth'

/**
 * GET /api/stylist/messages?conversation_id=...&after=ISO — messages newer
 * than `after`, oldest first. The thread polls this while it's open; new
 * messages from the client are marked read.
 */
export async function GET(request: NextRequest) {
  const ownerId = await requireStylistId(request)
  if (!ownerId) return stylistUnauthorized()

  const { searchParams } = new URL(request.url)
  const conversationId = searchParams.get('conversation_id')
  const after = searchParams.get('after')
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

  const { data: messages, error } = await admin
    .from('messages')
    .select('id, sender_id, content, created_at, image_url, hidden_at')
    .eq('conversation_id', conversationId)
    .gt('created_at', new Date(after).toISOString())
    .order('created_at', { ascending: true })
    .limit(100)
  if (error) return stylistError(error.message, 500)

  if (messages?.some((m) => m.sender_id !== ownerId)) {
    await admin
      .from('messages')
      .update({ is_read: true })
      .eq('conversation_id', conversationId)
      .neq('sender_id', ownerId)
      .eq('is_read', false)
  }

  return NextResponse.json({ messages: messages ?? [] })
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
