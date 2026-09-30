import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { getStylistId } from '@/lib/stylist-auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { clientName } from '@/lib/stylist-clients'
import { MessageThread } from '@/components/stylist/MessageThread'
import { ClientAvatar } from '@/components/stylist/ClientAvatar'

export const metadata = { title: 'Conversation' }

export default async function MessageThreadPage({ params }: { params: Promise<{ id: string }> }) {
  const ownerId = await getStylistId()
  if (!ownerId) redirect('/admin/login')

  const { id } = await params
  const admin = createAdminClient()

  const [convRes, messagesRes] = await Promise.all([
    admin.from('conversations').select('id, client_id').eq('id', id).eq('stylist_id', ownerId).maybeSingle(),
    // Newest 200, shown oldest first.
    admin.from('messages').select('id, sender_id, content, created_at, image_url').eq('conversation_id', id).order('created_at', { ascending: false }).limit(200)
  ])
  const conv = convRes.data
  if (!conv) notFound()

  const [{ data: client }, { error: readError }] = await Promise.all([
    admin.from('profiles').select('id, full_name, avatar_url, email').eq('id', conv.client_id).maybeSingle(),
    admin.from('messages').update({ is_read: true }).eq('conversation_id', id).neq('sender_id', ownerId).eq('is_read', false)
  ])
  if (readError) console.error('Could not mark messages read', readError.message)

  const name = client ? clientName(client) : 'Client'

  return (
    // Phones: fill the space between the top bar and the tab bar so the reply box stays in view.
    <div className="fixed inset-x-0 bottom-[calc(3.5rem+env(safe-area-inset-bottom))] top-12 z-20 flex flex-col bg-atelier-canvas lg:static lg:h-[calc(100dvh-4rem)] lg:overflow-hidden lg:rounded-2xl lg:border lg:border-atelier-border lg:bg-white">
      <div className="flex shrink-0 items-center gap-3 border-b border-atelier-border bg-white px-4 py-3 sm:px-5">
        <Link
          href="/admin/messages"
          aria-label="Back to messages"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-purple-dark transition hover:bg-atelier-lavender"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden />
        </Link>
        <ClientAvatar name={name} src={client?.avatar_url ?? null} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-atelier-ink">{name}</p>
          {client?.email && client.full_name ? <p className="truncate text-xs text-atelier-faint">{client.email}</p> : null}
        </div>
        <Link
          href={`/admin/clients/${conv.client_id}`}
          className="shrink-0 rounded-lg px-2.5 py-1.5 text-sm font-medium text-purple-dark transition hover:bg-atelier-lavender"
        >
          Profile
        </Link>
      </div>
      <MessageThread conversationId={id} initialMessages={(messagesRes.data ?? []).reverse()} currentUserId={ownerId} />
    </div>
  )
}
