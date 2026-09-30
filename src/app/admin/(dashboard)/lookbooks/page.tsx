import Link from 'next/link'
import { redirect } from 'next/navigation'
import { BookOpen, CalendarDays } from 'lucide-react'
import { getStylistId } from '@/lib/stylist-auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { Badge, EmptyState, PageHeader, type Tone } from '@/components/admin/ui'
import { ButtonLink } from '@/components/ui/Button'
import { stylistLabel } from '@/lib/stylist-labels'

export const metadata = { title: 'Lookbooks' }

type Lookbook = {
  id: string
  title: string
  type: string | null
  cover_image_url: string | null
  status: string | null
  event_date_start: string | null
  event_date_end: string | null
}

// Shown in this order; requests from clients come first because they need a reply.
const SECTIONS: { status: string; title: string; label: string; tone: Tone }[] = [
  { status: 'requested', title: 'Requests from clients', label: 'Requested', tone: 'gold' },
  { status: 'accepted', title: 'In progress', label: 'In progress', tone: 'purple' },
  { status: 'draft', title: 'Drafts', label: 'Draft', tone: 'neutral' },
  { status: 'completed', title: 'Completed', label: 'Completed', tone: 'green' }
]

function shortDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' })
}

export default async function LookbooksPage() {
  const ownerId = await getStylistId()
  if (!ownerId) redirect('/admin/login')

  const admin = createAdminClient()
  const { data, error } = await admin
    .from('lookbooks')
    .select('id, title, type, cover_image_url, status, event_date_start, event_date_end')
    .eq('owner_id', ownerId)
    .order('created_at', { ascending: false })
  const lookbooks: Lookbook[] = data ?? []

  return (
    <div>
      <PageHeader title="Lookbooks" actions={<ButtonLink href="/admin/lookbooks/new" size="sm">New lookbook</ButtonLink>} />

      {error ? (
        <p className="mb-4 rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700" role="alert">
          Couldn&apos;t load your lookbooks. Refresh to try again.
        </p>
      ) : null}

      {!lookbooks.length && !error ? (
        <div className="rounded-2xl border border-atelier-border bg-white">
          <EmptyState
            icon={BookOpen}
            title="No lookbooks yet."
            action={
              <ButtonLink href="/admin/lookbooks/new" size="sm" variant="outline">
                Create your first lookbook
              </ButtonLink>
            }
          />
        </div>
      ) : (
        <div className="space-y-8">
          {SECTIONS.map((section) => {
            const items = lookbooks.filter((lb) => (lb.status ?? 'draft') === section.status)
            if (!items.length) return null
            return (
              <section key={section.status}>
                <h2 className="mb-3 flex items-center gap-2 font-cormorant text-2xl font-medium text-atelier-ink">
                  {section.title}
                  <span className="text-sm font-normal tabular-nums text-atelier-faint">{items.length}</span>
                </h2>
                <ul className="grid gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3">
                  {items.map((lb) => (
                    <li key={lb.id}>
                      <Link
                        href={`/admin/lookbooks/${lb.id}`}
                        className="group block overflow-hidden rounded-2xl border border-atelier-border bg-white transition hover:border-purple-dark/30"
                      >
                        <div className="relative aspect-video bg-atelier-canvas">
                          {lb.cover_image_url ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img loading="lazy" src={lb.cover_image_url} alt="" className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.03]" />
                          ) : (
                            <span className="flex h-full items-center justify-center text-atelier-faint">
                              <BookOpen className="h-8 w-8" aria-hidden />
                            </span>
                          )}
                          <span className="absolute left-2 top-2">
                            <Badge tone={section.tone}>{section.label}</Badge>
                          </span>
                        </div>
                        <div className="p-4">
                          <p className="truncate text-sm font-medium text-atelier-ink">{lb.title}</p>
                          <p className="text-xs text-atelier-faint">{stylistLabel(lb.type)}</p>
                          {lb.event_date_start ? (
                            <p className="mt-2 flex items-center gap-1.5 text-xs text-atelier-muted">
                              <CalendarDays className="h-3.5 w-3.5" aria-hidden />
                              {shortDate(lb.event_date_start)}
                              {lb.event_date_end && lb.event_date_end !== lb.event_date_start ? ` - ${shortDate(lb.event_date_end)}` : ''}
                            </p>
                          ) : null}
                        </div>
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            )
          })}
        </div>
      )}
    </div>
  )
}
