'use client'

import Link from 'next/link'
import { useRef, useState } from 'react'
import { ArrowLeft, ImagePlus, X } from 'lucide-react'
import { stylistLabel } from '@/lib/stylist-labels'

/** Back arrow, title and save buttons for the look and lookbook editors. */
export function EditorHeader({ backHref, backLabel, title, actions }: {
  backHref: string
  backLabel: string
  title: string
  actions: React.ReactNode
}) {
  return (
    <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
      <div className="flex min-w-0 items-center gap-3">
        <Link
          href={backHref}
          aria-label={backLabel}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white text-purple-dark ring-1 ring-inset ring-atelier-border transition hover:bg-atelier-lavender"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden />
        </Link>
        <h1 className="truncate font-cormorant text-3xl font-medium leading-tight text-atelier-ink sm:text-4xl">{title}</h1>
      </div>
      <div className="flex flex-wrap items-center gap-2">{actions}</div>
    </div>
  )
}

/** Pick one (or several) values from a row of chips. Clicking the selected chip again clears it. */
export function ChipPicker({ label, hint, options, selected, onToggle, format = stylistLabel }: {
  label: string
  hint?: string
  options: readonly string[]
  selected: string[]
  onToggle: (value: string) => void
  format?: (value: string) => string
}) {
  return (
    <fieldset>
      <legend className="text-sm font-semibold text-gray-dark">{label}</legend>
      {hint ? <p className="mt-0.5 text-xs text-atelier-faint">{hint}</p> : null}
      <div className="mt-2 flex flex-wrap gap-2">
        {options.map((opt) => {
          const on = selected.includes(opt)
          return (
            <button
              key={opt}
              type="button"
              aria-pressed={on}
              onClick={() => onToggle(opt)}
              className={`rounded-full px-3 py-1.5 text-sm transition ${
                on ? 'bg-atelier-ink text-white' : 'bg-white text-atelier-muted ring-1 ring-inset ring-atelier-border hover:text-atelier-ink'
              }`}
            >
              {format(opt)}
            </button>
          )
        })}
      </div>
    </fieldset>
  )
}

/** Photo picker with preview. Uploads through /api/upload and hands back the URL. */
export function ImageField({ label, value, onChange, onError }: {
  label: string
  value: string
  onChange: (url: string) => void
  onError: (message: string) => void
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)

  async function upload(file: File) {
    setUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      const res = await fetch('/api/upload', { method: 'POST', body: formData })
      const data = (await res.json().catch(() => null)) as { data?: { imageUrl?: string }; error?: string } | null
      if (!res.ok || !data?.data?.imageUrl) throw new Error(data?.error || "Couldn't upload the photo. Try again.")
      onChange(data.data.imageUrl)
    } catch (err) {
      onError(err instanceof Error ? err.message : "Couldn't upload the photo. Try again.")
    } finally {
      setUploading(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  return (
    <div>
      <p className="text-sm font-semibold text-gray-dark">{label}</p>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="sr-only"
        tabIndex={-1}
        aria-hidden
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) void upload(file)
        }}
      />
      {value ? (
        <div className="relative mt-2 aspect-[3/4] overflow-hidden rounded-2xl bg-atelier-canvas">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={value} alt="" className="h-full w-full object-cover" />
          <button
            type="button"
            onClick={() => onChange('')}
            aria-label="Remove photo"
            className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full bg-atelier-ink/70 text-white backdrop-blur transition hover:bg-atelier-ink"
          >
            <X className="h-4 w-4" aria-hidden />
          </button>
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
            className="absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full bg-atelier-ink/70 px-4 py-1.5 text-xs font-medium text-white backdrop-blur transition hover:bg-atelier-ink disabled:opacity-60"
          >
            {uploading ? 'Uploading…' : 'Change photo'}
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="mt-2 flex aspect-[3/4] w-full flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-atelier-border bg-atelier-canvas text-sm text-atelier-muted transition hover:border-purple-dark/40 disabled:opacity-60"
        >
          <ImagePlus className="h-6 w-6" aria-hidden />
          <span className="font-medium">{uploading ? 'Uploading…' : 'Choose a photo'}</span>
        </button>
      )}
    </div>
  )
}

/** One piece of clothing in a look or lookbook, with a remove button. */
export function ItemCard({ index, onRemove, children }: { index: number; onRemove: () => void; children: React.ReactNode }) {
  return (
    <li className="rounded-xl border border-atelier-border bg-atelier-canvas/60 p-4">
      <div className="mb-3 flex items-center justify-between">
        <span className="text-xs font-medium uppercase tracking-wider text-atelier-faint">Item {index + 1}</span>
        <button
          type="button"
          onClick={onRemove}
          className="rounded-lg px-2 py-1 text-sm font-medium text-red-600 transition hover:bg-red-50"
        >
          Remove
        </button>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">{children}</div>
    </li>
  )
}
