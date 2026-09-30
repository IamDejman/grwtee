import Link from 'next/link'
import { redirect } from 'next/navigation'
import { Users } from 'lucide-react'
import { getStylistId } from '@/lib/stylist-auth'
import { clientName, getStylistClients } from '@/lib/stylist-clients'
import { stylistLabel } from '@/lib/stylist-labels'
import { Badge, EmptyState, PageHeader } from '@/components/admin/ui'
import { ClientAvatar } from '@/components/stylist/ClientAvatar'

export const metadata = { title: 'Clients' }

export default async function ClientsPage() {
  const ownerId = await getStylistId()
  if (!ownerId) redirect('/admin/login')

  const { clients, error } = await getStylistClients(ownerId)

  return (
    <div>
      <PageHeader title="Clients" />

      {error ? (
        <p className="mb-4 rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700" role="alert">
          Couldn&apos;t load your clients. Refresh to try again.
        </p>
      ) : !clients.length ? (
        <div className="rounded-2xl border border-atelier-border bg-white">
          <EmptyState icon={Users} title="No clients yet. People who message you in the app will show up here." />
        </div>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3">
          {clients.map((client) => {
            const details = [client.body_shape, client.location].filter(Boolean) as string[]
            return (
              <li key={client.id} className="flex flex-col rounded-2xl border border-atelier-border bg-white p-4">
                <div className="flex items-start gap-3">
                  <ClientAvatar name={clientName(client)} src={client.avatar_url} />
                  <div className="min-w-0 flex-1">
                    <p className="flex items-center gap-2 text-sm font-medium text-atelier-ink">
                      <span className="truncate">{clientName(client)}</span>
                      {client.subscription_tier === 'premium' ? <Badge tone="gold">Premium</Badge> : null}
                    </p>
                    {client.email && client.full_name ? <p className="truncate text-xs text-atelier-faint">{client.email}</p> : null}
                    {details.length ? (
                      <p className="mt-1 truncate text-xs text-atelier-muted">
                        {details.map((d, i) => (i === 0 && client.body_shape ? stylistLabel(d) : d)).join(' · ')}
                      </p>
                    ) : null}
                  </div>
                </div>
                {client.style_tags?.length ? (
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {client.style_tags.slice(0, 3).map((tag) => (
                      <Badge key={tag} tone="purple">{tag}</Badge>
                    ))}
                  </div>
                ) : null}
                <div className="-mx-1 mt-auto flex gap-1 pt-3">
                  <Link href={`/admin/clients/${client.id}`} className="rounded-lg px-2.5 py-1.5 text-sm font-medium text-purple-dark transition hover:bg-atelier-lavender">
                    View profile
                  </Link>
                  <Link href={`/admin/messages/${client.conversation_id}`} className="rounded-lg px-2.5 py-1.5 text-sm font-medium text-purple-dark transition hover:bg-atelier-lavender">
                    Message
                  </Link>
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
