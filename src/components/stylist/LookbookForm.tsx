'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Plus, Trash2 } from 'lucide-react'
import Link from 'next/link'

const LOOKBOOK_TYPES = [
  'quick_trip', 'special_occasion', 'conference',
  'birthday', 'wedding', 'vacation', 'custom'
]
const STATUSES = ['draft', 'requested', 'accepted', 'completed']

interface LookbookItem {
  id?: string
  name: string
  brand: string
  category: string
  image_url: string
  price: string
  purchase_url: string
  notes: string
  sort_order: number
}

interface LookbookFormProps {
  initialData?: {
    id: string
    title: string
    type: string
    custom_type: string | null
    cover_image_url: string | null
    event_date_start: string | null
    event_date_end: string | null
    description: string | null
    status: string
    assigned_to: string | null
    is_published: boolean
    show_in_feed: boolean
    lookbook_items: LookbookItem[]
  }
}

export function LookbookForm({ initialData }: LookbookFormProps) {
  const router = useRouter()
  const isEdit = !!initialData?.id

  const [title, setTitle] = useState(initialData?.title ?? '')
  const [type, setType] = useState(initialData?.type ?? 'custom')
  const [customType, setCustomType] = useState(initialData?.custom_type ?? '')
  const [description, setDescription] = useState(initialData?.description ?? '')
  const [coverImageUrl, setCoverImageUrl] = useState(initialData?.cover_image_url ?? '')
  const [dateStart, setDateStart] = useState(initialData?.event_date_start?.split('T')[0] ?? '')
  const [dateEnd, setDateEnd] = useState(initialData?.event_date_end?.split('T')[0] ?? '')
  const [status, setStatus] = useState(initialData?.status ?? 'draft')
  const [assignedTo, setAssignedTo] = useState(initialData?.assigned_to ?? '')
  const [isPublished, setIsPublished] = useState(initialData?.is_published ?? false)
  const [showInFeed, setShowInFeed] = useState(initialData?.show_in_feed ?? false)
  const [items, setItems] = useState<LookbookItem[]>(initialData?.lookbook_items ?? [])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  function addItem() {
    setItems((prev) => [
      ...prev,
      { name: '', brand: '', category: 'top', image_url: '', price: '', purchase_url: '', notes: '', sort_order: prev.length }
    ])
  }

  function updateItem(idx: number, field: keyof LookbookItem, value: string) {
    setItems((prev) => prev.map((item, i) => (i === idx ? { ...item, [field]: value } : item)))
  }

  function removeItem(idx: number) {
    setItems((prev) => prev.filter((_, i) => i !== idx))
  }

  async function handleSave() {
    if (!title.trim()) { setError('Title is required.'); return }
    setSaving(true)
    setError('')

    const body = {
      title: title.trim(),
      type,
      custom_type: type === 'custom' ? customType : null,
      description: description || null,
      cover_image_url: coverImageUrl || null,
      event_date_start: dateStart || null,
      event_date_end: dateEnd || null,
      status,
      assigned_to: assignedTo || null,
      is_published: isPublished,
      show_in_feed: showInFeed,
      items: items.map((item, i) => ({ ...item, sort_order: i }))
    }

    try {
      const url = isEdit ? `/api/stylist/lookbooks/${initialData.id}` : '/api/stylist/lookbooks'
      const method = isEdit ? 'PUT' : 'POST'
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      })

      if (!res.ok) {
        const data = await res.json()
        setError(data.error ?? 'Failed to save.')
        return
      }

      router.push('/admin/lookbooks')
      router.refresh()
    } catch {
      setError('Something went wrong.')
    } finally {
      setSaving(false)
    }
  }

  const inputStyle = {
    borderColor: '#D4C9BB',
    backgroundColor: '#FFFFFF',
    color: '#1A1428',
    fontFamily: 'var(--font-dm-sans), DM Sans, sans-serif'
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
          <Link href="/admin/lookbooks" className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ backgroundColor: '#F2EDF8', color: '#422D64' }}>
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <h1 className="text-2xl font-light" style={{ fontFamily: 'var(--font-cormorant), Cormorant Garamond, serif', color: '#1A1428' }}>
            {isEdit ? 'Edit Lookbook' : 'New Lookbook'}
          </h1>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-4 h-9 rounded-xl text-sm font-medium"
          style={{ backgroundColor: '#422D64', color: '#FFFFFF', opacity: saving ? 0.7 : 1 }}
        >
          {saving ? 'Saving…' : 'Save'}
        </button>
      </div>

      {error && (
        <div className="mx-6 lg:mx-8 mt-4 px-4 py-3 rounded-xl text-sm" style={{ backgroundColor: '#FEF2F2', color: '#C0392B', border: '1px solid #FECACA' }}>
          {error}
        </div>
      )}

      <div className="px-6 lg:px-8 py-6 max-w-3xl space-y-6">
        {/* Basic info */}
        <div className="rounded-2xl p-6 space-y-4" style={{ backgroundColor: '#FFFFFF', border: '1px solid #EAE4D8' }}>
          <h2 className="text-xl font-light mb-2" style={{ fontFamily: 'var(--font-cormorant), Cormorant Garamond, serif', color: '#1A1428' }}>Details</h2>

          <div>
            <label className="block text-xs font-medium tracking-wider uppercase mb-2" style={{ color: '#5A4D6A' }}>Title *</label>
            <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Lagos Wedding Weekend" className="w-full px-4 h-11 rounded-xl border text-sm outline-none" style={inputStyle} />
          </div>

          <div>
            <label className="block text-xs font-medium tracking-wider uppercase mb-2" style={{ color: '#5A4D6A' }}>Type</label>
            <div className="flex flex-wrap gap-2">
              {LOOKBOOK_TYPES.map((t) => (
                <button key={t} type="button" onClick={() => setType(t)}
                  className="px-3 h-8 rounded-full text-xs font-medium capitalize transition-all"
                  style={{ backgroundColor: type === t ? '#422D64' : '#F2EDF8', color: type === t ? '#FFFFFF' : '#5A4D6A' }}>
                  {t.replace(/_/g, ' ')}
                </button>
              ))}
            </div>
            {type === 'custom' && (
              <input type="text" value={customType} onChange={(e) => setCustomType(e.target.value)} placeholder="Custom type name" className="mt-2 w-full px-4 h-10 rounded-xl border text-sm outline-none" style={inputStyle} />
            )}
          </div>

          <div>
            <label className="block text-xs font-medium tracking-wider uppercase mb-2" style={{ color: '#5A4D6A' }}>Description</label>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What is this lookbook for?" rows={3} className="w-full px-4 py-3 rounded-xl border text-sm outline-none resize-none" style={inputStyle} />
          </div>

          <div>
            <label className="block text-xs font-medium tracking-wider uppercase mb-2" style={{ color: '#5A4D6A' }}>Cover Image URL</label>
            <input type="url" value={coverImageUrl} onChange={(e) => setCoverImageUrl(e.target.value)} placeholder="https://…" className="w-full px-4 h-11 rounded-xl border text-sm outline-none" style={inputStyle} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium tracking-wider uppercase mb-2" style={{ color: '#5A4D6A' }}>Event Start</label>
              <input type="date" value={dateStart} onChange={(e) => setDateStart(e.target.value)} className="w-full px-4 h-11 rounded-xl border text-sm outline-none" style={inputStyle} />
            </div>
            <div>
              <label className="block text-xs font-medium tracking-wider uppercase mb-2" style={{ color: '#5A4D6A' }}>Event End</label>
              <input type="date" value={dateEnd} onChange={(e) => setDateEnd(e.target.value)} className="w-full px-4 h-11 rounded-xl border text-sm outline-none" style={inputStyle} />
            </div>
          </div>
        </div>

        {/* Assignment & Status */}
        <div className="rounded-2xl p-6 space-y-4" style={{ backgroundColor: '#FFFFFF', border: '1px solid #EAE4D8' }}>
          <h2 className="text-xl font-light" style={{ fontFamily: 'var(--font-cormorant), Cormorant Garamond, serif', color: '#1A1428' }}>Assignment</h2>

          <div>
            <label className="block text-xs font-medium tracking-wider uppercase mb-2" style={{ color: '#5A4D6A' }}>Client ID (assigned to)</label>
            <input type="text" value={assignedTo} onChange={(e) => setAssignedTo(e.target.value)} placeholder="Client user ID" className="w-full px-4 h-11 rounded-xl border text-sm outline-none" style={inputStyle} />
          </div>

          <div>
            <label className="block text-xs font-medium tracking-wider uppercase mb-2" style={{ color: '#5A4D6A' }}>Status</label>
            <div className="flex gap-2 flex-wrap">
              {STATUSES.map((s) => (
                <button key={s} type="button" onClick={() => setStatus(s)}
                  className="px-3 h-8 rounded-full text-xs font-medium capitalize transition-all"
                  style={{ backgroundColor: status === s ? '#422D64' : '#F2EDF8', color: status === s ? '#FFFFFF' : '#5A4D6A' }}>
                  {s}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            {[
              { label: 'Published', sub: 'Visible to assigned client', value: isPublished, set: setIsPublished },
              { label: 'Show in Feed', sub: 'Visible to all clients in discovery feed', value: showInFeed, set: setShowInFeed }
            ].map(({ label, sub, value, set }) => (
              <div key={label} className="flex items-center justify-between p-4 rounded-xl" style={{ backgroundColor: '#F8F5EE' }}>
                <div>
                  <p className="text-sm font-medium" style={{ color: '#1A1428' }}>{label}</p>
                  <p className="text-xs" style={{ color: '#9A8DAA' }}>{sub}</p>
                </div>
                <button type="button" onClick={() => set(!value)} className="w-11 h-6 rounded-full relative transition-all" style={{ backgroundColor: value ? '#422D64' : '#D4C9BB' }}>
                  <div className="w-4 h-4 rounded-full bg-white absolute top-1 transition-all" style={{ left: value ? 'calc(100% - 20px)' : '4px' }} />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Items */}
        <div className="rounded-2xl p-6" style={{ backgroundColor: '#FFFFFF', border: '1px solid #EAE4D8' }}>
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-xl font-light" style={{ fontFamily: 'var(--font-cormorant), Cormorant Garamond, serif', color: '#1A1428' }}>
              Items <span className="text-base font-light" style={{ color: '#9A8DAA' }}>({items.length})</span>
            </h2>
            <button type="button" onClick={addItem} className="flex items-center gap-1.5 px-3 h-8 rounded-xl text-xs font-medium" style={{ backgroundColor: '#F2EDF8', color: '#422D64' }}>
              <Plus className="w-3.5 h-3.5" /> Add Item
            </button>
          </div>

          <div className="space-y-3">
            {items.map((item, idx) => (
              <div key={idx} className="rounded-xl p-4" style={{ backgroundColor: '#F8F5EE', border: '1px solid #EAE4D8' }}>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-medium tracking-widest uppercase" style={{ color: '#9A8DAA' }}>Item {idx + 1}</span>
                  <button type="button" onClick={() => removeItem(idx)} className="w-6 h-6 rounded-lg flex items-center justify-center" style={{ color: '#C0392B', backgroundColor: 'rgba(192,57,43,0.1)' }}>
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { field: 'name' as const, label: 'Name *', placeholder: 'Item name' },
                    { field: 'brand' as const, label: 'Brand', placeholder: 'Brand' },
                    { field: 'price' as const, label: 'Price', placeholder: '0.00' },
                    { field: 'image_url' as const, label: 'Image URL', placeholder: 'https://…' }
                  ].map(({ field, label, placeholder }) => (
                    <div key={field} className={field === 'image_url' ? 'col-span-2' : ''}>
                      <label className="block text-[10px] font-medium tracking-wider uppercase mb-1" style={{ color: '#9A8DAA' }}>{label}</label>
                      <input type="text" value={item[field] as string} onChange={(e) => updateItem(idx, field, e.target.value)} placeholder={placeholder}
                        className="w-full px-3 h-8 rounded-lg border text-xs outline-none" style={{ borderColor: '#D4C9BB', backgroundColor: '#FFFFFF', color: '#1A1428' }} />
                    </div>
                  ))}
                  <div className="col-span-2">
                    <label className="block text-[10px] font-medium tracking-wider uppercase mb-1" style={{ color: '#9A8DAA' }}>Purchase URL</label>
                    <input type="url" value={item.purchase_url} onChange={(e) => updateItem(idx, 'purchase_url', e.target.value)} placeholder="https://…"
                      className="w-full px-3 h-8 rounded-lg border text-xs outline-none" style={{ borderColor: '#D4C9BB', backgroundColor: '#FFFFFF', color: '#1A1428' }} />
                  </div>
                </div>
              </div>
            ))}
            {items.length === 0 && (
              <div className="rounded-xl p-6 text-center" style={{ backgroundColor: '#F8F5EE', border: '1px dashed #D4C9BB' }}>
                <p className="text-sm" style={{ color: '#9A8DAA' }}>Add items clients can shop from this lookbook</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
