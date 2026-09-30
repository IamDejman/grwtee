import { notFound, redirect } from 'next/navigation'
import { createAdminClient } from '@/lib/supabase/admin'
import { LookbookForm } from '@/components/stylist/LookbookForm'
import { getStylistId } from '@/lib/stylist-auth'
import { clientName, getStylistClients } from '@/lib/stylist-clients'

export const metadata = { title: 'Edit lookbook' }

export default async function EditLookbookPage({ params }: { params: Promise<{ id: string }> }) {
  const ownerId = await getStylistId()
  if (!ownerId) redirect('/admin/login')

  const { id } = await params
  const [{ data: lookbook }, { clients }] = await Promise.all([
    createAdminClient()
      .from('lookbooks')
      .select('*, lookbook_items(*)')
      .eq('id', id)
      .eq('owner_id', ownerId)
      .order('sort_order', { referencedTable: 'lookbook_items' })
      .maybeSingle(),
    getStylistClients(ownerId)
  ])
  if (!lookbook) notFound()

  return <LookbookForm initialData={lookbook} clients={clients.map((c) => ({ id: c.id, name: clientName(c) }))} />
}
