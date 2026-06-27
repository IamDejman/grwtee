import { createAdminClient } from '@/lib/supabase/admin'
import { notFound } from 'next/navigation'
import { LookForm } from '@/components/stylist/LookForm'

export const metadata = { title: 'Edit Look' }

export default async function EditLookPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const admin = createAdminClient()

  const { data: look } = await admin
    .from('looks')
    .select('*, look_items(*), look_images(*)')
    .eq('id', id)
    .single()

  if (!look) notFound()

  return <LookForm initialData={look} />
}
