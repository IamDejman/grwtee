'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Plus, Trash2, Upload, X, ChevronDown } from 'lucide-react'
import Link from 'next/link'

const OCCASIONS = [
  'casual', 'corporate', 'date_night', 'formal', 'streetwear',
  'athleisure', 'brunch', 'vacation', 'wedding_guest', 'interview',
  'weekend', 'party', 'business_casual'
]
const SEASONS = ['spring', 'summer', 'fall', 'winter', 'all_season']
const GENDERS = ['female', 'male', 'non_binary', 'all']
const BODY_SHAPES = ['apple', 'pear', 'hourglass', 'rectangle', 'inverted_triangle', 'oval', 'athletic', 'slim']
const STYLE_TAGS = ['Minimalist', 'Streetwear', 'Classic', 'Bohemian', 'Preppy', 'Edgy', 'Romantic', 'Sporty', 'Vintage', 'Avant-Garde', 'Smart Casual', 'Afrocentric']
const ITEM_CATEGORIES = ['top', 'bottom', 'dress', 'outerwear', 'shoes', 'bag', 'accessory', 'jewelry', 'hat', 'wig', 'other']

interface LookItem {
  id?: string
  category: string
  name: string
  brand: string
  color: string
  image_url: string
  purchase_url: string
  price: string
  currency: string
  notes: string
  sort_order: number
}

interface LookFormProps {
  initialData?: {
    id: string
    title: string
    description: string | null
    occasion: string | null
    season: string | null
    gender_target: string | null
    body_shapes_suited: string[] | null
    style_tags: string[] | null
    primary_image_url: string | null
    is_premium: boolean
    is_published: boolean
    look_items: LookItem[]
    look_images: { id: string; image_url: string; sort_order: number }[]
  }
}

function SectionHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="mb-6">
      <h2
        className="text-xl font-light"
        style={{ fontFamily: 'var(--font-cormorant), Cormorant Garamond, serif', color: '#1A1428' }}
      >
        {title}
      </h2>
      {subtitle && <p className="text-xs mt-1" style={{ color: '#9A8DAA' }}>{subtitle}</p>}
    </div>
  )
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <label
      className="block text-xs font-medium tracking-wider uppercase mb-2"
      style={{ color: '#5A4D6A' }}
    >
      {children}
    </label>
  )
}

function TextInput({
  value, onChange, placeholder, multiline = false
}: {
  value: string
  onChange: (v: string) => void
  placeholder?: string
  multiline?: boolean
}) {
  const shared = {
    className: "w-full px-4 rounded-xl border text-sm outline-none transition-all resize-none",
    style: {
      borderColor: '#D4C9BB',
      backgroundColor: '#FFFFFF',
      color: '#1A1428',
      fontFamily: 'var(--font-dm-sans), DM Sans, sans-serif'
    } as React.CSSProperties,
    placeholder,
    value,
    onFocus: (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      e.target.style.borderColor = '#422D64'
      e.target.style.boxShadow = '0 0 0 3px rgba(66,45,100,0.1)'
    },
    onBlur: (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      e.target.style.borderColor = '#D4C9BB'
      e.target.style.boxShadow = 'none'
    }
  }

  if (multiline) {
    return (
      <textarea
        {...shared}
        rows={3}
        onChange={(e) => onChange(e.target.value)}
        style={{ ...shared.style, paddingTop: '12px', paddingBottom: '12px' }}
      />
    )
  }
  return (
    <input
      {...shared}
      type="text"
      onChange={(e) => onChange(e.target.value)}
      style={{ ...shared.style, height: '44px' }}
    />
  )
}

function ChipSelect({
  options, selected, onToggle, single = false
}: {
  options: string[]
  selected: string[]
  onToggle: (v: string) => void
  single?: boolean
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((opt) => {
        const isSelected = selected.includes(opt)
        return (
          <button
            key={opt}
            type="button"
            onClick={() => onToggle(opt)}
            className="px-3 h-8 rounded-full text-xs font-medium capitalize transition-all"
            style={{
              backgroundColor: isSelected ? '#422D64' : '#F2EDF8',
              color: isSelected ? '#FFFFFF' : '#5A4D6A',
              border: '1px solid',
              borderColor: isSelected ? '#422D64' : 'transparent'
            }}
          >
            {opt.replace(/_/g, ' ')}
          </button>
        )
      })}
    </div>
  )
}

export function LookForm({ initialData }: LookFormProps) {
  const router = useRouter()
  const isEdit = !!initialData?.id

  const [title, setTitle] = useState(initialData?.title ?? '')
  const [description, setDescription] = useState(initialData?.description ?? '')
  const [occasion, setOccasion] = useState<string[]>(
    initialData?.occasion ? [initialData.occasion] : []
  )
  const [season, setSeason] = useState<string[]>(
    initialData?.season ? [initialData.season] : []
  )
  const [genderTarget, setGenderTarget] = useState<string[]>(
    initialData?.gender_target ? [initialData.gender_target] : []
  )
  const [bodyShapes, setBodyShapes] = useState<string[]>(initialData?.body_shapes_suited ?? [])
  const [styleTags, setStyleTags] = useState<string[]>(initialData?.style_tags ?? [])
  const [isPremium, setIsPremium] = useState(initialData?.is_premium ?? false)
  const [isPublished, setIsPublished] = useState(initialData?.is_published ?? false)
  const [primaryImageUrl, setPrimaryImageUrl] = useState(initialData?.primary_image_url ?? '')
  const [items, setItems] = useState<LookItem[]>(
    initialData?.look_items ?? []
  )
  const [uploadingImage, setUploadingImage] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  function toggleSingle(val: string, current: string[], setter: (v: string[]) => void) {
    setter(current.includes(val) ? [] : [val])
  }
  function toggleMulti(val: string, current: string[], setter: (v: string[]) => void) {
    setter(current.includes(val) ? current.filter((v) => v !== val) : [...current, val])
  }

  async function uploadImage(file: File) {
    setUploadingImage(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      const res = await fetch('/api/upload', { method: 'POST', body: formData })
      const data = await res.json()
      if (data.url) setPrimaryImageUrl(data.url)
    } finally {
      setUploadingImage(false)
    }
  }

  function addItem() {
    setItems((prev) => [
      ...prev,
      {
        category: 'top',
        name: '',
        brand: '',
        color: '',
        image_url: '',
        purchase_url: '',
        price: '',
        currency: 'NGN',
        notes: '',
        sort_order: prev.length
      }
    ])
  }

  function updateItem(idx: number, field: keyof LookItem, value: string) {
    setItems((prev) =>
      prev.map((item, i) => (i === idx ? { ...item, [field]: value } : item))
    )
  }

  function removeItem(idx: number) {
    setItems((prev) => prev.filter((_, i) => i !== idx))
  }

  async function handleSave(publish: boolean = isPublished) {
    if (!title.trim()) {
      setError('Title is required.')
      return
    }
    setSaving(true)
    setError('')

    const body = {
      title: title.trim(),
      description: description.trim() || null,
      occasion: occasion[0] ?? null,
      season: season[0] ?? null,
      gender_target: genderTarget[0] ?? null,
      body_shapes_suited: bodyShapes,
      style_tags: styleTags,
      primary_image_url: primaryImageUrl || null,
      is_premium: isPremium,
      is_published: publish,
      items: items.map((item, i) => ({ ...item, sort_order: i }))
    }

    try {
      const url = isEdit ? `/api/stylist/looks/${initialData.id}` : '/api/stylist/looks'
      const method = isEdit ? 'PUT' : 'POST'
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      })

      if (!res.ok) {
        const data = await res.json()
        setError(data.error ?? 'Failed to save look.')
        return
      }

      const saved = await res.json()
      router.push('/admin/looks')
      router.refresh()
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="min-h-full" style={{ backgroundColor: '#F8F5EE' }}>
      {/* Header */}
      <div
        className="sticky top-0 z-10 px-6 lg:px-8 py-4 flex items-center justify-between"
        style={{
          backgroundColor: 'rgba(248,245,238,0.92)',
          backdropFilter: 'blur(12px)',
          borderBottom: '1px solid #EAE4D8'
        }}
      >
        <div className="flex items-center gap-3">
          <Link
            href="/admin/looks"
            className="w-9 h-9 rounded-xl flex items-center justify-center transition-colors"
            style={{ backgroundColor: '#F2EDF8', color: '#422D64' }}
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <h1
            className="text-2xl font-light"
            style={{ fontFamily: 'var(--font-cormorant), Cormorant Garamond, serif', color: '#1A1428' }}
          >
            {isEdit ? 'Edit Look' : 'New Look'}
          </h1>
        </div>

        <div className="flex items-center gap-2">
          {!isPublished && (
            <button
              onClick={() => handleSave(false)}
              disabled={saving}
              className="px-4 h-9 rounded-xl text-sm font-medium transition-all"
              style={{ backgroundColor: '#F2EDF8', color: '#422D64' }}
            >
              Save Draft
            </button>
          )}
          <button
            onClick={() => handleSave(true)}
            disabled={saving}
            className="px-4 h-9 rounded-xl text-sm font-medium transition-all"
            style={{ backgroundColor: '#422D64', color: '#FFFFFF', opacity: saving ? 0.7 : 1 }}
          >
            {saving ? 'Saving…' : isPublished ? 'Update' : 'Publish'}
          </button>
        </div>
      </div>

      {error && (
        <div
          className="mx-6 lg:mx-8 mt-4 px-4 py-3 rounded-xl text-sm"
          style={{ backgroundColor: '#FEF2F2', color: '#C0392B', border: '1px solid #FECACA' }}
        >
          {error}
        </div>
      )}

      <div className="px-6 lg:px-8 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 max-w-5xl">
          {/* Left column — Details */}
          <div className="space-y-6">
            {/* Basic info */}
            <div
              className="rounded-2xl p-6"
              style={{ backgroundColor: '#FFFFFF', border: '1px solid #EAE4D8' }}
            >
              <SectionHeader title="Details" subtitle="Core information about this look" />

              <div className="space-y-4">
                <div>
                  <FieldLabel>Title *</FieldLabel>
                  <TextInput value={title} onChange={setTitle} placeholder="e.g. The Power Blazer" />
                </div>
                <div>
                  <FieldLabel>Description</FieldLabel>
                  <TextInput
                    value={description}
                    onChange={setDescription}
                    placeholder="Describe the look, styling notes, inspiration…"
                    multiline
                  />
                </div>
              </div>
            </div>

            {/* Attributes */}
            <div
              className="rounded-2xl p-6"
              style={{ backgroundColor: '#FFFFFF', border: '1px solid #EAE4D8' }}
            >
              <SectionHeader title="Attributes" subtitle="Used for client matching and filtering" />

              <div className="space-y-5">
                <div>
                  <FieldLabel>Occasion</FieldLabel>
                  <ChipSelect
                    options={OCCASIONS}
                    selected={occasion}
                    onToggle={(v) => toggleSingle(v, occasion, setOccasion)}
                    single
                  />
                </div>
                <div>
                  <FieldLabel>Season</FieldLabel>
                  <ChipSelect
                    options={SEASONS}
                    selected={season}
                    onToggle={(v) => toggleSingle(v, season, setSeason)}
                    single
                  />
                </div>
                <div>
                  <FieldLabel>Gender Target</FieldLabel>
                  <ChipSelect
                    options={GENDERS}
                    selected={genderTarget}
                    onToggle={(v) => toggleSingle(v, genderTarget, setGenderTarget)}
                    single
                  />
                </div>
                <div>
                  <FieldLabel>Suited Body Shapes</FieldLabel>
                  <ChipSelect
                    options={BODY_SHAPES}
                    selected={bodyShapes}
                    onToggle={(v) => toggleMulti(v, bodyShapes, setBodyShapes)}
                  />
                </div>
                <div>
                  <FieldLabel>Style Tags</FieldLabel>
                  <ChipSelect
                    options={STYLE_TAGS}
                    selected={styleTags}
                    onToggle={(v) => toggleMulti(v, styleTags, setStyleTags)}
                  />
                </div>
              </div>
            </div>

            {/* Settings */}
            <div
              className="rounded-2xl p-6"
              style={{ backgroundColor: '#FFFFFF', border: '1px solid #EAE4D8' }}
            >
              <SectionHeader title="Settings" />
              <div className="space-y-3">
                {[
                  { label: 'Premium Look', sub: 'Only visible to premium subscribers', value: isPremium, set: setIsPremium },
                  { label: 'Published', sub: 'Visible to clients in the feed', value: isPublished, set: setIsPublished }
                ].map(({ label, sub, value, set }) => (
                  <div
                    key={label}
                    className="flex items-center justify-between p-4 rounded-xl"
                    style={{ backgroundColor: '#F8F5EE' }}
                  >
                    <div>
                      <p className="text-sm font-medium" style={{ color: '#1A1428' }}>{label}</p>
                      <p className="text-xs" style={{ color: '#9A8DAA' }}>{sub}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => set(!value)}
                      className="w-11 h-6 rounded-full relative transition-all"
                      style={{ backgroundColor: value ? '#422D64' : '#D4C9BB' }}
                    >
                      <div
                        className="w-4 h-4 rounded-full bg-white absolute top-1 transition-all"
                        style={{ left: value ? 'calc(100% - 20px)' : '4px' }}
                      />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right column — Image + Items */}
          <div className="space-y-6">
            {/* Primary image */}
            <div
              className="rounded-2xl p-6"
              style={{ backgroundColor: '#FFFFFF', border: '1px solid #EAE4D8' }}
            >
              <SectionHeader title="Cover Image" subtitle="Main look photo" />

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (file) uploadImage(file)
                }}
              />

              {primaryImageUrl ? (
                <div className="relative aspect-[3/4] rounded-xl overflow-hidden">
                  <img
                    src={primaryImageUrl}
                    alt="Cover"
                    className="w-full h-full object-cover"
                  />
                  <button
                    onClick={() => setPrimaryImageUrl('')}
                    className="absolute top-2 right-2 w-8 h-8 rounded-full flex items-center justify-center"
                    style={{ backgroundColor: 'rgba(13,10,20,0.6)', color: '#FFFFFF' }}
                  >
                    <X className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="absolute bottom-3 left-1/2 -translate-x-1/2 px-4 h-8 rounded-full text-xs font-medium"
                    style={{ backgroundColor: 'rgba(13,10,20,0.6)', color: '#FFFFFF', backdropFilter: 'blur(8px)' }}
                  >
                    Change photo
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingImage}
                  className="w-full aspect-[3/4] rounded-xl flex flex-col items-center justify-center gap-3 transition-all"
                  style={{
                    backgroundColor: '#F2EDF8',
                    border: '2px dashed #D4C9BB',
                    color: '#9A8DAA'
                  }}
                >
                  <Upload className="w-6 h-6" />
                  <span className="text-sm font-medium">
                    {uploadingImage ? 'Uploading…' : 'Upload Cover Photo'}
                  </span>
                  <span className="text-xs">or enter URL below</span>
                </button>
              )}

              {!primaryImageUrl && (
                <div className="mt-3">
                  <FieldLabel>Or paste image URL</FieldLabel>
                  <TextInput
                    value={primaryImageUrl}
                    onChange={setPrimaryImageUrl}
                    placeholder="https://…"
                  />
                </div>
              )}
            </div>

            {/* Look items */}
            <div
              className="rounded-2xl p-6"
              style={{ backgroundColor: '#FFFFFF', border: '1px solid #EAE4D8' }}
            >
              <div className="flex items-center justify-between mb-6">
                <SectionHeader
                  title="Look Items"
                  subtitle={`${items.length} item${items.length !== 1 ? 's' : ''}`}
                />
                <button
                  type="button"
                  onClick={addItem}
                  className="flex items-center gap-1.5 px-3 h-8 rounded-xl text-xs font-medium"
                  style={{ backgroundColor: '#F2EDF8', color: '#422D64' }}
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add Item
                </button>
              </div>

              {items.length === 0 ? (
                <div
                  className="rounded-xl p-8 text-center"
                  style={{ backgroundColor: '#F8F5EE', border: '1px dashed #D4C9BB' }}
                >
                  <p className="text-sm" style={{ color: '#9A8DAA' }}>
                    Add clothing items that make up this look
                  </p>
                  <button
                    type="button"
                    onClick={addItem}
                    className="mt-3 px-4 h-8 rounded-xl text-xs font-medium"
                    style={{ backgroundColor: '#422D64', color: '#FFFFFF' }}
                  >
                    Add First Item
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  {items.map((item, idx) => (
                    <div
                      key={idx}
                      className="rounded-xl p-4"
                      style={{ backgroundColor: '#F8F5EE', border: '1px solid #EAE4D8' }}
                    >
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-xs font-medium tracking-widest uppercase" style={{ color: '#9A8DAA' }}>
                          Item {idx + 1}
                        </span>
                        <button
                          type="button"
                          onClick={() => removeItem(idx)}
                          className="w-6 h-6 rounded-lg flex items-center justify-center transition-colors"
                          style={{ color: '#C0392B', backgroundColor: 'rgba(192,57,43,0.1)' }}
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <FieldLabel>Category</FieldLabel>
                          <select
                            value={item.category}
                            onChange={(e) => updateItem(idx, 'category', e.target.value)}
                            className="w-full px-3 h-9 rounded-lg border text-xs outline-none"
                            style={{ borderColor: '#D4C9BB', backgroundColor: '#FFFFFF', color: '#1A1428' }}
                          >
                            {ITEM_CATEGORIES.map((c) => (
                              <option key={c} value={c}>
                                {c.charAt(0).toUpperCase() + c.slice(1)}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <FieldLabel>Name *</FieldLabel>
                          <input
                            type="text"
                            value={item.name}
                            onChange={(e) => updateItem(idx, 'name', e.target.value)}
                            placeholder="Item name"
                            className="w-full px-3 h-9 rounded-lg border text-xs outline-none"
                            style={{ borderColor: '#D4C9BB', backgroundColor: '#FFFFFF', color: '#1A1428' }}
                          />
                        </div>
                        <div>
                          <FieldLabel>Brand</FieldLabel>
                          <input
                            type="text"
                            value={item.brand}
                            onChange={(e) => updateItem(idx, 'brand', e.target.value)}
                            placeholder="Brand name"
                            className="w-full px-3 h-9 rounded-lg border text-xs outline-none"
                            style={{ borderColor: '#D4C9BB', backgroundColor: '#FFFFFF', color: '#1A1428' }}
                          />
                        </div>
                        <div>
                          <FieldLabel>Color</FieldLabel>
                          <input
                            type="text"
                            value={item.color}
                            onChange={(e) => updateItem(idx, 'color', e.target.value)}
                            placeholder="e.g. Navy"
                            className="w-full px-3 h-9 rounded-lg border text-xs outline-none"
                            style={{ borderColor: '#D4C9BB', backgroundColor: '#FFFFFF', color: '#1A1428' }}
                          />
                        </div>
                        <div>
                          <FieldLabel>Price</FieldLabel>
                          <input
                            type="number"
                            value={item.price}
                            onChange={(e) => updateItem(idx, 'price', e.target.value)}
                            placeholder="0.00"
                            className="w-full px-3 h-9 rounded-lg border text-xs outline-none"
                            style={{ borderColor: '#D4C9BB', backgroundColor: '#FFFFFF', color: '#1A1428' }}
                          />
                        </div>
                        <div>
                          <FieldLabel>Currency</FieldLabel>
                          <select
                            value={item.currency}
                            onChange={(e) => updateItem(idx, 'currency', e.target.value)}
                            className="w-full px-3 h-9 rounded-lg border text-xs outline-none"
                            style={{ borderColor: '#D4C9BB', backgroundColor: '#FFFFFF', color: '#1A1428' }}
                          >
                            {['NGN', 'USD', 'GBP', 'EUR'].map((c) => (
                              <option key={c} value={c}>{c}</option>
                            ))}
                          </select>
                        </div>
                        <div className="col-span-2">
                          <FieldLabel>Purchase URL</FieldLabel>
                          <input
                            type="url"
                            value={item.purchase_url}
                            onChange={(e) => updateItem(idx, 'purchase_url', e.target.value)}
                            placeholder="https://…"
                            className="w-full px-3 h-9 rounded-lg border text-xs outline-none"
                            style={{ borderColor: '#D4C9BB', backgroundColor: '#FFFFFF', color: '#1A1428' }}
                          />
                        </div>
                        <div className="col-span-2">
                          <FieldLabel>Item Image URL</FieldLabel>
                          <input
                            type="url"
                            value={item.image_url}
                            onChange={(e) => updateItem(idx, 'image_url', e.target.value)}
                            placeholder="https://…"
                            className="w-full px-3 h-9 rounded-lg border text-xs outline-none"
                            style={{ borderColor: '#D4C9BB', backgroundColor: '#FFFFFF', color: '#1A1428' }}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
