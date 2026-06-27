import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getStylistId } from '@/lib/stylist-auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { LooksGrid } from '@/components/stylist/LooksGrid'
import { Plus } from 'lucide-react'

export const metadata = { title: 'Looks' }

export default async function LooksPage() {
  const ownerId = await getStylistId()
  if (!ownerId) redirect('/admin/login')

  const admin = createAdminClient()
  const { data: looks } = await admin
    .from('looks')
    .select('id, title, description, occasion, season, is_published, is_premium, primary_image_url, likes_count, saves_count, views_count, created_at, look_images(image_url, is_primary)')
    .eq('stylist_id', ownerId)
    .order('created_at', { ascending: false })

  return (
    <div className="min-h-full" style={{ backgroundColor: '#F8F5EE' }}>
      <div
        className="sticky top-0 z-10 px-6 lg:px-8 py-5 flex items-center justify-between"
        style={{
          backgroundColor: 'rgba(248,245,238,0.92)',
          backdropFilter: 'blur(12px)',
          borderBottom: '1px solid #EAE4D8'
        }}
      >
        <div>
          <p className="text-xs font-medium tracking-widest uppercase" style={{ color: '#9A8DAA' }}>Content</p>
          <h1 className="text-2xl lg:text-3xl font-light leading-tight mt-0.5" style={{ fontFamily: 'var(--font-cormorant), Cormorant Garamond, serif', color: '#1A1428' }}>
            Looks
          </h1>
        </div>
        <Link href="/admin/looks/new" className="flex items-center gap-2 px-4 h-10 rounded-xl text-sm font-medium" style={{ backgroundColor: '#422D64', color: '#FFFFFF' }}>
          <Plus className="w-4 h-4" />
          New Look
        </Link>
      </div>
      <div className="px-6 lg:px-8 py-6">
        <LooksGrid looks={looks ?? []} />
      </div>
    </div>
  )
}
