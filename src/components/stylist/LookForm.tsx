'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Textarea } from '@/components/ui/Textarea'
import { Panel, SwitchRow } from '@/components/admin/ui'
import { useToast } from '@/components/admin/Toast'
import { ChipPicker, EditorHeader, ImageField, ItemCard } from '@/components/stylist/FormParts'
import { LOOK_OCCASIONS, LOOK_SEASONS, stylistLabel } from '@/lib/stylist-labels'

// Leave unselected for looks that suit everyone.
const GENDERS = ['female', 'male', 'non_binary']
const BODY_SHAPES = ['apple', 'pear', 'hourglass', 'rectangle', 'inverted_triangle', 'oval', 'athletic', 'slim']
const STYLE_TAGS = ['Minimalist', 'Streetwear', 'Classic', 'Bohemian', 'Preppy', 'Edgy', 'Romantic', 'Sporty', 'Vintage', 'Avant-Garde', 'Smart Casual', 'Afrocentric']
const ITEM_CATEGORIES = ['top', 'bottom', 'dress', 'outerwear', 'shoes', 'bag', 'accessory', 'jewelry', 'hat', 'wig', 'other']
const CURRENCIES = ['NGN', 'USD', 'GBP', 'EUR']

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
  }
}

const one = (value: string | null | undefined) => (value ? [value] : [])

export function LookForm({ initialData }: LookFormProps) {
  const router = useRouter()
  const toast = useToast()
  const isEdit = !!initialData?.id
  const wasPublished = initialData?.is_published ?? false

  const [title, setTitle] = useState(initialData?.title ?? '')
  const [description, setDescription] = useState(initialData?.description ?? '')
  const [occasion, setOccasion] = useState<string[]>(one(initialData?.occasion))
  const [season, setSeason] = useState<string[]>(one(initialData?.season))
  const [genderTarget, setGenderTarget] = useState<string[]>(one(initialData?.gender_target))
  const [bodyShapes, setBodyShapes] = useState<string[]>(initialData?.body_shapes_suited ?? [])
  const [styleTags, setStyleTags] = useState<string[]>(initialData?.style_tags ?? [])
  const [isPremium, setIsPremium] = useState(initialData?.is_premium ?? false)
  const [primaryImageUrl, setPrimaryImageUrl] = useState(initialData?.primary_image_url ?? '')
  const [items, setItems] = useState<LookItem[]>(
    (initialData?.look_items ?? []).map((item) => ({ ...item, price: item.price == null ? '' : String(item.price) }))
  )
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [titleError, setTitleError] = useState('')

  const pickOne = (setter: (v: string[]) => void, current: string[]) => (val: string) =>
    setter(current.includes(val) ? [] : [val])
  const pickMany = (setter: (v: string[]) => void, current: string[]) => (val: string) =>
    setter(current.includes(val) ? current.filter((v) => v !== val) : [...current, val])

  function addItem() {
    setItems((prev) => [
      ...prev,
      { category: 'top', name: '', brand: '', color: '', image_url: '', purchase_url: '', price: '', currency: 'NGN', notes: '', sort_order: prev.length }
    ])
  }

  function updateItem(idx: number, field: keyof LookItem, value: string) {
    setItems((prev) => prev.map((item, i) => (i === idx ? { ...item, [field]: value } : item)))
  }

  async function save(publish: boolean) {
    if (!title.trim()) {
      setTitleError('Give the look a title.')
      document.getElementById('look-title')?.focus()
      return
    }
    if (items.some((item) => !item.name.trim())) {
      setError('Every item needs a name, or remove the empty ones.')
      return
    }
    setTitleError('')
    setError('')
    setSaving(true)

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
      // Strip commas and symbols so "1,500" saves as 1500.
      items: items.map((item, i) => ({ ...item, price: item.price.replace(/[^0-9.]/g, ''), sort_order: i }))
    }

    try {
      const res = await fetch(isEdit ? `/api/stylist/looks/${initialData.id}` : '/api/stylist/looks', {
        method: isEdit ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      })
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as { error?: string } | null
        setError(data?.error ?? "Couldn't save the look. Try again.")
        return
      }
      toast.success(publish ? (wasPublished ? 'Look saved.' : 'Look published.') : 'Saved as a draft.')
      router.push('/admin/looks')
      router.refresh()
    } catch {
      setError("Couldn't save the look. Check your connection and try again.")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div>
      <EditorHeader
        backHref="/admin/looks"
        backLabel="Back to looks"
        title={isEdit ? 'Edit look' : 'New look'}
        actions={
          wasPublished ? (
            <>
              <Button size="sm" variant="ghost" disabled={saving} onClick={() => void save(false)}>
                Move to drafts
              </Button>
              <Button size="sm" loading={saving} onClick={() => void save(true)}>
                Save changes
              </Button>
            </>
          ) : (
            <>
              <Button size="sm" variant="outline" disabled={saving} onClick={() => void save(false)}>
                Save draft
              </Button>
              <Button size="sm" loading={saving} onClick={() => void save(true)}>
                Publish
              </Button>
            </>
          )
        }
      />

      {error ? (
        <p className="mb-4 rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700" role="alert">
          {error}
        </p>
      ) : null}

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="space-y-5">
          <Panel title="Details">
            <div className="space-y-4">
              <Input
                id="look-title"
                label="Title"
                required
                value={title}
                error={titleError || undefined}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. The power blazer"
              />
              <Textarea
                label="Description"
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Styling notes or inspiration for clients"
              />
            </div>
          </Panel>

          <Panel title="Who it's for">
            <div className="space-y-5">
              <ChipPicker label="Occasion" options={LOOK_OCCASIONS} selected={occasion} onToggle={pickOne(setOccasion, occasion)} />
              <ChipPicker label="Season" options={LOOK_SEASONS} selected={season} onToggle={pickOne(setSeason, season)} />
              <ChipPicker
                label="Gender"
                hint="Leave empty if it suits everyone."
                options={GENDERS}
                selected={genderTarget}
                onToggle={pickOne(setGenderTarget, genderTarget)}
              />
              <ChipPicker label="Body shapes it suits" options={BODY_SHAPES} selected={bodyShapes} onToggle={pickMany(setBodyShapes, bodyShapes)} />
              <ChipPicker
                label="Style"
                options={STYLE_TAGS}
                selected={styleTags}
                onToggle={pickMany(setStyleTags, styleTags)}
                format={(v) => v}
              />
            </div>
          </Panel>

          <Panel
            title="Items in this look"
            actions={
              <Button size="sm" variant="outline" onClick={addItem}>
                Add item
              </Button>
            }
          >
            {!items.length ? (
              <p className="rounded-xl border border-dashed border-atelier-border px-4 py-8 text-center text-sm text-atelier-muted">
                Add the pieces that make up this look, so clients can shop them.
              </p>
            ) : (
              <ul className="space-y-3">
                {items.map((item, idx) => (
                  <ItemCard key={item.id ?? idx} index={idx} onRemove={() => setItems((prev) => prev.filter((_, i) => i !== idx))}>
                    <Input label="Name" required value={item.name} onChange={(e) => updateItem(idx, 'name', e.target.value)} placeholder="e.g. Linen blazer" />
                    <Select
                      label="Type"
                      value={item.category}
                      onChange={(e) => updateItem(idx, 'category', e.target.value)}
                      options={ITEM_CATEGORIES.map((c) => ({ value: c, label: stylistLabel(c) }))}
                    />
                    <Input label="Brand" value={item.brand} onChange={(e) => updateItem(idx, 'brand', e.target.value)} />
                    <Input label="Colour" value={item.color} onChange={(e) => updateItem(idx, 'color', e.target.value)} placeholder="e.g. Navy" />
                    <Input label="Price" inputMode="decimal" value={item.price} onChange={(e) => updateItem(idx, 'price', e.target.value)} />
                    <Select
                      label="Currency"
                      value={item.currency}
                      onChange={(e) => updateItem(idx, 'currency', e.target.value)}
                      options={CURRENCIES.map((c) => ({ value: c, label: c }))}
                    />
                    <div className="sm:col-span-2">
                      <Input label="Shop link" type="url" value={item.purchase_url} onChange={(e) => updateItem(idx, 'purchase_url', e.target.value)} placeholder="https://" />
                    </div>
                    <div className="sm:col-span-2">
                      <Input label="Photo link" type="url" value={item.image_url} onChange={(e) => updateItem(idx, 'image_url', e.target.value)} placeholder="https://" />
                    </div>
                  </ItemCard>
                ))}
              </ul>
            )}
          </Panel>
        </div>

        <div className="space-y-5">
          <Panel>
            <ImageField label="Cover photo" value={primaryImageUrl} onChange={setPrimaryImageUrl} onError={setError} />
          </Panel>
          <Panel>
            <SwitchRow label="Premium members only" checked={isPremium} onChange={setIsPremium} />
          </Panel>
        </div>
      </div>
    </div>
  )
}
