import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { ArrowLeft, BookOpen, PersonStanding, Shirt } from 'lucide-react'
import { createAdminClient } from '@/lib/supabase/admin'
import { getStylistId } from '@/lib/stylist-auth'
import { clientName } from '@/lib/stylist-clients'
import { getClientTwin } from '@/lib/stylist-twins'
import { lookbookStatusLabel, stylistLabel } from '@/lib/stylist-labels'
import { Badge, EmptyState, Field, Panel } from '@/components/admin/ui'
import { ButtonLink } from '@/components/ui/Button'
import { ClientAvatar } from '@/components/stylist/ClientAvatar'

export const metadata = { title: 'Client' }

function size(value: string | null, region: string | null) {
  return value ? `${value} (${region ?? 'US'})` : '-'
}

export default async function ClientDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const ownerId = await getStylistId()
  if (!ownerId) redirect('/admin/login')

  const { id } = await params
  const admin = createAdminClient()

  const [profileRes, wardrobeRes, lookbooksRes, conversationRes, twin] = await Promise.all([
    admin.from('profiles').select('*').eq('id', id).maybeSingle(),
    admin.from('wardrobe_items').select('id, name, image_url').eq('user_id', id).order('created_at', { ascending: false }).limit(12),
    admin.from('lookbooks').select('id, title, type, status, cover_image_url').eq('assigned_to', id).order('created_at', { ascending: false }),
    admin.from('conversations').select('id').eq('stylist_id', ownerId).eq('client_id', id).maybeSingle(),
    getClientTwin(admin, id)
  ])

  const profile = profileRes.data
  if (!profile) notFound()

  const name = clientName(profile)
  const wardrobe = wardrobeRes.data ?? []
  const lookbooks = lookbooksRes.data ?? []

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <Link
            href="/admin/clients"
            aria-label="Back to clients"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white text-purple-dark ring-1 ring-inset ring-atelier-border transition hover:bg-atelier-lavender"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden />
          </Link>
          <h1 className="truncate font-cormorant text-3xl font-medium leading-tight text-atelier-ink sm:text-4xl">{name}</h1>
        </div>
        {conversationRes.data ? (
          <ButtonLink href={`/admin/messages/${conversationRes.data.id}`} size="sm">
            Message
          </ButtonLink>
        ) : null}
      </div>

      <div className="space-y-5">
        <Panel>
          <div className="flex items-start gap-4">
            <ClientAvatar name={name} src={profile.avatar_url} size="lg" />
            <div className="min-w-0 flex-1">
              <p className="flex flex-wrap items-center gap-2">
                {profile.email ? <span className="truncate text-sm text-atelier-muted">{profile.email}</span> : null}
                {profile.subscription_tier === 'premium' ? <Badge tone="gold">Premium</Badge> : null}
              </p>
              {profile.bio ? <p className="mt-2 text-sm text-atelier-ink">{profile.bio}</p> : null}
              {profile.style_tags?.length ? (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {(profile.style_tags as string[]).map((tag) => (
                    <Badge key={tag} tone="purple">{tag}</Badge>
                  ))}
                </div>
              ) : null}
            </div>
          </div>
          <dl className="mt-5 grid grid-cols-2 gap-4 border-t border-atelier-border pt-5 md:grid-cols-3">
            <Field label="Body shape">{stylistLabel(profile.body_shape)}</Field>
            <Field label="Shops for">{stylistLabel(profile.gender_preference)}</Field>
            <Field label="Location">{profile.location || '-'}</Field>
            <Field label="Dress size">{size(profile.dress_size, profile.dress_size_region)}</Field>
            <Field label="Shoe size">{size(profile.shoe_size, profile.shoe_size_region)}</Field>
            <Field label="Plan">{stylistLabel(profile.subscription_tier)}</Field>
          </dl>
        </Panel>

        <Panel title="Twin">
          {!twin ? (
            <EmptyState
              icon={PersonStanding}
              title="No twin yet. They can create one in the app under Profile, Your twin."
            />
          ) : (
            <div className="flex flex-col gap-5 sm:flex-row">
              <div className="w-full shrink-0 sm:w-40">
                <div className="aspect-[2/3] overflow-hidden rounded-xl bg-atelier-canvas">
                  {twin.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={twin.imageUrl} alt={`${name}'s twin`} className="h-full w-full object-cover" />
                  ) : (
                    <span className="flex h-full items-center justify-center text-atelier-faint">
                      <PersonStanding className="h-6 w-6" aria-hidden />
                    </span>
                  )}
                </div>
                <p className="mt-2 flex flex-wrap items-center gap-1.5 text-xs text-atelier-muted">
                  <Badge tone={twin.status === 'ready' ? 'green' : twin.status === 'failed' ? 'red' : 'gold'}>
                    {twin.status === 'ready' ? 'Ready' : twin.status === 'failed' ? 'Failed' : 'Building'}
                  </Badge>
                  {twin.source === 'photo' ? 'Own photo' : 'From selfie'}
                </p>
              </div>
              <div className="min-w-0 flex-1">
                <p className="mb-3 text-sm text-atelier-muted">Looks they have seen on their twin</p>
                {!twin.renders.length ? (
                  <p className="text-sm text-atelier-faint">None yet.</p>
                ) : (
                  <ul className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                    {twin.renders.map((render) => (
                      <li key={render.id} title={render.lookTitle ?? undefined}>
                        <div className="aspect-[2/3] overflow-hidden rounded-xl bg-atelier-canvas">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img loading="lazy" src={render.url} alt={render.lookTitle ?? 'Look on twin'} className="h-full w-full object-cover" />
                        </div>
                        {render.lookTitle ? (
                          <p className="mt-1 truncate text-xs text-atelier-muted">{render.lookTitle}</p>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          )}
        </Panel>

        <div className="grid gap-5 lg:grid-cols-2">
          <Panel title="Wardrobe">
            {!wardrobe.length ? (
              <EmptyState icon={Shirt} title="Nothing in their wardrobe yet." />
            ) : (
              <ul className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                {wardrobe.map((item) => (
                  <li key={item.id} className="aspect-square overflow-hidden rounded-xl bg-atelier-canvas" title={item.name ?? undefined}>
                    {item.image_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img loading="lazy" src={item.image_url} alt={item.name ?? ''} className="h-full w-full object-cover" />
                    ) : (
                      <span className="flex h-full items-center justify-center text-atelier-faint">
                        <Shirt className="h-4 w-4" aria-hidden />
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </Panel>

          <Panel
            title="Lookbooks"
            actions={
              <ButtonLink href={`/admin/lookbooks/new?client=${profile.id}`} size="sm" variant="outline">
                New lookbook
              </ButtonLink>
            }
          >
            {!lookbooks.length ? (
              <EmptyState icon={BookOpen} title="No lookbooks for this client yet." />
            ) : (
              <ul className="-mx-2 space-y-1">
                {lookbooks.map((lb) => (
                  <li key={lb.id}>
                    <Link href={`/admin/lookbooks/${lb.id}`} className="flex items-center gap-3 rounded-xl p-2 transition hover:bg-atelier-canvas">
                      {lb.cover_image_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img loading="lazy" src={lb.cover_image_url} alt="" className="h-10 w-10 shrink-0 rounded-lg object-cover" />
                      ) : (
                        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-atelier-lavender text-purple-dark">
                          <BookOpen className="h-4 w-4" aria-hidden />
                        </span>
                      )}
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-medium text-atelier-ink">{lb.title}</span>
                        <span className="block text-xs text-atelier-faint">
                          {lookbookStatusLabel(lb.status)} · {stylistLabel(lb.type)}
                        </span>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </div>
      </div>
    </div>
  )
}
