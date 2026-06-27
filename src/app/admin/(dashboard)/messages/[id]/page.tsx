import { redirect, notFound } from 'next/navigation'
import { getStylistId } from '@/lib/stylist-auth'
import { createAdminClient } from '@/lib/supabase/admin'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { MessageThread } from '@/components/stylist/MessageThread'

export const metadata = { title: 'Conversation' }

export default async function MessageThreadPage({ params }: { params: Promise<{ id: string }> }) {
  const ownerId = await getStylistId()
  if (!ownerId) redirect('/admin/login')

  const { id } = await params
  const admin = createAdminClient()

  const [convRes, messagesRes] = await Promise.all([
    admin.from('conversations').select('id, client_id, stylist_id').eq('id', id).eq('stylist_id', ownerId).single(),
    admin.from('messages').select('id, sender_id, content, created_at, message_type, media_url').eq('conversation_id', id).order('created_at', { ascending: true }).limit(200)
  ])

  const conv = convRes.data
  if (!conv) notFound()

  const [clientRes, stylistRes] = await Promise.all([
    admin.from('profiles').select('id, full_name, avatar_url, email').eq('id', conv.client_id).single(),
    admin.from('profiles').select('id, full_name, avatar_url').eq('id', ownerId).single()
  ])

  await admin.from('conversations').update({ unread_count: 0 }).eq('id', id)

  return (
    <div className="flex flex-col h-screen" style={{ backgroundColor: '#F8F5EE' }}>
      <div className="shrink-0 px-6 lg:px-8 py-4 flex items-center gap-4" style={{ backgroundColor: 'rgba(248,245,238,0.95)', backdropFilter: 'blur(12px)', borderBottom: '1px solid #EAE4D8' }}>
        <Link href="/admin/messages" className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ backgroundColor: '#F2EDF8', color: '#422D64' }}>
          <ArrowLeft className="w-4 h-4" />
        </Link>
        {clientRes.data?.avatar_url ? (
          <img src={clientRes.data.avatar_url} alt={clientRes.data.full_name ?? ''} className="w-9 h-9 rounded-full object-cover" />
        ) : (
          <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-semibold" style={{ backgroundColor: '#F2EDF8', color: '#422D64' }}>
            {clientRes.data?.full_name ? clientRes.data.full_name.split(' ').map((n: string) => n[0]).slice(0, 2).join('').toUpperCase() : '?'}
          </div>
        )}
        <div>
          <p className="text-sm font-medium" style={{ color: '#1A1428' }}>{clientRes.data?.full_name ?? 'Client'}</p>
          {clientRes.data?.email && <p className="text-xs" style={{ color: '#9A8DAA' }}>{clientRes.data.email}</p>}
        </div>
        <Link href={`/admin/clients/${conv.client_id}`} className="ml-auto px-3 h-8 rounded-xl text-xs font-medium" style={{ backgroundColor: '#F2EDF8', color: '#422D64' }}>
          View Profile
        </Link>
      </div>
      <MessageThread
        conversationId={id}
        initialMessages={messagesRes.data ?? []}
        currentUserId={ownerId}
        clientProfile={clientRes.data ?? null}
        stylistProfile={stylistRes.data ?? null}
      />
    </div>
  )
}
