import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getStylistId } from '@/lib/stylist-auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { Users, MessageSquare, User } from 'lucide-react'

export const metadata = { title: 'Clients' }

export default async function ClientsPage() {
  const ownerId = await getStylistId()
  if (!ownerId) redirect('/admin/login')

  const admin = createAdminClient()
  const { data: conversations } = await admin
    .from('conversations')
    .select('client_id, last_message_at')
    .eq('stylist_id', ownerId)

  const clientIds = [...new Set((conversations ?? []).map((c) => c.client_id))]
  let clients: { id: string; full_name: string | null; email: string | null; avatar_url: string | null; body_shape: string | null; style_tags: string[] | null; subscription_tier: string | null; gender_preference: string | null; location: string | null }[] = []

  if (clientIds.length > 0) {
    const { data } = await admin
      .from('profiles')
      .select('id, full_name, email, avatar_url, body_shape, style_tags, subscription_tier, gender_preference, location')
      .in('id', clientIds)
    clients = data ?? []
  }

  return (
    <div className="min-h-full" style={{ backgroundColor: '#F8F5EE' }}>
      <div className="sticky top-0 z-10 px-6 lg:px-8 py-5" style={{ backgroundColor: 'rgba(248,245,238,0.92)', backdropFilter: 'blur(12px)', borderBottom: '1px solid #EAE4D8' }}>
        <p className="text-xs font-medium tracking-widest uppercase" style={{ color: '#9A8DAA' }}>People</p>
        <h1 className="text-2xl lg:text-3xl font-light leading-tight mt-0.5" style={{ fontFamily: 'var(--font-cormorant), Cormorant Garamond, serif', color: '#1A1428' }}>Clients</h1>
      </div>
      <div className="px-6 lg:px-8 py-6">
        {clients.length === 0 ? (
          <div className="rounded-2xl p-16 flex flex-col items-center justify-center gap-3 text-center" style={{ backgroundColor: '#FFFFFF', border: '1px dashed #D4C9BB' }}>
            <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ backgroundColor: '#F2EDF8' }}>
              <Users className="w-5 h-5" style={{ color: '#B0A0C4' }} />
            </div>
            <p className="text-sm font-medium" style={{ color: '#5A4D6A' }}>No clients yet</p>
            <p className="text-xs" style={{ color: '#9A8DAA' }}>Clients who message you will appear here</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {clients.map((client) => {
              const initials = client.full_name ? client.full_name.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase() : '?'
              return (
                <Link key={client.id} href={`/admin/clients/${client.id}`} className="group rounded-2xl p-5 transition-all" style={{ backgroundColor: '#FFFFFF', border: '1px solid #EAE4D8', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
                  <div className="flex items-start gap-4">
                    <div className="shrink-0">
                      {client.avatar_url ? (
                        <img src={client.avatar_url} alt={client.full_name ?? ''} className="w-12 h-12 rounded-full object-cover" />
                      ) : (
                        <div className="w-12 h-12 rounded-full flex items-center justify-center text-sm font-semibold" style={{ backgroundColor: '#F2EDF8', color: '#422D64' }}>{initials}</div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate" style={{ color: '#1A1428' }}>{client.full_name ?? 'Unknown Client'}</p>
                      {client.email && <p className="text-xs truncate mt-0.5" style={{ color: '#9A8DAA' }}>{client.email}</p>}
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {client.subscription_tier && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full font-medium capitalize" style={{ backgroundColor: client.subscription_tier === 'premium' ? '#FEF9E7' : '#F2EDF8', color: client.subscription_tier === 'premium' ? '#CF9D4E' : '#9A8DAA' }}>{client.subscription_tier}</span>
                        )}
                        {client.body_shape && <span className="text-[10px] px-2 py-0.5 rounded-full capitalize" style={{ backgroundColor: '#F8F5EE', color: '#9A8DAA' }}>{client.body_shape}</span>}
                        {client.location && <span className="text-[10px] px-2 py-0.5 rounded-full" style={{ backgroundColor: '#F8F5EE', color: '#9A8DAA' }}>{client.location}</span>}
                      </div>
                      {client.style_tags && client.style_tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {client.style_tags.slice(0, 3).map((tag) => (
                            <span key={tag} className="text-[10px] px-1.5 py-0.5 rounded-md" style={{ backgroundColor: '#F2EDF8', color: '#5A4D6A' }}>{tag}</span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2 mt-4 pt-4" style={{ borderTop: '1px solid #F0EBE3' }}>
                    <span className="flex-1 flex items-center justify-center gap-1.5 h-8 rounded-xl text-xs font-medium" style={{ backgroundColor: '#F2EDF8', color: '#422D64' }}>
                      <User className="w-3 h-3" /> Profile
                    </span>
                    <Link href="/admin/messages" onClick={(e) => e.stopPropagation()} className="flex-1 flex items-center justify-center gap-1.5 h-8 rounded-xl text-xs font-medium" style={{ backgroundColor: '#F8F5EE', color: '#9A8DAA' }}>
                      <MessageSquare className="w-3 h-3" /> Message
                    </Link>
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
