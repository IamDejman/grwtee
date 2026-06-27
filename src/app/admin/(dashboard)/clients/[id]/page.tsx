import { createAdminClient } from '@/lib/supabase/admin'
import { redirect, notFound } from 'next/navigation'
import { getStylistId } from '@/lib/stylist-auth'
import Link from 'next/link'
import { ArrowLeft, MessageSquare, Shirt, Sparkles } from 'lucide-react'

export const metadata = { title: 'Client Profile' }

export default async function ClientDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const ownerId = await getStylistId()
  if (!ownerId) redirect('/admin/login')

  const { id } = await params
  const admin = createAdminClient()

  const [profileRes, wardrobeRes, lookbooksRes] = await Promise.all([
    admin.from('profiles').select('*').eq('id', id).single(),
    admin.from('wardrobe_items').select('id, name, category, image_url, brand, color, is_favorite').eq('user_id', id).limit(12),
    admin.from('lookbooks').select('id, title, type, status, cover_image_url').eq('assigned_to', id).order('created_at', { ascending: false })
  ])

  const profile = profileRes.data
  if (!profile) notFound()

  const initials = profile.full_name ? profile.full_name.split(' ').map((n: string) => n[0]).slice(0, 2).join('').toUpperCase() : '?'
  const wardrobe = wardrobeRes.data ?? []
  const lookbooks = lookbooksRes.data ?? []

  const rows = [
    { label: 'Body Shape', value: profile.body_shape },
    { label: 'Gender Preference', value: profile.gender_preference },
    { label: 'Location', value: profile.location },
    { label: 'Dress Size', value: profile.dress_size ? `${profile.dress_size} (${profile.dress_size_region ?? 'US'})` : null },
    { label: 'Shoe Size', value: profile.shoe_size ? `${profile.shoe_size} (${profile.shoe_size_region ?? 'US'})` : null },
    { label: 'Subscription', value: profile.subscription_tier },
    { label: 'Timezone', value: profile.timezone }
  ]

  return (
    <div className="min-h-full" style={{ backgroundColor: '#F8F5EE' }}>
      <div className="sticky top-0 z-10 px-6 lg:px-8 py-4 flex items-center justify-between" style={{ backgroundColor: 'rgba(248,245,238,0.92)', backdropFilter: 'blur(12px)', borderBottom: '1px solid #EAE4D8' }}>
        <div className="flex items-center gap-3">
          <Link href="/admin/clients" className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ backgroundColor: '#F2EDF8', color: '#422D64' }}>
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <h1 className="text-xl font-light" style={{ fontFamily: 'var(--font-cormorant), Cormorant Garamond, serif', color: '#1A1428' }}>Client Profile</h1>
        </div>
        <Link href="/admin/messages" className="flex items-center gap-2 px-4 h-9 rounded-xl text-sm font-medium" style={{ backgroundColor: '#422D64', color: '#FFFFFF' }}>
          <MessageSquare className="w-4 h-4" /> Message
        </Link>
      </div>

      <div className="px-6 lg:px-8 py-6 space-y-6 max-w-4xl">
        <div className="rounded-2xl p-6" style={{ backgroundColor: '#FFFFFF', border: '1px solid #EAE4D8' }}>
          <div className="flex items-start gap-5">
            {profile.avatar_url ? (
              <img src={profile.avatar_url} alt={profile.full_name} className="w-16 h-16 rounded-2xl object-cover shrink-0" />
            ) : (
              <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-lg font-semibold shrink-0" style={{ backgroundColor: '#F2EDF8', color: '#422D64' }}>{initials}</div>
            )}
            <div className="flex-1">
              <h2 className="text-2xl font-light" style={{ fontFamily: 'var(--font-cormorant), Cormorant Garamond, serif', color: '#1A1428' }}>{profile.full_name ?? 'Unknown Client'}</h2>
              {profile.email && <p className="text-sm mt-0.5" style={{ color: '#9A8DAA' }}>{profile.email}</p>}
              {profile.bio && <p className="text-sm mt-3" style={{ color: '#5A4D6A' }}>{profile.bio}</p>}
              {profile.style_tags && profile.style_tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-3">
                  {profile.style_tags.map((tag: string) => (
                    <span key={tag} className="text-xs px-2.5 py-1 rounded-full font-medium" style={{ backgroundColor: '#F2EDF8', color: '#422D64' }}>{tag}</span>
                  ))}
                </div>
              )}
            </div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-6 pt-6" style={{ borderTop: '1px solid #F0EBE3' }}>
            {rows.filter((r) => r.value).map(({ label, value }) => (
              <div key={label}>
                <p className="text-xs font-medium tracking-wider uppercase mb-1" style={{ color: '#9A8DAA' }}>{label}</p>
                <p className="text-sm capitalize" style={{ color: '#1A1428' }}>{String(value).replace(/_/g, ' ')}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="rounded-2xl p-6" style={{ backgroundColor: '#FFFFFF', border: '1px solid #EAE4D8' }}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-light" style={{ fontFamily: 'var(--font-cormorant), Cormorant Garamond, serif', color: '#1A1428' }}>Wardrobe</h3>
              <span className="text-xs" style={{ color: '#9A8DAA' }}>{wardrobe.length} items</span>
            </div>
            {wardrobe.length === 0 ? (
              <div className="rounded-xl p-8 text-center" style={{ backgroundColor: '#F8F5EE' }}>
                <Shirt className="w-6 h-6 mx-auto mb-2" style={{ color: '#D4C9BB' }} />
                <p className="text-xs" style={{ color: '#9A8DAA' }}>No wardrobe items yet</p>
              </div>
            ) : (
              <div className="grid grid-cols-4 gap-2">
                {wardrobe.map((item) => (
                  <div key={item.id} className="aspect-square rounded-xl overflow-hidden" style={{ backgroundColor: '#F2EDF8' }}>
                    {item.image_url ? <img src={item.image_url} alt={item.name} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center"><Shirt className="w-4 h-4" style={{ color: '#D4C9BB' }} /></div>}
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="rounded-2xl p-6" style={{ backgroundColor: '#FFFFFF', border: '1px solid #EAE4D8' }}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-light" style={{ fontFamily: 'var(--font-cormorant), Cormorant Garamond, serif', color: '#1A1428' }}>Lookbooks</h3>
              <Link href="/admin/lookbooks/new" className="text-xs font-medium" style={{ color: '#CF9D4E' }}>+ New</Link>
            </div>
            {lookbooks.length === 0 ? (
              <div className="rounded-xl p-8 text-center" style={{ backgroundColor: '#F8F5EE' }}>
                <Sparkles className="w-6 h-6 mx-auto mb-2" style={{ color: '#D4C9BB' }} />
                <p className="text-xs" style={{ color: '#9A8DAA' }}>No lookbooks assigned</p>
              </div>
            ) : (
              <div className="space-y-2">
                {lookbooks.map((lb) => (
                  <Link key={lb.id} href={`/admin/lookbooks/${lb.id}`} className="flex items-center gap-3 p-3 rounded-xl" style={{ backgroundColor: '#F8F5EE' }}>
                    {lb.cover_image_url ? <img src={lb.cover_image_url} alt={lb.title} className="w-10 h-10 rounded-lg object-cover shrink-0" /> : <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: '#F2EDF8' }}><Sparkles className="w-4 h-4" style={{ color: '#B0A0C4' }} /></div>}
                    <div>
                      <p className="text-sm font-medium" style={{ color: '#1A1428' }}>{lb.title}</p>
                      <p className="text-xs capitalize" style={{ color: '#9A8DAA' }}>{lb.status} · {lb.type?.replace(/_/g, ' ')}</p>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
