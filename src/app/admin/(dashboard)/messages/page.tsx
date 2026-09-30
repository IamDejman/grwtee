import Link from 'next/link'
import { redirect } from 'next/navigation'
import { MessageSquare } from 'lucide-react'
import { getStylistId } from '@/lib/stylist-auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { clientName, getStylistClients } from '@/lib/stylist-clients'
import { EmptyState, PageHeader } from '@/components/admin/ui'
import { ClientAvatar } from '@/components/stylist/ClientAvatar'

export const metadata = { title: 'Messages' }

const LAGOS = 'Africa/Lagos'

function when(iso: string | null) {
  if (!iso) return ''
  const date = new Date(iso)
  const day = (d: Date) => d.toLocaleDateString('en-GB', { timeZone: LAGOS })
  return day(date) === day(new Date())
    ? date.toLocaleTimeString('en-GB', { hour: 'numeric', minute: '2-digit', hour12: true, timeZone: LAGOS })
    : date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', timeZone: LAGOS })
}

export default async function MessagesPage() {
  const ownerId = await getStylistId()
  if (!ownerId) redirect('/admin/login')

  const { clients, error } = await getStylistClients(ownerId)

  const lastMessage: Record<string, string> = {}
  const unread: Record<string, number> = {}
  if (clients.length) {
    const { data: msgs } = await createAdminClient()
      .from('messages')
      .select('conversation_id, content, image_url, sender_id, is_read')
      .in('conversation_id', clients.map((c) => c.conversation_id))
      .order('created_at', { ascending: false })
    for (const m of msgs ?? []) {
      if (!(m.conversation_id in lastMessage)) {
        const text = m.content?.trim() || (m.image_url ? 'Photo' : '')
        lastMessage[m.conversation_id] = m.sender_id === ownerId && text ? `You: ${text}` : text
      }
      if (!m.is_read && m.sender_id !== ownerId) unread[m.conversation_id] = (unread[m.conversation_id] ?? 0) + 1
    }
  }

  return (
    <div>
      <PageHeader title="Messages" />

      {error ? (
        <p className="mb-4 rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700" role="alert">
          Couldn&apos;t load your messages. Refresh to try again.
        </p>
      ) : !clients.length ? (
        <div className="rounded-2xl border border-atelier-border bg-white">
          <EmptyState icon={MessageSquare} title="No messages yet. When a client messages you in the app, it shows up here." />
        </div>
      ) : (
        <ul className="divide-y divide-atelier-border overflow-hidden rounded-2xl border border-atelier-border bg-white">
          {clients.map((client) => {
            const count = unread[client.conversation_id] ?? 0
            const name = clientName(client)
            return (
              <li key={client.conversation_id}>
                <Link
                  href={`/admin/messages/${client.conversation_id}`}
                  className={`flex items-center gap-3 px-4 py-3.5 transition hover:bg-atelier-canvas sm:px-5 ${count ? 'bg-gold/5' : ''}`}
                >
                  <ClientAvatar name={name} src={client.avatar_url} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline justify-between gap-3">
                      <p className={`truncate text-sm text-atelier-ink ${count ? 'font-semibold' : 'font-medium'}`}>{name}</p>
                      <span className="shrink-0 text-xs tabular-nums text-atelier-faint">{when(client.last_message_at)}</span>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <p className={`truncate text-sm ${count ? 'text-atelier-ink' : 'text-atelier-muted'}`}>
                        {lastMessage[client.conversation_id] || 'No messages yet'}
                      </p>
                      {count ? (
                        <span className="flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-gold px-1.5 text-xs font-semibold tabular-nums text-white">
                          {count}
                          <span className="sr-only"> unread</span>
                        </span>
                      ) : null}
                    </div>
                  </div>
                </Link>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
