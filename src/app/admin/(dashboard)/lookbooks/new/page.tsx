import { redirect } from 'next/navigation'
import { LookbookForm } from '@/components/stylist/LookbookForm'
import { getStylistId } from '@/lib/stylist-auth'
import { clientName, getStylistClients } from '@/lib/stylist-clients'

export const metadata = { title: 'New lookbook' }

export default async function NewLookbookPage({ searchParams }: { searchParams: Promise<{ client?: string }> }) {
  const ownerId = await getStylistId()
  if (!ownerId) redirect('/admin/login')

  const [{ clients }, { client }] = await Promise.all([getStylistClients(ownerId), searchParams])
  return <LookbookForm clients={clients.map((c) => ({ id: c.id, name: clientName(c) }))} defaultClientId={client} />
}
