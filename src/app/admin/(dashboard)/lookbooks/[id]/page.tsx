import { createAdminClient } from '@/lib/supabase/admin'
import { notFound } from 'next/navigation'
import { LookbookForm } from '@/components/stylist/LookbookForm'

export const metadata = { title: 'Edit Lookbook' }

export default async function EditLookbookPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const admin = createAdminClient()

  const { data: lookbook } = await admin
    .from('lookbooks')
    .select('*, lookbook_items(*)')
    .eq('id', id)
    .single()

  if (!lookbook) notFound()

  return <LookbookForm initialData={lookbook} />
}
