import { notFound, redirect } from 'next/navigation'
import { createAdminClient } from '@/lib/supabase/admin'
import { LookForm } from '@/components/stylist/LookForm'
import { getStylistId } from '@/lib/stylist-auth'

export const metadata = { title: 'Edit look' }

export default async function EditLookPage({ params }: { params: Promise<{ id: string }> }) {
  const ownerId = await getStylistId()
  if (!ownerId) redirect('/admin/login')

  const { id } = await params
  const { data: look } = await createAdminClient()
    .from('looks')
    .select('*, look_items(*)')
    .eq('id', id)
    .eq('stylist_id', ownerId)
    .order('sort_order', { referencedTable: 'look_items' })
    .maybeSingle()
  if (!look) notFound()

  return <LookForm initialData={look} />
}
