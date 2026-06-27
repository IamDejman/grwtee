import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getStylistId } from '@/lib/stylist-auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { MessageSquare } from 'lucide-react'

export const metadata = { title: 'Messages' }

function isToday(date: Date) {
  const now = new Date()
  return date.getDate() === now.getDate() && date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear()
}

export default async function MessagesPage() {
  const ownerId = await getStylistId()
  if (!ownerId) redirect('/admin/login')

  const admin = createAdminClient()
  const { data: conversations } = await admin
    .from('conversations')
    .select('id, client_id, last_message_at, unread_count')
    .eq('stylist_id', ownerId)
    .order('last_message_at', { ascending: false })

  const clientIds = [...new Set((conversations ?? []).map((c) => c.client_id))]
  let profileMap: Record<string, { full_name: string | null; avatar_url: string | null; email: string | null }> = {}

  if (clientIds.length > 0) {
    const { data: profiles } = await admin.from('profiles').select('id, full_name, avatar_url, email').in('id', clientIds)
    ;(profiles ?? []).forEach((p) => { profileMap[p.id] = p })
  }

  const convIds = (conversations ?? []).map((c) => c.id)
  let lastMessages: Record<string, string> = {}
  if (convIds.length > 0) {
    const { data: msgs } = await admin.from('messages').select('conversation_id, content, created_at').in('conversation_id', convIds).order('created_at', { ascending: false })
    ;(msgs ?? []).forEach((m) => { if (!lastMessages[m.conversation_id]) lastMessages[m.conversation_id] = m.content })
  }

  return (
    <div className="min-h-full" style={{ backgroundColor: '#F8F5EE' }}>
      <div className="sticky top-0 z-10 px-6 lg:px-8 py-5" style={{ backgroundColor: 'rgba(248,245,238,0.92)', backdropFilter: 'blur(12px)', borderBottom: '1px solid #EAE4D8' }}>
        <p className="text-xs font-medium tracking-widest uppercase" style={{ color: '#9A8DAA' }}>Inbox</p>
        <h1 className="text-2xl lg:text-3xl font-light leading-tight mt-0.5" style={{ fontFamily: 'var(--font-cormorant), Cormorant Garamond, serif', color: '#1A1428' }}>Messages</h1>
      </div>
      <div className="px-6 lg:px-8 py-6">
        {(conversations ?? []).length === 0 ? (
          <div className="rounded-2xl p-16 flex flex-col items-center justify-center gap-3 text-center" style={{ backgroundColor: '#FFFFFF', border: '1px dashed #D4C9BB' }}>
            <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ backgroundColor: '#F2EDF8' }}>
              <MessageSquare className="w-5 h-5" style={{ color: '#B0A0C4' }} />
            </div>
            <p className="text-sm font-medium" style={{ color: '#5A4D6A' }}>No messages yet</p>
            <p className="text-xs" style={{ color: '#9A8DAA' }}>Client conversations will appear here</p>
          </div>
        ) : (
          <div className="rounded-2xl overflow-hidden" style={{ backgroundColor: '#FFFFFF', border: '1px solid #EAE4D8' }}>
            {(conversations ?? []).map((conv, i) => {
              const profile = profileMap[conv.client_id]
              const initials = profile?.full_name ? profile.full_name.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase() : '?'
              const lastMsg = lastMessages[conv.id]
              const hasUnread = (conv.unread_count ?? 0) > 0
              const msgDate = conv.last_message_at ? new Date(conv.last_message_at) : null
              const dateLabel = msgDate ? (isToday(msgDate) ? msgDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }) : msgDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })) : ''

              return (
                <Link key={conv.id} href={`/admin/messages/${conv.id}`} className="flex items-center gap-4 px-5 py-4 transition-all" style={{ borderTop: i > 0 ? '1px solid #F0EBE3' : 'none', backgroundColor: hasUnread ? '#FDFBF8' : 'transparent' }}>
                  <div className="relative shrink-0">
                    {profile?.avatar_url ? <img src={profile.avatar_url} alt={profile.full_name ?? ''} className="w-11 h-11 rounded-full object-cover" /> : <div className="w-11 h-11 rounded-full flex items-center justify-center text-sm font-semibold" style={{ backgroundColor: '#F2EDF8', color: '#422D64' }}>{initials}</div>}
                    {hasUnread && <div className="absolute -top-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white" style={{ backgroundColor: '#CF9D4E' }} />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-0.5">
                      <p className={`text-sm truncate ${hasUnread ? 'font-semibold' : 'font-medium'}`} style={{ color: '#1A1428' }}>{profile?.full_name ?? 'Unknown Client'}</p>
                      <span className="text-xs shrink-0 ml-3" style={{ color: '#9A8DAA' }}>{dateLabel}</span>
                    </div>
                    <p className="text-xs truncate" style={{ color: hasUnread ? '#5A4D6A' : '#9A8DAA', fontWeight: hasUnread ? 500 : 400 }}>{lastMsg ?? 'No messages yet'}</p>
                  </div>
                  {hasUnread && <div className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0" style={{ backgroundColor: '#CF9D4E', color: '#FFFFFF' }}>{conv.unread_count}</div>}
                </Link>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
