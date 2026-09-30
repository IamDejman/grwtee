'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import { Eye, Heart, Sparkles } from 'lucide-react'
import { useConfirm } from '@/components/ui/ConfirmDialog'
import { useToast } from '@/components/admin/Toast'
import { Badge, EmptyState, FilterChips, RowAction, SearchInput, Switch } from '@/components/admin/ui'
import { ButtonLink } from '@/components/ui/Button'
import { LOOK_OCCASIONS, stylistLabel } from '@/lib/stylist-labels'

interface Look {
  id: string
  title: string
  primary_image_url: string | null
  occasion: string | null
  season: string | null
  is_published: boolean
  is_premium: boolean
  likes_count: number
  saves_count: number
  views_count: number
  created_at: string
}

type Status = 'all' | 'published' | 'draft'

export function LooksGrid({ looks }: { looks: Look[] }) {
  const [items, setItems] = useState(looks)
  const [status, setStatus] = useState<Status>('all')
  const [occasion, setOccasion] = useState('all')
  const [query, setQuery] = useState('')
  const [busyId, setBusyId] = useState<string | null>(null)
  const { confirm, dialog } = useConfirm()
  const toast = useToast()

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return items.filter((l) => {
      if (status === 'published' && !l.is_published) return false
      if (status === 'draft' && l.is_published) return false
      if (occasion !== 'all' && l.occasion !== occasion) return false
      return !q || l.title.toLowerCase().includes(q)
    })
  }, [items, status, occasion, query])

  // Only offer occasions that have looks, so the chip row stays short.
  const usedOccasions = LOOK_OCCASIONS.filter((o) => items.some((l) => l.occasion === o))

  async function togglePublish(look: Look) {
    const next = !look.is_published
    setBusyId(look.id)
    try {
      const res = await fetch(`/api/stylist/looks/${look.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_published: next })
      })
      if (!res.ok) throw new Error()
      setItems((prev) => prev.map((l) => (l.id === look.id ? { ...l, is_published: next } : l)))
      toast.success(next ? 'Look published.' : 'Look moved to drafts.')
    } catch {
      toast.error(`Couldn't ${next ? 'publish' : 'unpublish'} "${look.title}". Try again.`)
    } finally {
      setBusyId(null)
    }
  }

  async function deleteLook(look: Look) {
    const ok = await confirm({
      title: `Delete "${look.title}"?`,
      body: "Clients will no longer see it. This can't be undone.",
      confirmLabel: 'Delete',
      danger: true
    })
    if (!ok) return
    setBusyId(look.id)
    try {
      const res = await fetch(`/api/stylist/looks/${look.id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error()
      setItems((prev) => prev.filter((l) => l.id !== look.id))
      toast.success('Look deleted.')
    } catch {
      toast.error(`Couldn't delete "${look.title}". Try again.`)
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div>
      {dialog}
      <div className="mb-5 flex flex-col gap-3">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <FilterChips<Status>
            label="Filter by status"
            value={status}
            onChange={setStatus}
            options={[
              { value: 'all', label: 'All', count: items.length },
              { value: 'published', label: 'Published', count: items.filter((l) => l.is_published).length },
              { value: 'draft', label: 'Drafts', count: items.filter((l) => !l.is_published).length }
            ]}
          />
          <div className="lg:w-72">
            <SearchInput label="Search looks" placeholder="Search titles…" value={query} onChange={setQuery} />
          </div>
        </div>
        {usedOccasions.length > 1 ? (
          <FilterChips
            label="Filter by occasion"
            value={occasion}
            onChange={setOccasion}
            options={[
              { value: 'all', label: 'Any occasion' },
              ...usedOccasions.map((o) => ({ value: o, label: stylistLabel(o) }))
            ]}
          />
        ) : null}
      </div>

      {!filtered.length ? (
        <div className="rounded-2xl border border-atelier-border bg-white">
          <EmptyState
            icon={Sparkles}
            title={items.length ? 'No looks match.' : 'No looks yet.'}
            action={
              items.length ? null : (
                <ButtonLink href="/admin/looks/new" size="sm" variant="outline">
                  Create your first look
                </ButtonLink>
              )
            }
          />
        </div>
      ) : (
        <ul className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 xl:grid-cols-4">
          {filtered.map((look) => (
            <li key={look.id} className="overflow-hidden rounded-2xl border border-atelier-border bg-white">
              <Link
                href={`/admin/looks/${look.id}`}
                className="group relative block aspect-[3/4] bg-atelier-canvas"
                aria-label={`Edit ${look.title}`}
              >
                {look.primary_image_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img loading="lazy"
                    src={look.primary_image_url}
                    alt=""
                    className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.03]"
                  />
                ) : (
                  <span className="flex h-full items-center justify-center text-atelier-faint">
                    <Sparkles className="h-8 w-8" aria-hidden />
                  </span>
                )}
                <span className="absolute left-2 top-2 flex gap-1.5">
                  {look.is_published ? null : <Badge>Draft</Badge>}
                  {look.is_premium ? <Badge tone="gold">Premium</Badge> : null}
                </span>
              </Link>
              <div className="p-3">
                <p className="truncate text-sm font-medium text-atelier-ink">{look.title}</p>
                <p className="truncate text-xs text-atelier-faint">
                  {[look.occasion, look.season].filter(Boolean).map(stylistLabel).join(' · ') || '-'}
                </p>
                <div className="mt-3 flex items-center justify-between gap-2 border-t border-atelier-border pt-3">
                  <span className="flex items-center gap-2.5 text-xs tabular-nums text-atelier-faint">
                    <span className="flex items-center gap-1" title="Likes">
                      <Heart className="h-3 w-3" aria-hidden /> {look.likes_count}
                      <span className="sr-only">likes</span>
                    </span>
                    <span className="flex items-center gap-1" title="Views">
                      <Eye className="h-3 w-3" aria-hidden /> {look.views_count}
                      <span className="sr-only">views</span>
                    </span>
                  </span>
                  <Switch
                    checked={look.is_published}
                    disabled={busyId === look.id}
                    onChange={() => void togglePublish(look)}
                    label={`Published: ${look.title}`}
                  />
                </div>
                <div className="-mx-1 mt-2 flex justify-between">
                  <Link href={`/admin/looks/${look.id}`} className="rounded-lg px-2.5 py-1.5 text-sm font-medium text-purple-dark transition hover:bg-atelier-lavender">
                    Edit
                  </Link>
                  <RowAction danger disabled={busyId === look.id} onClick={() => void deleteLook(look)}>
                    Delete
                  </RowAction>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
