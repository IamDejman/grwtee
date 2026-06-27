'use client'

import Link from 'next/link'
import { useState } from 'react'
import { Sparkles, Eye, Heart, Bookmark, Edit2, ToggleLeft, ToggleRight, Trash2 } from 'lucide-react'

const OCCASIONS = [
  { value: '', label: 'All' },
  { value: 'casual', label: 'Casual' },
  { value: 'corporate', label: 'Corporate' },
  { value: 'date_night', label: 'Date Night' },
  { value: 'formal', label: 'Formal' },
  { value: 'streetwear', label: 'Streetwear' },
  { value: 'athleisure', label: 'Athleisure' },
  { value: 'brunch', label: 'Brunch' },
  { value: 'vacation', label: 'Vacation' },
  { value: 'wedding_guest', label: 'Wedding Guest' }
]

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

interface LooksGridProps {
  looks: Look[]
}

export function LooksGrid({ looks }: LooksGridProps) {
  const [filter, setFilter] = useState('')
  const [publishedFilter, setPublishedFilter] = useState<'all' | 'published' | 'draft'>('all')
  const [toggling, setToggling] = useState<string | null>(null)
  const [localLooks, setLocalLooks] = useState(looks)

  const filtered = localLooks.filter((l) => {
    if (filter && l.occasion !== filter) return false
    if (publishedFilter === 'published' && !l.is_published) return false
    if (publishedFilter === 'draft' && l.is_published) return false
    return true
  })

  async function togglePublish(look: Look) {
    setToggling(look.id)
    try {
      const res = await fetch(`/api/stylist/looks/${look.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_published: !look.is_published })
      })
      if (res.ok) {
        setLocalLooks((prev) =>
          prev.map((l) => (l.id === look.id ? { ...l, is_published: !l.is_published } : l))
        )
      }
    } finally {
      setToggling(null)
    }
  }

  async function deleteLook(id: string) {
    if (!confirm('Delete this look? This cannot be undone.')) return
    const res = await fetch(`/api/stylist/looks/${id}`, { method: 'DELETE' })
    if (res.ok) {
      setLocalLooks((prev) => prev.filter((l) => l.id !== id))
    }
  }

  return (
    <div>
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2 mb-6">
        {/* Published filter */}
        <div
          className="flex rounded-xl overflow-hidden p-1 gap-1"
          style={{ backgroundColor: '#FFFFFF', border: '1px solid #EAE4D8' }}
        >
          {(['all', 'published', 'draft'] as const).map((v) => (
            <button
              key={v}
              onClick={() => setPublishedFilter(v)}
              className="px-3 h-7 rounded-lg text-xs font-medium capitalize transition-all"
              style={{
                backgroundColor: publishedFilter === v ? '#422D64' : 'transparent',
                color: publishedFilter === v ? '#FFFFFF' : '#9A8DAA'
              }}
            >
              {v}
            </button>
          ))}
        </div>

        {/* Occasion filter pills */}
        <div className="flex gap-1.5 overflow-x-auto pb-0.5">
          {OCCASIONS.map(({ value, label }) => (
            <button
              key={value}
              onClick={() => setFilter(value)}
              className="shrink-0 px-3 h-8 rounded-full text-xs font-medium transition-all"
              style={{
                backgroundColor: filter === value ? '#CF9D4E' : '#FFFFFF',
                color: filter === value ? '#FFFFFF' : '#9A8DAA',
                border: '1px solid',
                borderColor: filter === value ? '#CF9D4E' : '#EAE4D8'
              }}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Count */}
      <p className="text-xs mb-4 font-medium" style={{ color: '#9A8DAA' }}>
        {filtered.length} {filtered.length === 1 ? 'look' : 'looks'}
      </p>

      {/* Grid */}
      {filtered.length === 0 ? (
        <div
          className="rounded-2xl p-16 flex flex-col items-center justify-center gap-3 text-center"
          style={{ backgroundColor: '#FFFFFF', border: '1px dashed #D4C9BB' }}
        >
          <div
            className="w-12 h-12 rounded-full flex items-center justify-center"
            style={{ backgroundColor: '#F2EDF8' }}
          >
            <Sparkles className="w-5 h-5" style={{ color: '#B0A0C4' }} />
          </div>
          <p className="text-sm font-medium" style={{ color: '#5A4D6A' }}>
            No looks found
          </p>
          <p className="text-xs" style={{ color: '#9A8DAA' }}>
            Try a different filter or create a new look
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map((look) => {
            const occasionLabel = look.occasion
              ? look.occasion.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
              : null
            const seasonLabel = look.season
              ? look.season.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
              : null

            return (
              <div
                key={look.id}
                className="group rounded-2xl overflow-hidden transition-all animate-fade-in-up"
                style={{
                  backgroundColor: '#FFFFFF',
                  border: '1px solid #EAE4D8',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
                }}
              >
                {/* Image */}
                <div
                  className="relative aspect-[3/4] overflow-hidden"
                  style={{ backgroundColor: '#F2EDF8' }}
                >
                  {look.primary_image_url ? (
                    <img
                      src={look.primary_image_url}
                      alt={look.title}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Sparkles className="w-8 h-8" style={{ color: '#D4C9BB' }} />
                    </div>
                  )}

                  {/* Badges */}
                  <div className="absolute top-3 left-3 flex gap-1.5">
                    <span
                      className="text-[10px] px-2 py-0.5 rounded-full font-semibold backdrop-blur-sm"
                      style={{
                        backgroundColor: look.is_published
                          ? 'rgba(13,103,78,0.85)'
                          : 'rgba(90,77,106,0.85)',
                        color: '#FFFFFF'
                      }}
                    >
                      {look.is_published ? 'Live' : 'Draft'}
                    </span>
                    {look.is_premium && (
                      <span
                        className="text-[10px] px-2 py-0.5 rounded-full font-semibold backdrop-blur-sm"
                        style={{ backgroundColor: 'rgba(207,157,78,0.9)', color: '#FFFFFF' }}
                      >
                        Premium
                      </span>
                    )}
                  </div>

                  {/* Hover actions */}
                  <div
                    className="absolute inset-0 flex items-end p-3 gap-2 opacity-0 group-hover:opacity-100 transition-opacity"
                    style={{ background: 'linear-gradient(to top, rgba(13,10,20,0.7), transparent)' }}
                  >
                    <Link
                      href={`/stylist/looks/${look.id}`}
                      className="flex-1 flex items-center justify-center gap-1.5 h-9 rounded-xl text-xs font-medium"
                      style={{ backgroundColor: 'rgba(255,255,255,0.15)', color: '#FFFFFF', backdropFilter: 'blur(8px)' }}
                    >
                      <Edit2 className="w-3 h-3" />
                      Edit
                    </Link>
                    <button
                      onClick={() => deleteLook(look.id)}
                      className="w-9 h-9 rounded-xl flex items-center justify-center transition-colors"
                      style={{ backgroundColor: 'rgba(192,57,43,0.2)', color: '#FFFFFF', backdropFilter: 'blur(8px)' }}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Card footer */}
                <div className="p-3">
                  <p className="text-sm font-medium truncate mb-1" style={{ color: '#1A1428' }}>
                    {look.title}
                  </p>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {occasionLabel && (
                      <span
                        className="text-[10px] px-2 py-0.5 rounded-full"
                        style={{ backgroundColor: '#F2EDF8', color: '#5A4D6A' }}
                      >
                        {occasionLabel}
                      </span>
                    )}
                    {seasonLabel && (
                      <span
                        className="text-[10px] px-2 py-0.5 rounded-full"
                        style={{ backgroundColor: '#F8F5EE', color: '#9A8DAA' }}
                      >
                        {seasonLabel}
                      </span>
                    )}
                  </div>

                  {/* Stats + publish toggle */}
                  <div className="flex items-center justify-between mt-3 pt-3" style={{ borderTop: '1px solid #F0EBE3' }}>
                    <div className="flex items-center gap-2.5">
                      <span className="flex items-center gap-1 text-xs" style={{ color: '#B0A0C4' }}>
                        <Heart className="w-3 h-3" /> {look.likes_count}
                      </span>
                      <span className="flex items-center gap-1 text-xs" style={{ color: '#B0A0C4' }}>
                        <Eye className="w-3 h-3" /> {look.views_count}
                      </span>
                    </div>
                    <button
                      onClick={() => togglePublish(look)}
                      disabled={toggling === look.id}
                      className="flex items-center gap-1 text-xs font-medium transition-colors"
                      style={{ color: look.is_published ? '#0D674E' : '#9A8DAA' }}
                      title={look.is_published ? 'Unpublish' : 'Publish'}
                    >
                      {look.is_published ? (
                        <ToggleRight className="w-4 h-4" />
                      ) : (
                        <ToggleLeft className="w-4 h-4" />
                      )}
                      {look.is_published ? 'Live' : 'Draft'}
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
