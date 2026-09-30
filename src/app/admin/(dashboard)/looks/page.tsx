import { redirect } from 'next/navigation'
import { getStylistId } from '@/lib/stylist-auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { LooksGrid } from '@/components/stylist/LooksGrid'
import { PageHeader } from '@/components/admin/ui'
import { ButtonLink } from '@/components/ui/Button'

export const metadata = { title: 'Looks' }

export default async function LooksPage() {
  const ownerId = await getStylistId()
  if (!ownerId) redirect('/admin/login')

  const admin = createAdminClient()
  const { data: looks, error } = await admin
    .from('looks')
    .select('id, title, occasion, season, is_published, is_premium, primary_image_url, likes_count, saves_count, views_count, created_at')
    .eq('stylist_id', ownerId)
    .order('created_at', { ascending: false })

  return (
    <div>
      <PageHeader title="Looks" actions={<ButtonLink href="/admin/looks/new" size="sm">New look</ButtonLink>} />
      {error ? (
        <p className="mb-4 rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700" role="alert">
          Couldn&apos;t load your looks. Refresh to try again.
        </p>
      ) : null}
      <LooksGrid looks={looks ?? []} />
    </div>
  )
}
