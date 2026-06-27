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

export async function POST(request: NextRequest) {
  const ownerId = await getStylistId(request)
  if (!ownerId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const { conversation_id, content, message_type, media_url } = body

  if (!conversation_id || !content?.trim()) {
    return NextResponse.json({ error: 'conversation_id and content are required' }, { status: 400 })
  }

  const admin = createAdminClient()
  const { data: conv } = await admin
    .from('conversations')
    .select('id, client_id')
    .eq('id', conversation_id)
    .eq('stylist_id', ownerId)
    .single()

  if (!conv) return NextResponse.json({ error: 'Conversation not found' }, { status: 404 })

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

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  await admin.from('conversations').update({ last_message_at: new Date().toISOString() }).eq('id', conversation_id)

  return NextResponse.json({ message }, { status: 201 })
}
